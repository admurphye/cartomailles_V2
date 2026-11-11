import { randomUUID } from "node:crypto";
import Stripe from "stripe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ sync: vi.fn() }));
vi.mock("../../../lib/billing/subscriptionSync", () => ({ synchronizeStripeSubscriptionEvent: mocks.sync }));
import { POST } from "./route";

// Real local HMAC verification, mocked business service. No Stripe/Firestore I/O.
const secret = `whsec_${randomUUID().replaceAll("-", "")}`;
const stripe = new Stripe("sk_test_fake");
const payload = (patch = {}) => JSON.stringify({ id: "evt_example", type: "invoice.paid", livemode: false,
  data: { object: { id: "in_example", customer_email: "private@example.invalid" } }, ...patch });
function request(body: string, signature?: string) {
  return new Request("https://app.example.invalid/api/stripe/webhook", {
    method: "POST", body, headers: signature ? { "stripe-signature": signature } : {},
  });
}
function signedRequest(body = payload(), signingSecret = secret) {
  return request(body, stripe.webhooks.generateTestHeaderString({ payload: body, secret: signingSecret }));
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("STRIPE_ENVIRONMENT", "test"); vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fake");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", secret); vi.stubEnv("REVIEW_EMAIL_ENABLED", "false");
  mocks.sync.mockResolvedValue({ status: "processed" });
  vi.spyOn(console, "info").mockImplementation(() => {}); vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Unexpected external call"); }));
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("signed test-only subscription webhook", () => {
  it.each([
    ["STRIPE_ENVIRONMENT", ""], ["STRIPE_ENVIRONMENT", "live"],
    ["STRIPE_SECRET_KEY", ""], ["STRIPE_SECRET_KEY", "sk_live_fake"],
    ["STRIPE_WEBHOOK_SECRET", ""], ["STRIPE_WEBHOOK_SECRET", "invalid"],
  ])("fails closed for invalid configuration %s=%s", async (name, value) => {
    vi.stubEnv(name, value);
    expect((await POST(signedRequest())).status).toBe(503);
    expect(mocks.sync).not.toHaveBeenCalled();
  });
  it("rejects missing, incorrect, expired and tampered signatures", async () => {
    const body = payload();
    const signature = stripe.webhooks.generateTestHeaderString({ payload: body, secret });
    const oldSignature = stripe.webhooks.generateTestHeaderString({ payload: body, secret, timestamp: Math.floor(Date.now() / 1000) - 600 });
    for (const req of [request(body), signedRequest(body, "wrong"), request(body, oldSignature), request(body.replace("evt_example", "evt_changed"), signature)]) {
      expect((await POST(req)).status).toBe(400);
    }
    expect(mocks.sync).not.toHaveBeenCalled();
  });
  it.each([{ livemode: true }, { livemode: null }, { account: "acct_other" }, { id: "invalid" }, { type: null }])("rejects signed foreign or malformed events: %j", async (patch) => {
    expect((await POST(signedRequest(payload(patch)))).status).toBe(400);
    expect(mocks.sync).not.toHaveBeenCalled();
  });
  it("ignores unsupported signed events without service access", async () => {
    const response = await POST(signedRequest(payload({ type: "customer.created" })));
    expect(response.status).toBe(200); expect(await response.json()).toEqual({ received: true, status: "ignored" });
    expect(mocks.sync).not.toHaveBeenCalled();
  });
  it("rejects a correctly signed non-event JSON body without synchronization", async () => {
    for (const body of ["null", "{}", "[]"]) expect((await POST(signedRequest(body))).status).toBe(400);
    expect(mocks.sync).not.toHaveBeenCalled();
  });
  it.each([
    "checkout.session.completed", "checkout.session.async_payment_succeeded", "checkout.session.async_payment_failed", "checkout.session.expired",
    "invoice.paid", "invoice.payment_failed", "invoice.payment_action_required", "invoice.voided", "invoice.marked_uncollectible", "invoice.finalization_failed",
    "customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted", "customer.subscription.paused", "customer.subscription.resumed",
    "charge.refunded", "refund.created", "refund.updated", "refund.failed",
    "charge.dispute.created", "charge.dispute.updated", "charge.dispute.closed", "charge.dispute.funds_withdrawn", "charge.dispute.funds_reinstated",
  ])("delegates %s using only the verified event ID and default policy", async (type) => {
    const response = await POST(signedRequest(payload({ type })));
    expect(response.status).toBe(200);
    expect(mocks.sync).toHaveBeenCalledExactlyOnceWith("evt_example");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each(["processed", "duplicate", "ignored", "review_required"])("acknowledges durable result %s without exposing diagnostics", async (status) => {
    mocks.sync.mockResolvedValue({ status, diagnostics: [{ invoiceId: "in_private", subscriptionId: "sub_private" }] });
    const response = await POST(signedRequest());
    expect(await response.json()).toEqual({ received: true, status });
    expect(console.info).toHaveBeenCalledExactlyOnceWith({ event: "stripe_subscription_webhook", status });
  });
  it.each(["TECHNICAL_FAILURE", "STALE_SYNC", "ASSOCIATION_CONFLICT"])("returns retryable 503 for uncommitted %s", async (code) => {
    mocks.sync.mockRejectedValue(new Error(`${code}: private credential`));
    const response = await POST(signedRequest());
    expect(response.status).toBe(503); expect(await response.text()).not.toContain("private");
    expect(console.error).toHaveBeenCalledExactlyOnceWith({ event: "stripe_subscription_webhook", code: "SYNC_FAILED" });
  });
  it("awaits durable synchronization before acknowledgement", async () => {
    let finish!: (result: { status: string }) => void;
    mocks.sync.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    let acknowledged = false;
    const response = POST(signedRequest()).then((value) => { acknowledged = true; return value; });
    await vi.waitFor(() => expect(mocks.sync).toHaveBeenCalled());
    expect(acknowledged).toBe(false);
    finish({ status: "processed" }); expect((await response).status).toBe(200);
  });
  it("delegates overlapping deliveries to the transactional service", async () => {
    mocks.sync.mockResolvedValueOnce({ status: "processed" }).mockResolvedValueOnce({ status: "duplicate" });
    const responses = await Promise.all([POST(signedRequest()), POST(signedRequest())]);
    expect(responses.map((response) => response.status)).toEqual([200, 200]);
    expect(mocks.sync).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(vi.mocked(console.info).mock.calls)).not.toContain("private@example.invalid");
  });
});
