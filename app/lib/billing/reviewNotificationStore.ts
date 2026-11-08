import "server-only";
import { randomUUID } from "node:crypto";
import { FieldValue, Timestamp, type Transaction } from "firebase-admin/firestore";
import { getFirebaseAdminFirestore } from "../firebaseAdmin";
import { readStoredFirestoreRecord, validateFirestoreRecord } from "../firestore/store";
import type { ReviewNotificationRecord, StoredRecord, StripeEnvironment } from "../firestore/types";

export function createReviewNotificationStore(environment: StripeEnvironment) {
  if (environment !== "test" && environment !== "live") throw new Error("Invalid notification environment.");
  const db = getFirebaseAdminFirestore();
  const collection = db.collection("stripeEnvironments").doc(environment).collection("reviewNotifications");
  function ref(id: string) {
    if (!/^[a-f0-9]{64}$/.test(id)) throw new Error("Invalid notification identity.");
    return collection.doc(id);
  }
  function replace(tx: Transaction, previous: StoredRecord<"reviewNotifications">, patch: Partial<ReviewNotificationRecord>) {
    const { environment: _env, createdAt, updatedAt: _updated, ...data } = previous;
    void _env; void _updated;
    const next = { ...data, ...patch };
    validateFirestoreRecord("reviewNotifications", previous.notificationId, next);
    tx.set(ref(previous.notificationId), { ...next, environment, createdAt, updatedAt: FieldValue.serverTimestamp() });
    return next;
  }
  return {
    async ready(limit = 20) {
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new Error("Invalid notification batch size.");
      const now = Timestamp.now();
      const [pending, expired] = await Promise.all([
        collection.where("status", "==", "pending").where("nextAttemptAt", "<=", now).orderBy("nextAttemptAt").limit(limit).get(),
        collection.where("status", "==", "processing").where("leaseUntil", "<=", now).orderBy("leaseUntil").limit(limit).get(),
      ]);
      const ids = [...pending.docs, ...expired.docs].map((doc) => readStoredFirestoreRecord("reviewNotifications", doc.id, environment, doc.data()).notificationId);
      return [...new Set(ids)].slice(0, limit);
    },
    async claim(id: string, sender: string, providerId: string, retentionMs: number) {
      if (!/^[a-z0-9_-]{1,64}$/.test(providerId) || !Number.isSafeInteger(retentionMs) || retentionMs < 120_000) throw new Error("Provider idempotency contract required.");
      return db.runTransaction(async (tx) => {
        const doc = await tx.get(ref(id));
        if (!doc.exists) return null;
        const message = readStoredFirestoreRecord("reviewNotifications", id, environment, doc.data());
        const now = Date.now();
        if (message.status === "sent" || message.status === "blocked" ||
            (message.status === "pending" && message.nextAttemptAt.toMillis() > now) ||
            (message.status === "processing" && message.leaseUntil!.toMillis() > now)) return null;
        let blocked: ReviewNotificationRecord["lastErrorCode"] = null;
        if (message.providerId && message.providerId !== providerId) blocked = "PROVIDER_CHANGED";
        else if (message.firstAttemptAt && message.firstAttemptAt.toMillis() + Math.min(message.retentionMs!, retentionMs) - 60_000 <= now) blocked = "DELIVERY_UNCERTAIN";
        if (blocked) {
          replace(tx, message, { status: "blocked", leaseId: null, leaseUntil: null, lastErrorCode: blocked });
          return null;
        }
        const leaseId = randomUUID();
        const next = replace(tx, message, {
          status: "processing", attempts: message.attempts + 1, leaseId, leaseUntil: Timestamp.fromMillis(now + 60_000),
          firstAttemptAt: message.firstAttemptAt ?? Timestamp.fromMillis(now), sender: message.sender ?? sender,
          providerId: message.providerId ?? providerId, retentionMs: message.retentionMs ?? retentionMs,
        });
        return { message: next, leaseId };
      });
    },
    async sent(id: string, leaseId: string) {
      return db.runTransaction(async (tx) => {
        const doc = await tx.get(ref(id)); if (!doc.exists) return false;
        const message = readStoredFirestoreRecord("reviewNotifications", id, environment, doc.data());
        if (message.status !== "processing" || message.leaseId !== leaseId || message.leaseUntil!.toMillis() <= Date.now()) return false;
        replace(tx, message, { status: "sent", sentAt: Timestamp.now(), leaseId: null, leaseUntil: null, lastErrorCode: null });
        return true;
      });
    },
    async retry(id: string, leaseId: string, errorCode: "SEND_FAILED" | "ACK_FAILED") {
      await db.runTransaction(async (tx) => {
        const doc = await tx.get(ref(id)); if (!doc.exists) return;
        const message = readStoredFirestoreRecord("reviewNotifications", id, environment, doc.data());
        if (message.status !== "processing" || message.leaseId !== leaseId) return;
        const delay = Math.min(6 * 60 * 60 * 1000, 30_000 * 2 ** Math.min(message.attempts - 1, 10));
        replace(tx, message, { status: "pending", nextAttemptAt: Timestamp.fromMillis(Date.now() + delay), leaseId: null, leaseUntil: null, lastErrorCode: errorCode });
      });
    },
  };
}
