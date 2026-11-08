import { Timestamp } from "firebase-admin/firestore";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  config: vi.fn(), event: vi.fn(), eventCustomer: vi.fn(), subscriptionIds: vi.fn(), subscription: vi.fn(), snapshot: vi.fn(),
  begin: vi.fn(), customerIds: vi.fn(), subscriptions: vi.fn(), read: vi.fn(), commit: vi.fn(), fail: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("stripe", () => ({ default: class {} }));
vi.mock("./checkout", () => ({ getCheckoutConfig: mocks.config }));
vi.mock("./subscriptionStripe", async (original) => ({
  ...await original<typeof import("./subscriptionStripe")>(), createSubscriptionStripe: () => ({ event: mocks.event, eventCustomer: mocks.eventCustomer, subscriptionIds: mocks.subscriptionIds, subscription: mocks.subscription, snapshot: mocks.snapshot }),
}));
vi.mock("./subscriptionSyncStore", () => ({ createSubscriptionSyncStore: () => ({ begin: mocks.begin, customerIds: mocks.customerIds, subscriptions: mocks.subscriptions, read: mocks.read, commit: mocks.commit, fail: mocks.fail }) }));
import { reconcileStripeCustomerSubscriptions, synchronizeStripeSubscriptionEvent } from "./subscriptionSync";
import { CARTOMAILLES_SUBSCRIPTION_POLICY, SubscriptionSyncError, type SubscriptionPolicy } from "./subscriptionPolicy";
const policy = CARTOMAILLES_SUBSCRIPTION_POLICY;
const ticket = { uid: "uid1", generation: 1, eventId: "evt_one" };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.config.mockReturnValue({ secretKey: "sk_test_fake", environment: "test", priceId: "price_example" });
  mocks.event.mockResolvedValue({ id: "evt_one", type: "invoice.paid", created: 10, data: { object: { id: "in_one" } } });
  mocks.eventCustomer.mockResolvedValue({ customerId: "cus_one", subscriptionId: "sub_one" });
  mocks.begin.mockResolvedValue(ticket); mocks.customerIds.mockResolvedValue(["cus_one"]); mocks.subscriptions.mockResolvedValue([]);
  mocks.subscriptionIds.mockResolvedValue(["sub_one"]);
  mocks.subscription.mockResolvedValue({ id: "sub_one", customer: "cus_one", metadata: { firebaseUid: "uid1", orderId: "order1" } });
  mocks.read.mockResolvedValue({ uid: "uid1", orderId: "order1" }); mocks.snapshot.mockResolvedValue({ verified: true });
});
describe("isolated subscription synchronization orchestration", () => {
  it("retrieves the event and current Stripe state before a single atomic commit", async () => {
    expect(await synchronizeStripeSubscriptionEvent("evt_one", policy)).toEqual({ status: "processed" });
    expect(mocks.event).toHaveBeenCalledWith("evt_one");
    expect(mocks.begin).toHaveBeenCalledWith(expect.objectContaining({ eventId: "evt_one", occurredAt: Timestamp.fromMillis(10_000) }), "cus_one");
    expect(mocks.read).toHaveBeenCalledWith("checkoutOrders", "order1");
    expect(mocks.commit).toHaveBeenCalledWith(ticket, ["cus_one"], [{ verified: true }], policy);
  });
  it("skips processed duplicates without reapplying rights", async () => {
    mocks.begin.mockResolvedValue(null);
    expect(await synchronizeStripeSubscriptionEvent("evt_one", policy)).toEqual({ status: "duplicate" });
    expect(mocks.snapshot).not.toHaveBeenCalled(); expect(mocks.commit).not.toHaveBeenCalled();
  });
  it("ignores unsupported event types without writes", async () => {
    mocks.eventCustomer.mockResolvedValue(null);
    expect(await synchronizeStripeSubscriptionEvent("evt_one", policy)).toEqual({ status: "ignored" }); expect(mocks.begin).not.toHaveBeenCalled();
  });
  it("retrieves the triggering subscription even when listing has not caught up", async () => {
    mocks.subscriptionIds.mockResolvedValue([]);
    await synchronizeStripeSubscriptionEvent("evt_one", policy); expect(mocks.subscription).toHaveBeenCalledWith("sub_one");
  });
  it("includes known subscriptions and other customers for the same verified UID", async () => {
    mocks.customerIds.mockResolvedValue(["cus_one", "cus_two"]); mocks.subscriptions.mockResolvedValue([{ subscriptionId: "sub_known" }]);
    await synchronizeStripeSubscriptionEvent("evt_one", policy);
    expect(mocks.subscriptionIds).toHaveBeenCalledWith("cus_two", "uid1"); expect(mocks.subscription).toHaveBeenCalledWith("sub_known");
  });
  it("records review requirements without committing changed rights", async () => {
    mocks.snapshot.mockRejectedValue(new SubscriptionSyncError("REVIEW_REQUIRED"));
    expect(await synchronizeStripeSubscriptionEvent("evt_one", policy)).toEqual({ status: "review_required" });
    expect(mocks.fail).toHaveBeenCalledWith(ticket, "REVIEW_REQUIRED"); expect(mocks.commit).not.toHaveBeenCalled();
  });
  it("uses approved rules by default and commits unaffected rights even with a review", async () => {
    mocks.snapshot.mockResolvedValue({ record: { subscriptionId: "sub_one" }, reviews: [{ invoiceId: "in_one", code: "PARTIAL_REFUND" }] });
    expect(await synchronizeStripeSubscriptionEvent("evt_one")).toEqual({ status: "review_required", diagnostics: [{ subscriptionId: "sub_one", invoiceId: "in_one", code: "PARTIAL_REFUND" }] });
    expect(mocks.commit).toHaveBeenCalledWith(ticket, ["cus_one"], expect.any(Array), policy);
    expect(mocks.fail).not.toHaveBeenCalled();
  });
  it.each(["snapshot", "commit"] as const)("marks failures in %s as retryable without exposing details", async (stage) => {
    mocks[stage].mockRejectedValue(new Error("private credentials"));
    await expect(synchronizeStripeSubscriptionEvent("evt_one", policy)).rejects.toThrow("TECHNICAL_FAILURE");
    expect(mocks.fail).toHaveBeenCalledWith(ticket, "TECHNICAL_FAILURE");
  });
  it("rejects foreign UID/customer associations before committing", async () => {
    mocks.subscription.mockResolvedValue({ id: "sub_one", customer: "cus_other", metadata: { firebaseUid: "uid1", orderId: "order1" } });
    await expect(synchronizeStripeSubscriptionEvent("evt_one", policy)).rejects.toThrow("ASSOCIATION_CONFLICT"); expect(mocks.commit).not.toHaveBeenCalled();
  });
  it("requires all commercial policy choices before any network or database operation", async () => {
    await expect(synchronizeStripeSubscriptionEvent("evt_one", {} as SubscriptionPolicy)).rejects.toThrow();
    expect(mocks.config).not.toHaveBeenCalled(); expect(mocks.event).not.toHaveBeenCalled();
  });
  it("supports trusted reconciliation without a public route or a fabricated Stripe event", async () => {
    await reconcileStripeCustomerSubscriptions("cus_one", policy);
    expect(mocks.event).not.toHaveBeenCalled();
    expect(mocks.begin).toHaveBeenCalledWith(expect.objectContaining({ type: "billing.reconcile", eventId: expect.stringMatching(/^reconcile-/) }), "cus_one");
  });
});
