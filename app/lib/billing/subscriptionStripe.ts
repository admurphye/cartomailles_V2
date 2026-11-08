import "server-only";
import { Timestamp } from "firebase-admin/firestore";
import type Stripe from "stripe";
import type { BillingReview, BillingReviewCode, StoredRecord, StripeEnvironment, SubscriptionStatus } from "../firestore/types";
import { CARTOMAILLES_SUBSCRIPTION_POLICY, requireSync, type PaidPeriod, type SubscriptionPolicy, type SubscriptionSnapshot } from "./subscriptionPolicy";

export function stripeObjectId(value: unknown): string | null {
  return typeof value === "string" ? value : value && typeof value === "object" && "id" in value && typeof value.id === "string" ? value.id : null;
}
export async function collectStripePages<T>(source: AsyncIterable<T>, max = 1000): Promise<T[]> {
  const result: T[] = [];
  for await (const item of source) { requireSync(result.length < max, "LIMIT_EXCEEDED"); result.push(item); }
  return result;
}
function milliseconds(seconds: number): number {
  requireSync(Number.isSafeInteger(seconds) && seconds >= 0 && Number.isSafeInteger(seconds * 1000));
  return seconds * 1000;
}

export function createSubscriptionStripe(stripe: Stripe, environment: StripeEnvironment, priceId: string) {
  const live = environment === "live";
  const mode = (object: { livemode: boolean }) => requireSync(object.livemode === live, "ASSOCIATION_CONFLICT");
  async function confirmedInvoice(invoice: Stripe.Invoice, customerId: string, reviewCodes: BillingReviewCode[]): Promise<"confirmed" | "fully_refunded" | BillingReviewCode> {
    // A paid flag alone can result from credits, a zero invoice or an out-of-band
    // marking. Only fully covered, independently confirmed Stripe cash payments
    // are supported automatically; other settlement policies require a decision.
    if (invoice.total <= 0) return "ZERO_INVOICE";
    if (invoice.amount_paid < invoice.total || invoice.amount_remaining !== 0) return "PAYMENT_UNCONFIRMED";
    const payments = await collectStripePages(stripe.invoicePayments.list({ invoice: invoice.id, status: "paid", limit: 100 }));
    let confirmed = 0;
    const seen = new Set<string>();
    const allocations = new Map<string, number>();
    const capturedAmounts = new Map<string, number>();
    let refundedPayments = 0;
    for (const payment of payments) {
      mode(payment);
      requireSync(stripeObjectId(payment.invoice) === invoice.id && payment.currency === invoice.currency && !seen.has(payment.id));
      seen.add(payment.id);
      if (payment.status !== "paid" || !payment.amount_paid || payment.amount_paid <= 0) continue;
      let chargeId: string | null = null;
      let paymentIntentId: string | null = null;
      if (payment.payment.type === "payment_intent") {
        const intentId = stripeObjectId(payment.payment.payment_intent);
        requireSync(intentId);
        paymentIntentId = intentId;
        const intent = await stripe.paymentIntents.retrieve(intentId);
        mode(intent);
        requireSync(stripeObjectId(intent.customer) === customerId && intent.currency === invoice.currency);
        if (intent.status !== "succeeded" || intent.amount_received < payment.amount_paid) continue;
        chargeId = stripeObjectId(intent.latest_charge);
      } else if (payment.payment.type === "charge") chargeId = stripeObjectId(payment.payment.charge);
      else return "OUT_OF_BAND";
      requireSync(chargeId);
      const charge = await stripe.charges.retrieve(chargeId);
      mode(charge);
      requireSync(stripeObjectId(charge.customer) === customerId && charge.currency === invoice.currency);
      requireSync(stripeObjectId(charge.payment_intent) === paymentIntentId, "ASSOCIATION_CONFLICT");
      if (!charge.paid || !charge.captured || charge.status !== "succeeded" || charge.amount_captured < payment.amount_paid) continue;
      const allocated = (allocations.get(charge.id) ?? 0) + payment.amount_paid;
      requireSync(Number.isSafeInteger(allocated) && allocated <= charge.amount_captured);
      allocations.set(charge.id, allocated);
      capturedAmounts.set(charge.id, charge.amount_captured);
      const refunds = await collectStripePages(stripe.refunds.list({ charge: charge.id, limit: 100 }));
      // Refunds have no livemode field in this SDK: their charge is verified
      // above and the list is scoped to that charge using the environment key.
      const refundIds = new Set<string>();
      for (const refund of refunds) {
        requireSync(stripeObjectId(refund.charge) === charge.id && !refundIds.has(refund.id)); refundIds.add(refund.id);
      }
      // Historical disputes remain subject to explicit policy, including a later
      // resolution: no invented automatic reinstatement or commercial refund rule.
      if (charge.disputed) reviewCodes.push("DISPUTE");
      if (refunds.some((r) => r.status === "pending" || r.status === "requires_action")) return "REFUND_PENDING";
      const successful = refunds.filter((r) => r.status === "succeeded");
      const refunded = successful.reduce((total, refund) => total + refund.amount, 0);
      if (successful.some((r) => r.currency !== charge.currency || !Number.isSafeInteger(r.amount) || r.amount <= 0) ||
          refunds.some((r) => !["succeeded", "failed", "canceled", "pending", "requires_action"].includes(r.status ?? "")) ||
          !Number.isSafeInteger(refunded) || refunded !== charge.amount_refunded) return "REFUND_AMBIGUOUS";
      if (refunded > 0 || charge.refunded) {
        if (refunded !== charge.amount_captured || !charge.refunded) return "PARTIAL_REFUND";
        refundedPayments += payment.amount_paid;
      }
      confirmed += payment.amount_paid;
      requireSync(Number.isSafeInteger(confirmed));
    }
    if (confirmed < invoice.amount_paid || confirmed <= 0) return "PAYMENT_UNCONFIRMED";
    if (refundedPayments > 0) {
      // A shared charge does not identify which invoice/period was refunded.
      if (refundedPayments !== invoice.amount_paid) return "PARTIAL_REFUND";
      if ([...allocations].some(([id, allocated]) => allocated !== capturedAmounts.get(id))) return "REFUND_AMBIGUOUS";
      return "fully_refunded";
    }
    if (invoice.pre_payment_credit_notes_amount > 0 || invoice.post_payment_credit_notes_amount > 0) return "CREDIT_NOTE";
    if (reviewCodes.includes("DISPUTE")) return "DISPUTE";
    return "confirmed";
  }
  return {
    async event(id: string) {
      const event = await stripe.events.retrieve(id);
      mode(event); requireSync(event.id === id && !event.account, "ASSOCIATION_CONFLICT");
      return event;
    },
    async eventCustomer(event: Stripe.Event): Promise<{ customerId: string; subscriptionId: string | null } | null> {
      const id = stripeObjectId(event.data.object); requireSync(id);
      let customer: string | null;
      let subscriptionId: string | null = null;
      if (["checkout.session.completed", "checkout.session.async_payment_succeeded", "checkout.session.async_payment_failed", "checkout.session.expired"].includes(event.type)) {
        const session = await stripe.checkout.sessions.retrieve(id); mode(session); customer = stripeObjectId(session.customer); subscriptionId = stripeObjectId(session.subscription);
      } else if (["invoice.paid", "invoice.payment_failed", "invoice.payment_action_required", "invoice.voided", "invoice.marked_uncollectible", "invoice.finalization_failed"].includes(event.type)) {
        const invoice = await stripe.invoices.retrieve(id); mode(invoice); customer = stripeObjectId(invoice.customer); subscriptionId = stripeObjectId(invoice.parent?.subscription_details?.subscription);
      } else if (["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted", "customer.subscription.paused", "customer.subscription.resumed"].includes(event.type)) {
        const sub = await stripe.subscriptions.retrieve(id); mode(sub); customer = stripeObjectId(sub.customer); subscriptionId = sub.id;
      } else if (event.type === "charge.refunded") {
        const charge = await stripe.charges.retrieve(id); mode(charge); customer = stripeObjectId(charge.customer);
      } else if (["charge.dispute.created", "charge.dispute.updated", "charge.dispute.closed", "charge.dispute.funds_withdrawn", "charge.dispute.funds_reinstated"].includes(event.type)) {
        const dispute = await stripe.disputes.retrieve(id); mode(dispute);
        const chargeId = stripeObjectId(dispute.charge); requireSync(chargeId);
        const charge = await stripe.charges.retrieve(chargeId); mode(charge); customer = stripeObjectId(charge.customer);
      } else if (["refund.created", "refund.updated", "refund.failed"].includes(event.type)) {
        const refund = await stripe.refunds.retrieve(id);
        const chargeId = stripeObjectId(refund.charge); requireSync(chargeId);
        const charge = await stripe.charges.retrieve(chargeId); mode(charge); customer = stripeObjectId(charge.customer);
      } else return null;
      requireSync(customer, "ASSOCIATION_CONFLICT");
      return { customerId: customer, subscriptionId };
    },
    async subscriptionIds(customerId: string, uid: string) {
      const customer = await stripe.customers.retrieve(customerId);
      requireSync(!customer.deleted, "ASSOCIATION_CONFLICT"); mode(customer);
      requireSync((!customer.metadata.firebaseUid || customer.metadata.firebaseUid === uid) &&
        (!customer.metadata.environment || customer.metadata.environment === environment), "ASSOCIATION_CONFLICT");
      const list = await collectStripePages(stripe.subscriptions.list({ customer: customerId, status: "all", limit: 100 }), 50);
      for (const sub of list) { mode(sub); requireSync(stripeObjectId(sub.customer) === customerId, "ASSOCIATION_CONFLICT"); }
      return list.filter((sub) => sub.items.data.some((item) => item.price.id === priceId) || sub.metadata.orderId).map((s) => s.id);
    },
    async subscription(id: string) {
      const sub = await stripe.subscriptions.retrieve(id);
      mode(sub); requireSync(sub.id === id);
      return sub;
    },
    async snapshot(sub: Stripe.Subscription, uid: string, order: StoredRecord<"checkoutOrders">, policy: SubscriptionPolicy = CARTOMAILLES_SUBSCRIPTION_POLICY, previousInvoiceIds: string[] = []): Promise<SubscriptionSnapshot> {
      const customerId = stripeObjectId(sub.customer);
      mode(sub);
      requireSync(customerId && order.uid === uid && order.customerId === customerId && order.sessionId &&
        (order.subscriptionId === null || order.subscriptionId === sub.id) && sub.metadata.firebaseUid === uid &&
        sub.metadata.environment === environment && sub.metadata.orderId === order.orderId, "ASSOCIATION_CONFLICT");
      requireSync(!sub.items.has_more && sub.items.data.length === 1);
      const item = sub.items.data[0];
      mode(item.price);
      requireSync(item.price.id === priceId && item.quantity === 1 && item.price.type === "recurring" && item.price.recurring?.usage_type === "licensed", "ASSOCIATION_CONFLICT");
      const session = await stripe.checkout.sessions.retrieve(order.sessionId, { expand: ["line_items"] });
      mode(session);
      requireSync(session.id === order.sessionId && session.mode === "subscription" && session.status === "complete" &&
        stripeObjectId(session.customer) === customerId && stripeObjectId(session.subscription) === sub.id && session.client_reference_id === order.orderId &&
        session.metadata?.firebaseUid === uid && session.metadata?.environment === environment && session.metadata?.orderId === order.orderId &&
        !session.line_items?.has_more && session.line_items?.data.length === 1 && session.line_items.data[0].price?.id === priceId &&
        session.line_items.data[0].quantity === 1, "ASSOCIATION_CONFLICT");
      const invoices = await collectStripePages(stripe.invoices.list({ subscription: sub.id, status: "paid", limit: 100 }));
      const periods: PaidPeriod[] = [];
      const evidence: (PaidPeriod & { invoiceId: string })[] = [];
      const reviews: BillingReview[] = [];
      const refundedInvoices: string[] = [];
      let paidAt: Timestamp | null = null;
      const invoiceIds = new Set(invoices.map((invoice) => invoice.id));
      requireSync(invoiceIds.size === invoices.length);
      for (const id of previousInvoiceIds) invoiceIds.add(id);
      requireSync(invoiceIds.size <= 1000, "LIMIT_EXCEEDED");
      for (const invoiceId of invoiceIds) {
        const invoice = await stripe.invoices.retrieve(invoiceId);
        mode(invoice);
        requireSync(invoice.id === invoiceId);
        requireSync(stripeObjectId(invoice.customer) === customerId && invoice.parent?.type === "subscription_details" &&
          stripeObjectId(invoice.parent.subscription_details?.subscription) === sub.id, "ASSOCIATION_CONFLICT");
        if (invoice.status !== "paid") { reviews.push({ invoiceId: invoice.id, code: "PAYMENT_UNCONFIRMED" }); continue; }
        const reviewCodes: BillingReviewCode[] = [];
        const confirmation = await confirmedInvoice(invoice, customerId, reviewCodes);
        if (confirmation !== "confirmed" && confirmation !== "fully_refunded") reviewCodes.push(confirmation);
        reviews.push(...[...new Set(reviewCodes)].map((code) => ({ invoiceId: invoice.id, code })));
        if (confirmation === "fully_refunded") { refundedInvoices.push(invoice.id); continue; }
        if (confirmation !== "confirmed") continue;
        const lines = await collectStripePages(stripe.invoices.listLineItems(invoice.id, { limit: 100 }));
        const invoicePeriods: PaidPeriod[] = [];
        let unsupportedPeriod = false;
        for (const line of lines) {
          mode(line); requireSync(line.invoice === invoice.id);
          const parent = line.parent?.subscription_item_details;
          if (parent?.subscription === sub.id && parent.proration) unsupportedPeriod = true;
          if (line.parent?.type !== "subscription_item_details" || !parent || parent.subscription !== sub.id ||
              parent.subscription_item !== item.id || stripeObjectId(line.pricing?.price_details?.price) !== priceId) continue;
          if (parent.proration || line.amount <= 0) { unsupportedPeriod = true; continue; }
          requireSync(line.currency === invoice.currency && line.quantity === 1);
          const start = milliseconds(line.period.start); const end = milliseconds(line.period.end);
          requireSync(start < end); invoicePeriods.push({ start, end });
        }
        if (unsupportedPeriod) { reviews.push({ invoiceId: invoice.id, code: "PRORATION" }); continue; }
        if ((sub.pause_collection !== null || sub.status === "paused") && policy.pausedCollection === "manual_review") {
          reviews.push({ invoiceId: invoice.id, code: "PAUSED_COLLECTION" }); continue;
        }
        periods.push(...invoicePeriods);
        evidence.push(...invoicePeriods.map((period) => ({ ...period, invoiceId: invoice.id })));
        if (invoicePeriods.length) {
          requireSync(invoice.status_transitions.paid_at !== null);
          const date = Timestamp.fromMillis(milliseconds(invoice.status_transitions.paid_at));
          if (!paidAt || date.toMillis() < paidAt.toMillis()) paidAt = date;
        }
      }
      const latest = await stripe.subscriptions.retrieve(sub.id); mode(latest);
      // Detect a subscription transition while fetching its payment history.
      const fingerprint = (s: Stripe.Subscription) => JSON.stringify([s.status, s.customer, s.metadata, s.items, s.cancel_at_period_end, s.canceled_at, s.pause_collection, s.latest_invoice]);
      requireSync(fingerprint(latest) === fingerprint(sub), "STALE_SYNC");
      const statuses: SubscriptionStatus[] = ["incomplete", "incomplete_expired", "trialing", "active", "past_due", "canceled", "unpaid", "paused"];
      requireSync(statuses.includes(sub.status as SubscriptionStatus));
      return {
        orderId: order.orderId, sessionId: order.sessionId, orderUpdatedAt: order.updatedAt, periods, paidAt, evidence, reviews, refundedInvoices,
        pausedCollection: sub.pause_collection !== null || sub.status === "paused",
        record: { uid, customerId, subscriptionId: sub.id, priceId, status: sub.status as SubscriptionStatus,
          currentPeriodStart: Timestamp.fromMillis(milliseconds(item.current_period_start)), currentPeriodEnd: Timestamp.fromMillis(milliseconds(item.current_period_end)),
          paidThrough: periods.length ? Timestamp.fromMillis(Math.max(...periods.map((p) => p.end))) : null,
          cancelAtPeriodEnd: sub.cancel_at_period_end, canceledAt: sub.canceled_at === null ? null : Timestamp.fromMillis(milliseconds(sub.canceled_at)),
          latestInvoiceId: stripeObjectId(sub.latest_invoice) },
      };
    },
  };
}
