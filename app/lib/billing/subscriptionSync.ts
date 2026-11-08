import "server-only";
import { randomUUID } from "node:crypto";
import Stripe from "stripe";
import { Timestamp } from "firebase-admin/firestore";
import { getCheckoutConfig } from "./checkout";
import { createSubscriptionStripe, stripeObjectId } from "./subscriptionStripe";
import { createSubscriptionSyncStore, type SyncTicket } from "./subscriptionSyncStore";
import { CARTOMAILLES_SUBSCRIPTION_POLICY, requireSync, SubscriptionSyncError, validateSubscriptionPolicy, type SubscriptionPolicy, type SubscriptionSnapshot } from "./subscriptionPolicy";
import type { BillingReview, StripeEventRecord } from "../firestore/types";

export type SubscriptionSyncResult = { status: "processed" | "duplicate" | "ignored" | "review_required"; diagnostics?: (BillingReview & { subscriptionId: string })[] };

function approvedPolicy(policy: SubscriptionPolicy) {
  validateSubscriptionPolicy(policy);
  requireSync((Object.keys(CARTOMAILLES_SUBSCRIPTION_POLICY) as (keyof SubscriptionPolicy)[]).every((key) => policy[key] === CARTOMAILLES_SUBSCRIPTION_POLICY[key]));
}

function dependencies(policy: SubscriptionPolicy) {
  validateSubscriptionPolicy(policy);
  const { secretKey, environment, priceId } = getCheckoutConfig();
  const stripe = new Stripe(secretKey, { maxNetworkRetries: 2, timeout: 10_000 });
  return { gateway: createSubscriptionStripe(stripe, environment, priceId), store: createSubscriptionSyncStore(environment) };
}
async function synchronize(customerId: string, event: StripeEventRecord, policy: SubscriptionPolicy, deps: ReturnType<typeof dependencies>, targetSubscriptionId: string | null = null): Promise<SubscriptionSyncResult> {
  const { gateway, store } = deps;
  let ticket: SyncTicket | null = null;
  try {
    ticket = await store.begin(event, customerId);
    if (!ticket) return { status: "duplicate" };
    const customerIds = await store.customerIds(ticket.uid);
    requireSync(customerIds.includes(customerId) && customerIds.length <= 20, "ASSOCIATION_CONFLICT");
    const known = await store.subscriptions(ticket.uid);
    const ids = new Set(known.map((s) => s.subscriptionId));
    for (const id of customerIds) for (const subId of await gateway.subscriptionIds(id, ticket.uid)) ids.add(subId);
    if (targetSubscriptionId) ids.add(targetSubscriptionId);
    // If the trigger subscription is missing from a briefly inconsistent list,
    // explicitly retrieve it; never mark that event processed with empty rights.
    if (event.type.startsWith("customer.subscription.")) ids.add(event.objectId);
    requireSync(ids.size <= 50, "LIMIT_EXCEEDED");
    const snapshots: SubscriptionSnapshot[] = [];
    for (const id of [...ids].sort()) {
      const sub = await gateway.subscription(id);
      requireSync(customerIds.includes(stripeObjectId(sub.customer) ?? ""), "ASSOCIATION_CONFLICT");
      requireSync(sub.metadata.firebaseUid === ticket.uid && sub.metadata.orderId, "ASSOCIATION_CONFLICT");
      const order = await store.read("checkoutOrders", sub.metadata.orderId);
      requireSync(order, "ASSOCIATION_CONFLICT");
      const coverage = await store.read("subscriptionCoverage", sub.id);
      snapshots.push(await gateway.snapshot(sub, ticket.uid, order, policy, coverage?.periods?.map((period) => period.invoiceId) ?? []));
    }
    await store.commit(ticket, customerIds, snapshots, policy);
    const diagnostics = snapshots.flatMap((snapshot) => (snapshot.reviews ?? []).map((review) => ({ ...review, subscriptionId: snapshot.record.subscriptionId })));
    return diagnostics.length ? { status: "review_required", diagnostics } : { status: "processed" };
  } catch (error) {
    const safe = error instanceof SubscriptionSyncError ? error : new SubscriptionSyncError("TECHNICAL_FAILURE");
    if (ticket) {
      try { await store.fail(ticket, safe.code); } catch { throw new SubscriptionSyncError("TECHNICAL_FAILURE"); }
    }
    if (safe.code === "REVIEW_REQUIRED") return { status: "review_required" };
    throw safe;
  }
}

/** Isolated business entry point. Retrieves the event itself from Stripe, so a
 * caller cannot supply forged event contents. Future webhook still needs signature
 * verification and correct retry/alert handling before invoking this service.
 */
export async function synchronizeStripeSubscriptionEvent(eventId: string, policy: SubscriptionPolicy = CARTOMAILLES_SUBSCRIPTION_POLICY): Promise<SubscriptionSyncResult> {
  try {
    requireSync(/^evt_[A-Za-z0-9_]+$/.test(eventId));
    approvedPolicy(policy);
    const deps = dependencies(policy);
    const event = await deps.gateway.event(eventId);
    const target = await deps.gateway.eventCustomer(event);
    if (!target) return { status: "ignored" };
    const objectId = stripeObjectId(event.data.object); requireSync(objectId);
    return await synchronize(target.customerId, { eventId: event.id, type: event.type, objectId,
      status: "pending", attempts: 0, occurredAt: Timestamp.fromMillis(event.created * 1000), processedAt: null, errorCode: null }, policy, deps, target.subscriptionId);
  } catch (error) {
    throw error instanceof SubscriptionSyncError ? error : new SubscriptionSyncError("TECHNICAL_FAILURE");
  }
}

/** For a future trusted scheduled job: re-evaluate expired/future coverage and
 * recover missed events. No route or scheduler is installed by this step. */
export async function reconcileStripeCustomerSubscriptions(customerId: string, policy: SubscriptionPolicy = CARTOMAILLES_SUBSCRIPTION_POLICY): Promise<SubscriptionSyncResult> {
  try {
    requireSync(/^cus_[A-Za-z0-9]+$/.test(customerId));
    approvedPolicy(policy);
    return await synchronize(customerId, { eventId: `reconcile-${randomUUID()}`, type: "billing.reconcile", objectId: customerId,
      status: "pending", attempts: 0, occurredAt: Timestamp.now(), processedAt: null, errorCode: null }, policy, dependencies(policy));
  } catch (error) {
    throw error instanceof SubscriptionSyncError ? error : new SubscriptionSyncError("TECHNICAL_FAILURE");
  }
}
