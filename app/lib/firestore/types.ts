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

export interface FirestoreRecords {
  users: UserRecord;
  stripeCustomers: StripeCustomerRecord;
  subscriptions: SubscriptionRecord;
  entitlements: EntitlementRecord;
  stripeEvents: StripeEventRecord;
  checkoutOrders: CheckoutOrderRecord;
}

export type CollectionName = keyof FirestoreRecords;
export type StoredRecord<K extends CollectionName> = FirestoreRecords[K] & {
  environment: StripeEnvironment;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};
