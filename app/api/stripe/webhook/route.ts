import Stripe from "stripe";
import { synchronizeStripeSubscriptionEvent } from "../../../lib/billing/subscriptionSync";

export const runtime = "nodejs";
export const maxDuration = 60;
const headers = { "Cache-Control": "private, no-store" };
// Matches the events understood by the existing subscription gateway. An event
// is only a trigger: payment evidence is retrieved and verified by that service.
const supportedEvents = new Set<string>([
  "checkout.session.completed", "checkout.session.async_payment_succeeded", "checkout.session.async_payment_failed", "checkout.session.expired",
  "invoice.paid", "invoice.payment_failed", "invoice.payment_action_required", "invoice.voided", "invoice.marked_uncollectible", "invoice.finalization_failed",
  "customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted", "customer.subscription.paused", "customer.subscription.resumed",
  "charge.refunded", "refund.created", "refund.updated", "refund.failed",
  "charge.dispute.created", "charge.dispute.updated", "charge.dispute.closed", "charge.dispute.funds_withdrawn", "charge.dispute.funds_reinstated",
]);

export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (process.env.STRIPE_ENVIRONMENT !== "test" || !secretKey || !/^sk_test_[A-Za-z0-9_]+$/.test(secretKey) ||
      !webhookSecret || !/^whsec_[A-Za-z0-9_]+$/.test(webhookSecret)) {
    return Response.json({ error: "Test webhook not configured." }, { status: 503, headers });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return Response.json({ error: "Missing signature." }, { status: 400, headers });
  }

  const stripe = new Stripe(secretKey);
  let event: Stripe.Event;

  try {
    // Signature verification requires the original, unparsed request body.
    const body = await request.text();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return Response.json({ error: "Invalid webhook." }, { status: 400, headers });
  }

  // This endpoint is intentionally test-only and does not support Connect.
  if (!event || typeof event !== "object" || event.livemode !== false || event.account || !/^evt_[A-Za-z0-9_]+$/.test(event.id ?? "") || typeof event.type !== "string") {
    return Response.json({ error: "Unsupported event environment." }, { status: 400, headers });
  }
  if (!supportedEvents.has(event.type)) return Response.json({ received: true, status: "ignored" }, { headers });
  try {
    // Do not pass untrusted Checkout metadata or infer rights from the payload.
    // Await the service's durable commit/review handling before acknowledging.
    const result = await synchronizeStripeSubscriptionEvent(event.id);
    console.info({ event: "stripe_subscription_webhook", status: result.status });
    return Response.json({ received: true, status: result.status }, { headers });
  } catch {
    // Includes STALE_SYNC: a retry re-reads current Stripe state. Never acknowledge
    // a failed persistence/association check as a successful entitlement update.
    console.error({ event: "stripe_subscription_webhook", code: "SYNC_FAILED" });
    return Response.json({ error: "Subscription synchronization unavailable." }, { status: 503, headers });
  }
}
