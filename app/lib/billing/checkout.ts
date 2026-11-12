import "server-only";

import Stripe from "stripe";
import { CheckoutConflictError, createCheckoutStore } from "./checkoutStore";

export function getCheckoutConfig() {
  const environment = process.env.STRIPE_ENVIRONMENT;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_ID;
  const appUrl = process.env.APP_URL;
  if (environment !== "test" ||
      !/^sk_test_[A-Za-z0-9_]+$/.test(secretKey ?? "") || !/^price_[A-Za-z0-9]+$/.test(priceId ?? "") || !appUrl) {
    throw new Error("Invalid checkout configuration.");
  }
  const url = new URL(appUrl);
  if (url.protocol !== "https:" || url.origin !== appUrl) throw new Error("Invalid checkout return origin.");
  return { environment: "test" as const, secretKey: secretKey!, priceId: priceId!, appUrl };
}

/** Server-only: uid must come from verifyFirebaseIdToken, never from request JSON. */
export async function createSubscriptionCheckout(uid: string): Promise<string> {
  const config = getCheckoutConfig();
  const live = false;
  const stripe = new Stripe(config.secretKey, { maxNetworkRetries: 2, timeout: 10_000 });
  // Price IDs have no test/live prefix: retrieve using the configured account key.
  const price = await stripe.prices.retrieve(config.priceId);
  if (price.id !== config.priceId || price.livemode !== live || !price.active ||
      price.type !== "recurring" || !price.recurring || price.recurring.usage_type !== "licensed" || price.custom_unit_amount) {
    throw new Error("Invalid subscription price.");
  }
  const store = createCheckoutStore(config.environment);
  const { account, order } = await store.reserve(uid, config.priceId, config.appUrl);
  const metadata = { firebaseUid: uid, orderId: order.orderId, environment: config.environment };
  let customerId = account.customerId;
  if (!customerId) {
    // Stripe may discard idempotency keys after 24h. Never recreate an unknown
    // customer after that window; reconcile it manually instead of duplicating it.
    if (Date.now() - account.createdAt.toMillis() >= 20 * 60 * 60 * 1000) throw new CheckoutConflictError();
    const customer = await stripe.customers.create({
      metadata: { firebaseUid: uid, environment: config.environment, operationId: account.customerOperationId },
    }, { idempotencyKey: `customer-${config.environment}-${account.customerOperationId}` });
    if (customer.livemode !== live || customer.metadata.firebaseUid !== uid || customer.metadata.environment !== config.environment) {
      throw new CheckoutConflictError();
    }
    customerId = customer.id;
  } else {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted || customer.livemode !== live ||
        (customer.metadata.firebaseUid && customer.metadata.firebaseUid !== uid) ||
        (customer.metadata.environment && customer.metadata.environment !== config.environment)) throw new CheckoutConflictError();
  }
  // Commit ownership and the reverse customer mapping before opening checkout.
  await store.attachCustomer(uid, order.orderId, customerId);

  let session: Stripe.Checkout.Session;
  if (order.sessionId) {
    session = await stripe.checkout.sessions.retrieve(order.sessionId, { expand: ["line_items"] });
  } else {
    // Frozen expiry keeps retried Stripe parameters identical and bounds retries
    // well below key retention. Unknown expired attempts require reconciliation.
    if (order.expiresAt.toMillis() - Date.now() <= 31 * 60 * 1000) throw new CheckoutConflictError();
    session = await stripe.checkout.sessions.create({
      mode: "subscription", customer: customerId, line_items: [{ price: account.priceId, quantity: 1 }],
      client_reference_id: order.orderId, metadata, subscription_data: { metadata },
      success_url: `${account.appUrl}/?checkout=success`, cancel_url: `${account.appUrl}/?checkout=canceled`,
      expires_at: Math.floor(order.expiresAt.toMillis() / 1000), expand: ["line_items"],
    }, { idempotencyKey: `checkout-${config.environment}-${order.orderId}` });
  }
  const sessionCustomer = typeof session.customer === "string" ? session.customer : session.customer?.id;
  if ((order.sessionId !== null && session.id !== order.sessionId) || session.livemode !== live || session.mode !== "subscription" || sessionCustomer !== customerId ||
      session.client_reference_id !== order.orderId || session.metadata?.firebaseUid !== uid ||
      session.metadata?.orderId !== order.orderId || session.metadata?.environment !== config.environment ||
      session.line_items?.has_more || session.line_items?.data.length !== 1 ||
      session.line_items.data[0].price?.id !== account.priceId || session.line_items.data[0].quantity !== 1) {
    throw new CheckoutConflictError();
  }
  await store.attachSession(uid, order.orderId, customerId, session.id);
  if (session.status === "expired") {
    await store.expire(uid, order.orderId, session.id);
    throw new CheckoutConflictError(); // Next request may reserve a new order.
  }
  if (session.status !== "open" || session.payment_status === "paid" || !session.url || session.expires_at * 1000 <= Date.now()) {
    throw new CheckoutConflictError();
  }
  const checkoutUrl = new URL(session.url);
  if (checkoutUrl.origin !== "https://checkout.stripe.com" || checkoutUrl.username || checkoutUrl.password) {
    throw new CheckoutConflictError();
  }
  return session.url;
}
