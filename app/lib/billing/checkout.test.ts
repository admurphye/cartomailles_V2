import { Timestamp } from "firebase-admin/firestore";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  price: vi.fn(), customerCreate: vi.fn(), customerRetrieve: vi.fn(), sessionCreate: vi.fn(), sessionRetrieve: vi.fn(),
  reserve: vi.fn(), attachCustomer: vi.fn(), attachSession: vi.fn(), expire: vi.fn(), store: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("stripe", () => ({ default: class {
  prices = { retrieve: mocks.price };
  customers = { create: mocks.customerCreate, retrieve: mocks.customerRetrieve };
  checkout = { sessions: { create: mocks.sessionCreate, retrieve: mocks.sessionRetrieve } };
} }));
vi.mock("./checkoutStore", async (original) => ({
  ...await original<typeof import("./checkoutStore")>(), createCheckoutStore: mocks.store,
}));
import { createSubscriptionCheckout, getCheckoutConfig } from "./checkout";

const now = 1_800_000_000_000;
const customer = () => ({ id: "cus_example", livemode: false, metadata: { firebaseUid: "uid1", environment: "test" } });
function reservation(customerId: string | null = null, sessionId: string | null = null) {
  return {
    account: { uid: "uid1", customerId, customerOperationId: "operation1", currentOrderId: "order1", priceId: "price_example", appUrl: "https://app.example.invalid", createdAt: Timestamp.fromMillis(now) },
    order: { orderId: "order1", uid: "uid1", customerId, sessionId, expiresAt: Timestamp.fromMillis(now + 7_200_000) },
  };
}
function session(overrides: Record<string, unknown> = {}) {
  return { id: "cs_example", livemode: false, mode: "subscription", customer: "cus_example",
    client_reference_id: "order1", metadata: { firebaseUid: "uid1", orderId: "order1", environment: "test" },
    status: "open", payment_status: "unpaid", url: "https://checkout.stripe.com/c/pay/example", expires_at: (now + 7_200_000) / 1000,
    line_items: { has_more: false, data: [{ price: { id: "price_example" }, quantity: 1 }] }, ...overrides };
}
beforeEach(() => {
  vi.resetAllMocks(); vi.useFakeTimers(); vi.setSystemTime(now);
  vi.stubEnv("STRIPE_ENVIRONMENT", "test"); vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fake");
  vi.stubEnv("STRIPE_PRICE_ID", "price_example"); vi.stubEnv("APP_URL", "https://app.example.invalid");
  mocks.price.mockResolvedValue({ id: "price_example", livemode: false, active: true, type: "recurring", recurring: { usage_type: "licensed" } });
  mocks.store.mockReturnValue({ reserve: mocks.reserve, attachCustomer: mocks.attachCustomer, attachSession: mocks.attachSession, expire: mocks.expire });
  mocks.reserve.mockResolvedValue(reservation());
  mocks.customerCreate.mockResolvedValue(customer()); mocks.customerRetrieve.mockResolvedValue(customer());
  mocks.sessionCreate.mockResolvedValue(session()); mocks.sessionRetrieve.mockResolvedValue(session());
});
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });

