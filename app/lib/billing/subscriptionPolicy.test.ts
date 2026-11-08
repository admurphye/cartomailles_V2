import { Timestamp } from "firebase-admin/firestore";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { CARTOMAILLES_SUBSCRIPTION_POLICY, deriveSubscriptionEntitlement, validateSubscriptionPolicy, type SubscriptionPolicy, type SubscriptionSnapshot } from "./subscriptionPolicy";

// Test choices only, not a proposed production commercial policy.
const policy: SubscriptionPolicy = { pastDue: "paid_coverage", unpaid: "suspend", canceled: "revoke", pausedCollection: "suspend", refunds: "manual_review", disputes: "manual_review", nonCashInvoices: "exclude_invoice" };
function snapshot(start = 10_000, end = 20_000, status: SubscriptionSnapshot["record"]["status"] = "active", subscriptionId = "sub_one"): SubscriptionSnapshot {
  return { orderId: "order1", sessionId: "cs_one", orderUpdatedAt: Timestamp.fromMillis(1), paidAt: Timestamp.fromMillis(10_000), pausedCollection: false,
    periods: [{ start, end }], record: { uid: "uid1", customerId: "cus_one", subscriptionId, priceId: "price_example", status,
      currentPeriodStart: Timestamp.fromMillis(start), currentPeriodEnd: Timestamp.fromMillis(end), paidThrough: Timestamp.fromMillis(end), cancelAtPeriodEnd: false, canceledAt: null, latestInvoiceId: "in_one" } };
}
describe("paid coverage entitlement calculation", () => {
  it.each([9_999, 20_000, 21_000])("denies outside coverage at %s", (now) => {
    expect(deriveSubscriptionEntitlement("uid1", [snapshot()], policy, now).status).toBe("inactive");
  });
  it.each([10_000, 15_000, 19_999])("grants only within confirmed coverage at %s", (now) => {
    const result = deriveSubscriptionEntitlement("uid1", [snapshot()], policy, now);
    expect(result.status).toBe("active"); expect(result.validUntil?.toMillis()).toBe(20_000);
  });
  it("does not grant on an active subscription without paid periods", () => {
    expect(deriveSubscriptionEntitlement("uid1", [{ ...snapshot(), periods: [] }], policy, 15_000).status).toBe("inactive");
  });
  it("joins paid renewals but never fills an unpaid gap", () => {
    const first = snapshot(); first.periods.push({ start: 20_000, end: 30_000 }, { start: 40_000, end: 50_000 });
    expect(deriveSubscriptionEntitlement("uid1", [first], policy, 25_000).validUntil?.toMillis()).toBe(30_000);
    expect(deriveSubscriptionEntitlement("uid1", [first], policy, 35_000).status).toBe("inactive");
    expect(deriveSubscriptionEntitlement("uid1", [first], policy, 45_000).validFrom?.toMillis()).toBe(40_000);
  });
  it("keeps a second paid subscription when the first is canceled", () => {
    const result = deriveSubscriptionEntitlement("uid1", [snapshot(10_000, 20_000, "canceled"), snapshot(12_000, 30_000, "active", "sub_two")], policy, 15_000);
    expect(result.status).toBe("active"); expect(result.subscriptionId).toBe("sub_two"); expect(result.validUntil?.toMillis()).toBe(30_000);
  });
  it("merges overlapping coverage from multiple subscriptions without summing durations", () => {
    const result = deriveSubscriptionEntitlement("uid1", [snapshot(), snapshot(15_000, 25_000, "active", "sub_two")], policy, 16_000);
    expect(result.validFrom?.toMillis()).toBe(10_000); expect(result.validUntil?.toMillis()).toBe(25_000);
  });
  it("preserves only already-paid coverage during payment failures when explicitly selected", () => {
    expect(deriveSubscriptionEntitlement("uid1", [snapshot(10_000, 20_000, "past_due")], policy, 15_000).status).toBe("active");
    expect(deriveSubscriptionEntitlement("uid1", [snapshot(10_000, 20_000, "past_due")], { ...policy, pastDue: "suspend" }, 15_000).status).toBe("inactive");
    expect(deriveSubscriptionEntitlement("uid1", [snapshot(10_000, 20_000, "past_due")], policy, 20_000).status).toBe("inactive");
  });
  it("distinguishes scheduled cancellation from immediate cancellation policy", () => {
    const scheduled = snapshot(); scheduled.record.cancelAtPeriodEnd = true;
    expect(deriveSubscriptionEntitlement("uid1", [scheduled], policy, 15_000).status).toBe("active");
    scheduled.record.status = "canceled";
    expect(deriveSubscriptionEntitlement("uid1", [scheduled], policy, 15_000).status).toBe("inactive");
    expect(deriveSubscriptionEntitlement("uid1", [scheduled], { ...policy, canceled: "paid_coverage" }, 15_000).status).toBe("active");
  });
  it.each(["incomplete", "incomplete_expired", "paused", "trialing", "unpaid"] as const)("does not grant for %s under test policy", (status) => {
    expect(deriveSubscriptionEntitlement("uid1", [snapshot(10_000, 20_000, status)], policy, 15_000).status).toBe("inactive");
  });
  it("requires an explicit policy for paused collection", () => {
    const paused = { ...snapshot(), pausedCollection: true };
    expect(deriveSubscriptionEntitlement("uid1", [paused], policy, 15_000).status).toBe("inactive");
    expect(deriveSubscriptionEntitlement("uid1", [paused], { ...policy, pausedCollection: "paid_coverage" }, 15_000).status).toBe("active");
  });
  it("rejects foreign ownership, reversed periods and missing policy choices", () => {
    expect(() => deriveSubscriptionEntitlement("other", [snapshot()], policy, 15_000)).toThrow();
    const invalid = snapshot(); invalid.periods = [{ start: 20_000, end: 10_000 }];
    expect(() => deriveSubscriptionEntitlement("uid1", [invalid], policy, 15_000)).toThrow();
    expect(() => validateSubscriptionPolicy({} as SubscriptionPolicy)).toThrow();
  });
  it.each(["past_due", "unpaid", "canceled"] as const)("approved policy preserves only already-paid coverage for %s", (status) => {
    expect(deriveSubscriptionEntitlement("uid1", [snapshot(10_000, 20_000, status)], CARTOMAILLES_SUBSCRIPTION_POLICY, 15_000).status).toBe("active");
    expect(deriveSubscriptionEntitlement("uid1", [snapshot(10_000, 20_000, status)], CARTOMAILLES_SUBSCRIPTION_POLICY, 20_000).status).toBe("inactive");
  });
});
