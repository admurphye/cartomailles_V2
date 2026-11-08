import "server-only";
import { createHash } from "node:crypto";
import { FieldValue, Timestamp, type DocumentReference, type Transaction } from "firebase-admin/firestore";
import { readStoredFirestoreRecord, validateFirestoreRecord } from "../firestore/store";
import type { ReviewEmailCode, ReviewNotificationRecord, ReviewNotificationStateRecord, StripeEnvironment } from "../firestore/types";

const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
export interface ReviewAlertInput {
  sourceType: "subscription" | "event";
  sourceId: string;
  details: { reference: string; code: ReviewEmailCode }[];
}

/** Read/plan first; invoke the returned closure only in the transaction's write
 * phase. This helper queues data only and has no email transport dependency. */
export async function planReviewAlerts(tx: Transaction, root: DocumentReference, environment: StripeEnvironment, inputs: ReviewAlertInput[]) {
  const plans: (() => void)[] = [];
  for (const input of inputs) {
    const caseId = hash([environment, input.sourceType, input.sourceId]);
    const stateRef = root.collection("reviewNotificationStates").doc(caseId);
    const stateDoc = await tx.get(stateRef);
    const previous = stateDoc.exists ? readStoredFirestoreRecord("reviewNotificationStates", caseId, environment, stateDoc.data()) : null;
    const details = [...new Set(input.details.map((d) => hash([d.reference, d.code])))].sort();
    const fingerprint = details.length ? hash(details) : null;
    if (previous?.fingerprint === fingerprint || (!previous && !fingerprint)) continue;
    if (previous && (previous.sourceId !== input.sourceId || previous.sourceType !== input.sourceType)) throw new Error("Review case conflict.");
    const newAnomaly = details.some((key) => !previous?.diagnosticKeys.includes(key));
    const revision = (previous?.revision ?? 0) + (newAnomaly ? 1 : 0);
    const state: ReviewNotificationStateRecord = { caseId, sourceType: input.sourceType, sourceId: input.sourceId, fingerprint, diagnosticKeys: details, revision };
    validateFirestoreRecord("reviewNotificationStates", caseId, state);
    const now = Timestamp.now();
    if (fingerprint && newAnomaly) {
      const notificationId = hash([caseId, revision, fingerprint]);
      const notificationRef = root.collection("reviewNotifications").doc(notificationId);
      const existing = await tx.get(notificationRef);
      if (existing.exists) throw new Error("Notification identity conflict.");
      const message: ReviewNotificationRecord = {
        notificationId, caseId, sourceType: input.sourceType, sourceId: input.sourceId,
        codes: [...new Set(input.details.map((d) => d.code))].sort(), detectedAt: now, templateVersion: "v1",
        status: "pending", attempts: 0, nextAttemptAt: now, leaseId: null, leaseUntil: null,
        firstAttemptAt: null, sender: null, providerId: null, retentionMs: null, sentAt: null, lastErrorCode: null,
      };
      validateFirestoreRecord("reviewNotifications", notificationId, message);
      plans.push(() => tx.set(notificationRef, { ...message, environment, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }));
    }
    plans.push(() => tx.set(stateRef, { ...state, environment, createdAt: previous?.createdAt ?? FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }));
  }
  return () => { for (const apply of plans) apply(); };
}
