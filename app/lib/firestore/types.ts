import type { Timestamp } from "firebase-admin/firestore";

export type StripeEnvironment = "test" | "live";
export type SubscriptionStatus = "incomplete" | "incomplete_expired" | "trialing" | "active" | "past_due" | "canceled" | "unpaid" | "paused";

export interface UserRecord {
  uid: string;
  email: string | null;
  activationStatus: "pending" | "ready";
}

export interface StripeCustomerRecord {
  uid: string | null;
  customerId: string;
}

export interface SubscriptionRecord {
  uid: string;
  customerId: string;
  subscriptionId: string;
  priceId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Timestamp;
  currentPeriodEnd: Timestamp;
  paidThrough: Timestamp | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: Timestamp | null;
  latestInvoiceId: string | null;
}

export interface EntitlementRecord {
  uid: string;
  product: "cartomailles";
  status: "inactive" | "active" | "suspended";
  validFrom: Timestamp | null;
  validUntil: Timestamp | null;
  subscriptionId: string | null;
}

export interface StripeEventRecord {
  eventId: string;
  type: string;
  objectId: string;
  status: "pending" | "processing" | "processed" | "failed";
  attempts: number;
  occurredAt: Timestamp;
  processedAt: Timestamp | null;
  errorCode: string | null;
}

export interface CheckoutOrderRecord {
  orderId: string;
  uid: string | null;
  sessionId: string | null;
  customerId: string | null;
  subscriptionId: string | null;
  status: "pending" | "paid" | "claimed" | "expired" | "failed";
  expiresAt: Timestamp;
  paidAt: Timestamp | null;
}

/** One durable customer creation attempt and one current checkout per Firebase UID. */
export interface CheckoutAccountRecord {
  uid: string;
  customerId: string | null;
  customerOperationId: string;
  currentOrderId: string;
  priceId: string;
  appUrl: string;
}

export interface SubscriptionSyncStateRecord {
  uid: string;
  generation: number;
}

export const BILLING_REVIEW_CODES = ["PARTIAL_REFUND", "REFUND_PENDING", "REFUND_AMBIGUOUS", "DISPUTE", "ZERO_INVOICE", "CREDIT_NOTE", "PRORATION", "PAYMENT_UNCONFIRMED", "OUT_OF_BAND", "PAUSED_COLLECTION"] as const;
export type BillingReviewCode = typeof BILLING_REVIEW_CODES[number];
export interface BillingReview { invoiceId: string; code: BillingReviewCode }
export interface SubscriptionCoverageRecord {
  uid: string;
  customerId: string;
  subscriptionId: string;
  periods: { invoiceId: string; start: Timestamp; end: Timestamp }[];
  reviews: BillingReview[];
}

export type ReviewEmailCode = BillingReviewCode | "REVIEW_REQUIRED";
export interface ReviewNotificationStateRecord {
  caseId: string;
  sourceType: "subscription" | "event";
  sourceId: string;
  fingerprint: string | null;
  diagnosticKeys: string[];
  revision: number;
}
export interface ReviewNotificationRecord {
  notificationId: string;
  caseId: string;
  sourceType: "subscription" | "event";
  sourceId: string;
  codes: ReviewEmailCode[];
  detectedAt: Timestamp;
  templateVersion: "v1";
  status: "pending" | "processing" | "sent" | "blocked";
  attempts: number;
  nextAttemptAt: Timestamp;
  leaseId: string | null;
  leaseUntil: Timestamp | null;
  firstAttemptAt: Timestamp | null;
  sender: string | null;
  providerId: string | null;
  retentionMs: number | null;
  sentAt: Timestamp | null;
  providerMessageId?: string | null;
  lastErrorCode: "SEND_FAILED" | "ACK_FAILED" | "DELIVERY_UNCERTAIN" | "PROVIDER_CHANGED" | "IDEMPOTENCY_CONFLICT" | "PROVIDER_REJECTED" | "PROVIDER_CONFIGURATION" | "RATE_LIMIT" | "CONCURRENT_REQUEST" | null;
}

export interface FirestoreRecords {
  users: UserRecord;
  stripeCustomers: StripeCustomerRecord;
  subscriptions: SubscriptionRecord;
  entitlements: EntitlementRecord;
  stripeEvents: StripeEventRecord;
  checkoutOrders: CheckoutOrderRecord;
  checkoutAccounts: CheckoutAccountRecord;
  subscriptionSyncStates: SubscriptionSyncStateRecord;
  subscriptionCoverage: SubscriptionCoverageRecord;
  reviewNotificationStates: ReviewNotificationStateRecord;
  reviewNotifications: ReviewNotificationRecord;
}

export type CollectionName = keyof FirestoreRecords;
export type StoredRecord<K extends CollectionName> = FirestoreRecords[K] & {
  environment: StripeEnvironment;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};