describe("secure subscription checkout", () => {
  it("persists ownership first and sends only server-selected parameters", async () => {
    expect(await createSubscriptionCheckout("uid1")).toBe("https://checkout.stripe.com/c/pay/example");
    expect(mocks.store).toHaveBeenCalledWith("test");
    expect(mocks.reserve).toHaveBeenCalledWith("uid1", "price_example", "https://app.example.invalid");
    expect(mocks.customerCreate).toHaveBeenCalledWith({ metadata: { firebaseUid: "uid1", environment: "test", operationId: "operation1" } }, { idempotencyKey: "customer-test-operation1" });
    expect(mocks.sessionCreate).toHaveBeenCalledWith(expect.objectContaining({
      mode: "subscription", customer: "cus_example", client_reference_id: "order1",
      line_items: [{ price: "price_example", quantity: 1 }],
      metadata: { firebaseUid: "uid1", environment: "test", orderId: "order1" },
      subscription_data: { metadata: { firebaseUid: "uid1", environment: "test", orderId: "order1" } },
      success_url: "https://app.example.invalid/?checkout=success", cancel_url: "https://app.example.invalid/?checkout=canceled",
    }), { idempotencyKey: "checkout-test-order1" });
    expect(mocks.reserve.mock.invocationCallOrder[0]).toBeLessThan(mocks.customerCreate.mock.invocationCallOrder[0]);
    expect(mocks.attachCustomer.mock.invocationCallOrder[0]).toBeLessThan(mocks.sessionCreate.mock.invocationCallOrder[0]);
    expect(mocks.attachSession).toHaveBeenCalledWith("uid1", "order1", "cus_example", "cs_example");
  });
  it.each([
    ["STRIPE_ENVIRONMENT", ""], ["STRIPE_ENVIRONMENT", "production"], ["STRIPE_SECRET_KEY", "sk_live_fake"],
    ["STRIPE_SECRET_KEY", "pk_test_fake"], ["STRIPE_SECRET_KEY", ""], ["STRIPE_PRICE_ID", ""],
    ["APP_URL", "http://app.example.invalid"], ["APP_URL", "https://app.example.invalid/path"],
  ])("refuses invalid configuration %s", async (name, value) => {
    vi.stubEnv(name, value);
    await expect(createSubscriptionCheckout("uid1")).rejects.toThrow();
    expect(mocks.price).not.toHaveBeenCalled(); expect(mocks.reserve).not.toHaveBeenCalled();
  });
  it("supports explicit live configuration", () => {
    vi.stubEnv("STRIPE_ENVIRONMENT", "live"); vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_fake");
    expect(getCheckoutConfig().environment).toBe("live");
  });
  it("creates in live only when the key, price, customer and session all agree", async () => {
    vi.stubEnv("STRIPE_ENVIRONMENT", "live"); vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_fake");
    mocks.price.mockResolvedValue({ id: "price_example", livemode: true, active: true, type: "recurring", recurring: { usage_type: "licensed" } });
    mocks.customerCreate.mockResolvedValue({ ...customer(), livemode: true, metadata: { firebaseUid: "uid1", environment: "live" } });
    mocks.sessionCreate.mockResolvedValue(session({ livemode: true, metadata: { firebaseUid: "uid1", orderId: "order1", environment: "live" } }));
    await expect(createSubscriptionCheckout("uid1")).resolves.toContain("https://checkout.stripe.com/");
    expect(mocks.store).toHaveBeenCalledWith("live");
  });
  it.each([
    { livemode: true }, { active: false }, { type: "one_time" }, { recurring: null },
    { recurring: { usage_type: "metered" } }, { custom_unit_amount: {} }, { id: "price_other" },
  ])("refuses a wrong-environment or unsuitable price: %j", async (overrides) => {
    mocks.price.mockResolvedValue({ id: "price_example", livemode: false, active: true, type: "recurring", recurring: { usage_type: "licensed" }, ...overrides });
    await expect(createSubscriptionCheckout("uid1")).rejects.toThrow();
    expect(mocks.reserve).not.toHaveBeenCalled(); expect(mocks.customerCreate).not.toHaveBeenCalled();
  });
  it("reuses persisted customer and checkout without creating duplicates", async () => {
    mocks.reserve.mockResolvedValue(reservation("cus_example", "cs_example"));
    await createSubscriptionCheckout("uid1");
    expect(mocks.customerRetrieve).toHaveBeenCalledWith("cus_example");
    expect(mocks.customerCreate).not.toHaveBeenCalled(); expect(mocks.sessionCreate).not.toHaveBeenCalled();
    expect(mocks.sessionRetrieve).toHaveBeenCalledWith("cs_example", { expand: ["line_items"] });
  });
  it.each([{ deleted: true }, { livemode: true }, { metadata: { firebaseUid: "other" } }, { metadata: { environment: "live" } }])("refuses a foreign or deleted customer: %j", async (overrides) => {
    mocks.reserve.mockResolvedValue(reservation("cus_example"));
    mocks.customerRetrieve.mockResolvedValue({ ...customer(), ...overrides });
    await expect(createSubscriptionCheckout("uid1")).rejects.toThrow(); expect(mocks.sessionCreate).not.toHaveBeenCalled();
  });
  it.each([
    { livemode: true }, { customer: "cus_other" }, { mode: "payment" }, { client_reference_id: "other" },
    { metadata: { firebaseUid: "other" } }, { line_items: { has_more: false, data: [] } },
    { url: "https://evil.example.invalid/pay" }, { status: "complete", payment_status: "paid" },
  ])("never returns an unsafe or completed session: %j", async (overrides) => {
    mocks.sessionCreate.mockResolvedValue(session(overrides));
    await expect(createSubscriptionCheckout("uid1")).rejects.toThrow();
  });
  it("reuses the same Stripe key and frozen parameters after a lost session response", async () => {
    mocks.sessionCreate.mockRejectedValueOnce(new Error("timeout"));
    await expect(createSubscriptionCheckout("uid1")).rejects.toThrow();
    await createSubscriptionCheckout("uid1");
    expect(mocks.sessionCreate.mock.calls[0]).toEqual(mocks.sessionCreate.mock.calls[1]);
    expect(mocks.customerCreate.mock.calls[0]).toEqual(mocks.customerCreate.mock.calls[1]);
  });
  it("retries the same customer operation after a failed ownership commit", async () => {
    mocks.attachCustomer.mockRejectedValueOnce(new Error("Firestore unavailable"));
    await expect(createSubscriptionCheckout("uid1")).rejects.toThrow();
    expect(mocks.sessionCreate).not.toHaveBeenCalled();
    await createSubscriptionCheckout("uid1");
    expect(mocks.customerCreate.mock.calls[0]).toEqual(mocks.customerCreate.mock.calls[1]);
  });
  it("retries a lost customer response using the same durable key", async () => {
    mocks.customerCreate.mockRejectedValueOnce(new Error("timeout after customer creation"));
    await expect(createSubscriptionCheckout("uid1")).rejects.toThrow();
    expect(mocks.sessionCreate).not.toHaveBeenCalled();
    await createSubscriptionCheckout("uid1");
    expect(mocks.customerCreate.mock.calls[0]).toEqual(mocks.customerCreate.mock.calls[1]);
  });
  it("makes no Stripe creation if the reservation cannot be committed", async () => {
    mocks.reserve.mockRejectedValue(new Error("Firestore unavailable"));
    await expect(createSubscriptionCheckout("uid1")).rejects.toThrow();
    expect(mocks.customerCreate).not.toHaveBeenCalled(); expect(mocks.sessionCreate).not.toHaveBeenCalled();
  });
  it("does not assume a positive tariff for an authorized price", async () => {
    mocks.sessionCreate.mockResolvedValue(session({ payment_status: "no_payment_required" }));
    await expect(createSubscriptionCheckout("uid1")).resolves.toContain("https://checkout.stripe.com/");
  });
  it("does not return the URL until session persistence succeeds", async () => {
    mocks.attachSession.mockRejectedValueOnce(new Error("Firestore unavailable"));
    await expect(createSubscriptionCheckout("uid1")).rejects.toThrow();
    await createSubscriptionCheckout("uid1");
    expect(mocks.sessionCreate.mock.calls[0]).toEqual(mocks.sessionCreate.mock.calls[1]);
  });
  it("blocks unknown old customer creation rather than reusing a pruned Stripe key", async () => {
    const data = reservation(); data.account.createdAt = Timestamp.fromMillis(now - 24 * 3_600_000);
    mocks.reserve.mockResolvedValue(data);
    await expect(createSubscriptionCheckout("uid1")).rejects.toThrow(); expect(mocks.customerCreate).not.toHaveBeenCalled();
  });
  it("blocks old unknown session creation", async () => {
    const data = reservation("cus_example"); data.order.expiresAt = Timestamp.fromMillis(now + 60_000);
    mocks.reserve.mockResolvedValue(data);
    await expect(createSubscriptionCheckout("uid1")).rejects.toThrow(); expect(mocks.sessionCreate).not.toHaveBeenCalled();
  });
  it("retires only a session confirmed expired by Stripe", async () => {
    mocks.reserve.mockResolvedValue(reservation("cus_example", "cs_example"));
    mocks.sessionRetrieve.mockResolvedValue(session({ status: "expired", url: null }));
    await expect(createSubscriptionCheckout("uid1")).rejects.toThrow();
    expect(mocks.expire).toHaveBeenCalledWith("uid1", "order1", "cs_example");
  });
  it("does not mutate anything if price retrieval fails", async () => {
    mocks.price.mockRejectedValue(new Error("Stripe unavailable"));
    await expect(createSubscriptionCheckout("uid1")).rejects.toThrow(); expect(mocks.store).not.toHaveBeenCalled();
  });
});
