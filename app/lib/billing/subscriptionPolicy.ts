import "server-only";
import { Timestamp } from "firebase-admin/firestore";
import type { BillingReview, EntitlementRecord, SubscriptionRecord } from "../firestore/types";

/** Policy vocabulary; production entry points enforce the approved constant below. */
export interface SubscriptionPolicy {
  pastDue: "paid_coverage" | "suspend";
  unpaid: "paid_coverage" | "suspend";
  canceled: "paid_coverage" | "revoke";
  pausedCollection: "paid_coverage" | "suspend" | "manual_review";
  refunds: "exclude_invoice" | "manual_review" | "confirmed_full_refunds";
  disputes: "exclude_invoice" | "manual_review";
  nonCashInvoices: "exclude_invoice" | "manual_review";
}

/** Approved commercial rules. Paused collection remains ambiguous: freeze it for review. */
export const CARTOMAILLES_SUBSCRIPTION_POLICY: Readonly<SubscriptionPolicy> = Object.freeze({
  pastDue: "paid_coverage", unpaid: "paid_coverage", canceled: "paid_coverage",
  pausedCollection: "manual_review", refunds: "confirmed_full_refunds", disputes: "manual_review", nonCashInvoices: "manual_review",
});
export class SubscriptionSyncError extends Error {
  constructor(public readonly code: "ASSOCIATION_CONFLICT" | "INVALID_STRIPE_DATA" | "STALE_SYNC" | "REVIEW_REQUIRED" | "LIMIT_EXCEEDED" | "TECHNICAL_FAILURE") {
    super(`Subscription synchronization refused: ${code}`);
  }
}
export function requireSync(condition: unknown, code: SubscriptionSyncError["code"] = "INVALID_STRIPE_DATA"): asserts condition {
  if (!condition) throw new SubscriptionSyncError(code);
}
export function validateSubscriptionPolicy(policy: SubscriptionPolicy) {
  requireSync(policy &&
    ["paid_coverage", "suspend"].includes(policy.pastDue) &&
    ["paid_coverage", "suspend"].includes(policy.unpaid) &&
    ["paid_coverage", "revoke"].includes(policy.canceled) &&
    ["paid_coverage", "suspend", "manual_review"].includes(policy.pausedCollection) &&
    ["exclude_invoice", "manual_review", "confirmed_full_refunds"].includes(policy.refunds) &&
    ["exclude_invoice", "manual_review"].includes(policy.disputes) &&
    ["exclude_invoice", "manual_review"].includes(policy.nonCashInvoices));
}
export interface PaidPeriod { start: number; end: number }
export interface SubscriptionSnapshot {
  record: SubscriptionRecord;
  orderId: string;
  sessionId: string;
  orderUpdatedAt: Timestamp;
  paidAt: Timestamp | null;
  periods: PaidPeriod[];
  pausedCollection: boolean;
  evidence?: (PaidPeriod & { invoiceId: string })[];
  reviews?: BillingReview[];
  refundedInvoices?: string[];
}

/** Union only connected paid intervals. Never bridge an unpaid gap. */
export function deriveSubscriptionEntitlement(uid: string, snapshots: SubscriptionSnapshot[], policy: SubscriptionPolicy, now: number): EntitlementRecord {
  validateSubscriptionPolicy(policy);
  const intervals = snapshots.flatMap((snapshot) => {
    const { record } = snapshot;
    requireSync(record.uid === uid, "ASSOCIATION_CONFLICT");
    const eligible = (record.status === "active" ||
      (record.status === "past_due" && policy.pastDue === "paid_coverage") ||
      (record.status === "unpaid" && policy.unpaid === "paid_coverage") ||
      (record.status === "canceled" && policy.canceled === "paid_coverage") ||
      (record.status === "paused" && policy.pausedCollection === "manual_review")) &&
      (!snapshot.pausedCollection || policy.pausedCollection === "paid_coverage" || policy.pausedCollection === "manual_review");
    return snapshot.periods.map((period) => {
      requireSync(Number.isSafeInteger(period.start) && Number.isSafeInteger(period.end) && period.start >= 0 && period.start < period.end);
      return { ...period, subscriptionId: record.subscriptionId, eligible };
    }).filter((period) => period.eligible);
  }).sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: { start: number; end: number; subscriptionId: string }[] = [];
  for (const period of intervals) {
    const last = merged.at(-1);
    if (last && period.start <= last.end) {
      if (period.end > last.end) { last.end = period.end; last.subscriptionId = period.subscriptionId; }
    } else merged.push({ ...period });
  }
  const current = merged.find((period) => period.start <= now && now < period.end);
  return current
    ? { uid, product: "cartomailles", status: "active", validFrom: Timestamp.fromMillis(current.start), validUntil: Timestamp.fromMillis(current.end), subscriptionId: current.subscriptionId }
    : { uid, product: "cartomailles", status: "inactive", validFrom: null, validUntil: null, subscriptionId: null };
}
