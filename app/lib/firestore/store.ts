import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getFirebaseAdminFirestore } from "../firebaseAdmin";
import type { CollectionName, FirestoreRecords, StoredRecord, StripeEnvironment } from "./types";

type Validator = (value: unknown) => boolean;
const text: Validator = (v) => typeof v === "string" && v.trim().length > 0 && v.length <= 512;
const id: Validator = (v) => text(v) && !/[\/\x00-\x1f]/.test(v as string) && v !== "." && v !== "..";
const date: Validator = (v) => v instanceof Timestamp;
const nullable = (check: Validator): Validator => (v) => v === null || check(v);
const oneOf = (...values: string[]): Validator => (v) => typeof v === "string" && values.includes(v);
const fields: { [K in CollectionName]: { [P in keyof FirestoreRecords[K]]: Validator } } = {
  users: { uid: id, email: nullable(text), activationStatus: oneOf("pending", "ready") },
  stripeCustomers: { uid: nullable(id), customerId: id },
  subscriptions: {
    uid: id, customerId: id, subscriptionId: id, priceId: id,
    status: oneOf("incomplete", "incomplete_expired", "trialing", "active", "past_due", "canceled", "unpaid", "paused"),
    currentPeriodStart: date, currentPeriodEnd: date, paidThrough: nullable(date),
    cancelAtPeriodEnd: (v) => typeof v === "boolean", canceledAt: nullable(date), latestInvoiceId: nullable(id),
  },
  entitlements: {
    uid: id, product: oneOf("cartomailles"), status: oneOf("inactive", "active", "suspended"),
    validFrom: nullable(date), validUntil: nullable(date), subscriptionId: nullable(id),
  },
  stripeEvents: {
    eventId: id, type: text, objectId: id, status: oneOf("pending", "processing", "processed", "failed"),
    attempts: (v) => typeof v === "number" && Number.isSafeInteger(v) && v >= 0,
    occurredAt: date, processedAt: nullable(date), errorCode: nullable(text),
  },
  checkoutOrders: {
    orderId: id, uid: nullable(id), sessionId: nullable(id), customerId: nullable(id), subscriptionId: nullable(id),
    status: oneOf("pending", "paid", "claimed", "expired", "failed"), expiresAt: date, paidAt: nullable(date),
  },
};
const identity: Record<CollectionName, string> = {
  users: "uid", stripeCustomers: "customerId", subscriptions: "subscriptionId",
  entitlements: "uid", stripeEvents: "eventId", checkoutOrders: "orderId",
};

function validate(collection: CollectionName, documentId: string, data: unknown): asserts data is Record<string, unknown> {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Invalid Firestore record.");
  const values = data as Record<string, unknown>;
  const schema = fields[collection];
  if (Object.keys(values).length !== Object.keys(schema).length ||
      !Object.entries(schema).every(([key, check]) => Object.hasOwn(values, key) && check(values[key])) ||
      values[identity[collection]] !== documentId) {
    throw new Error("Invalid Firestore record fields or identity.");
  }
  if (collection === "subscriptions" &&
      (values.currentPeriodStart as Timestamp).toMillis() >= (values.currentPeriodEnd as Timestamp).toMillis()) {
    throw new Error("Invalid subscription period.");
  }
  if (collection === "entitlements") {
    const start = values.validFrom as Timestamp | null;
    const end = values.validUntil as Timestamp | null;
    if ((start === null) !== (end === null) || (start && end && start.toMillis() >= end.toMillis()) ||
        (values.status === "active" && (!start || !end || !values.subscriptionId))) {
      throw new Error("Invalid entitlement validity.");
    }
  }
}

function readStored<K extends CollectionName>(collection: K, documentId: string, environment: StripeEnvironment, raw: unknown): StoredRecord<K> {
  if (!raw || typeof raw !== "object") throw new Error("Invalid stored Firestore record.");
  const { environment: storedEnvironment, createdAt, updatedAt, ...data } = raw as Record<string, unknown>;
  if (storedEnvironment !== environment || !date(createdAt) || !date(updatedAt)) throw new Error("Invalid Firestore metadata.");
  validate(collection, documentId, data);
  return raw as StoredRecord<K>;
}

/** Trusted server jobs only. Never expose directly as a Server Action or accept browser-selected UIDs. */
export function createServerFirestoreStore(environment: StripeEnvironment) {
  if (environment !== "test" && environment !== "live") throw new Error("Explicit Stripe environment required.");

  function reference(collection: CollectionName, documentId: string) {
    if (!Object.hasOwn(fields, collection) || !id(documentId)) throw new Error("Invalid Firestore document path.");
    return getFirebaseAdminFirestore().collection("stripeEnvironments").doc(environment).collection(collection).doc(documentId);
  }

  return {
    async read<K extends CollectionName>(collection: K, documentId: string): Promise<StoredRecord<K> | null> {
      const snapshot = await reference(collection, documentId).get();
      return snapshot.exists ? readStored(collection, documentId, environment, snapshot.data()) : null;
    },

    /** Create-only: existing IDs fail rather than overwrite ownership or duplicate an event. */
    async create<K extends CollectionName>(collection: K, documentId: string, data: FirestoreRecords[K]): Promise<void> {
      const ref = reference(collection, documentId);
      validate(collection, documentId, data);
      if (collection === "entitlements" && "status" in data && data.status === "active") throw new Error("Paid access activation is not implemented.");
      await ref.create({ ...data, environment, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    },

    /** Full replacement with optimistic concurrency; callers must first read the record. */
    async replace<K extends CollectionName>(collection: K, documentId: string, data: FirestoreRecords[K], expectedUpdatedAt: Timestamp): Promise<void> {
      const ref = reference(collection, documentId);
      validate(collection, documentId, data);
      if (!date(expectedUpdatedAt)) throw new Error("Expected update timestamp required.");
      if (collection === "entitlements" && "status" in data && data.status === "active") throw new Error("Paid access activation is not implemented.");
      await getFirebaseAdminFirestore().runTransaction(async (transaction) => {
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists) throw new Error("Firestore record not found.");
        const previous = readStored(collection, documentId, environment, snapshot.data());
        if (!previous.updatedAt.isEqual(expectedUpdatedAt)) throw new Error("Firestore record changed; read it again.");
        if ("uid" in previous && previous.uid !== null && (!("uid" in data) || previous.uid !== data.uid)) throw new Error("Firestore ownership cannot be reassigned.");
        transaction.set(ref, { ...data, environment, createdAt: previous.createdAt, updatedAt: FieldValue.serverTimestamp() });
      });
    },
  };
}
