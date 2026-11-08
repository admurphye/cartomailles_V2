import "server-only";
import { FieldValue, Timestamp, type Transaction } from "firebase-admin/firestore";
import { getFirebaseAdminFirestore } from "../firebaseAdmin";
import { readStoredFirestoreRecord, validateFirestoreRecord } from "../firestore/store";
import type { CollectionName, FirestoreRecords, StoredRecord, StripeEnvironment, StripeEventRecord } from "../firestore/types";
import { deriveSubscriptionEntitlement, requireSync, type SubscriptionSnapshot, type SubscriptionPolicy } from "./subscriptionPolicy";
import { planReviewAlerts } from "./reviewNotifications";

export interface SyncTicket { uid: string; generation: number; eventId: string }

export function createSubscriptionSyncStore(environment: StripeEnvironment) {
  requireSync(environment === "test" || environment === "live");
  const db = getFirebaseAdminFirestore();
  const root = db.collection("stripeEnvironments").doc(environment);
  function ref(collection: CollectionName, id: string) {
    requireSync(typeof id === "string" && id.length > 0 && id.length <= 512 && !/[\/\x00-\x1f]/.test(id) && id !== "." && id !== "..");
    return root.collection(collection).doc(id);
  }
  async function read<K extends CollectionName>(collection: K, id: string) {
    const doc = await ref(collection, id).get();
    return doc.exists ? readStoredFirestoreRecord(collection, id, environment, doc.data()) : null;
  }
  function write<K extends CollectionName>(tx: Transaction, collection: K, id: string, data: FirestoreRecords[K], previous: StoredRecord<K> | null) {
    validateFirestoreRecord(collection, id, data);
    tx.set(ref(collection, id), { ...data, environment, createdAt: previous?.createdAt ?? FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
  }
  async function queryUid<K extends "stripeCustomers" | "subscriptions">(collection: K, uid: string, tx?: Transaction) {
    const query = root.collection(collection).where("uid", "==", uid).limit(101);
    const result = tx ? await tx.get(query) : await query.get();
    requireSync(result.docs.length <= 100, "LIMIT_EXCEEDED");
    return result.docs.map((doc) => readStoredFirestoreRecord(collection, doc.id, environment, doc.data()));
  }
  return {
    read,
    customerIds: async (uid: string) => (await queryUid("stripeCustomers", uid)).map((c) => c.customerId).sort(),
    subscriptions: (uid: string) => queryUid("subscriptions", uid),
    async begin(event: StripeEventRecord, customerId: string): Promise<SyncTicket | null> {
      return db.runTransaction(async (tx) => {
        const customerDoc = await tx.get(ref("stripeCustomers", customerId));
        requireSync(customerDoc.exists, "ASSOCIATION_CONFLICT");
        const customer = readStoredFirestoreRecord("stripeCustomers", customerId, environment, customerDoc.data());
        requireSync(customer.uid, "ASSOCIATION_CONFLICT");
        const eventDoc = await tx.get(ref("stripeEvents", event.eventId));
        const previous = eventDoc.exists ? readStoredFirestoreRecord("stripeEvents", event.eventId, environment, eventDoc.data()) : null;
        if (previous) {
          requireSync(previous.type === event.type && previous.objectId === event.objectId, "ASSOCIATION_CONFLICT");
          if (previous.status === "processed") return null;
        }
        const stateDoc = await tx.get(ref("subscriptionSyncStates", customer.uid));
        const state = stateDoc.exists ? readStoredFirestoreRecord("subscriptionSyncStates", customer.uid, environment, stateDoc.data()) : null;
        const generation = (state?.generation ?? 0) + 1;
        write(tx, "subscriptionSyncStates", customer.uid, { uid: customer.uid, generation }, state);
        write(tx, "stripeEvents", event.eventId, { ...event, status: "processing", attempts: (previous?.attempts ?? 0) + 1, processedAt: null, errorCode: null }, previous);
        return { uid: customer.uid, generation, eventId: event.eventId };
      });
    },
    async commit(ticket: SyncTicket, customerIds: string[], snapshots: SubscriptionSnapshot[], policy: SubscriptionPolicy) {
      return db.runTransaction(async (tx) => {
        const stateDoc = await tx.get(ref("subscriptionSyncStates", ticket.uid));
        requireSync(stateDoc.exists, "STALE_SYNC");
        const state = readStoredFirestoreRecord("subscriptionSyncStates", ticket.uid, environment, stateDoc.data());
        requireSync(state.generation === ticket.generation, "STALE_SYNC");
        const eventDoc = await tx.get(ref("stripeEvents", ticket.eventId));
        requireSync(eventDoc.exists, "STALE_SYNC");
        const event = readStoredFirestoreRecord("stripeEvents", ticket.eventId, environment, eventDoc.data());
        requireSync(event.status === "processing", "STALE_SYNC");
        const customers = await queryUid("stripeCustomers", ticket.uid, tx);
        requireSync(JSON.stringify(customers.map((c) => c.customerId).sort()) === JSON.stringify(customerIds), "STALE_SYNC");
        const previousSubs = await queryUid("subscriptions", ticket.uid, tx);
        requireSync(previousSubs.every((s) => snapshots.some((candidate) => candidate.record.subscriptionId === s.subscriptionId)), "STALE_SYNC");
        const entitlementDoc = await tx.get(ref("entitlements", ticket.uid));
        const previousEntitlement = entitlementDoc.exists ? readStoredFirestoreRecord("entitlements", ticket.uid, environment, entitlementDoc.data()) : null;
        const existing = [];
        requireSync(snapshots.length <= 50 && new Set(snapshots.map((s) => s.record.subscriptionId)).size === snapshots.length, "LIMIT_EXCEEDED");
        requireSync(new Set(snapshots.map((s) => s.orderId)).size === snapshots.length &&
          new Set(snapshots.map((s) => s.sessionId)).size === snapshots.length, "ASSOCIATION_CONFLICT");
        for (const snapshot of snapshots) {
          requireSync(snapshot.record.uid === ticket.uid && customerIds.includes(snapshot.record.customerId), "ASSOCIATION_CONFLICT");
          const subDoc = await tx.get(ref("subscriptions", snapshot.record.subscriptionId));
          const previous = subDoc.exists ? readStoredFirestoreRecord("subscriptions", snapshot.record.subscriptionId, environment, subDoc.data()) : null;
          if (previous) requireSync(previous.uid === ticket.uid && previous.customerId === snapshot.record.customerId, "ASSOCIATION_CONFLICT");
          const coverageDoc = await tx.get(ref("subscriptionCoverage", snapshot.record.subscriptionId));
          const coverage = coverageDoc.exists ? readStoredFirestoreRecord("subscriptionCoverage", snapshot.record.subscriptionId, environment, coverageDoc.data()) : null;
          if (coverage) requireSync(coverage.uid === ticket.uid && coverage.customerId === snapshot.record.customerId, "ASSOCIATION_CONFLICT");
          const orderDoc = await tx.get(ref("checkoutOrders", snapshot.orderId));
          requireSync(orderDoc.exists, "ASSOCIATION_CONFLICT");
          const order = readStoredFirestoreRecord("checkoutOrders", snapshot.orderId, environment, orderDoc.data());
          requireSync(order.updatedAt.isEqual(snapshot.orderUpdatedAt), "STALE_SYNC");
          requireSync(order.uid === ticket.uid && order.customerId === snapshot.record.customerId && order.sessionId === snapshot.sessionId &&
            (order.subscriptionId === null || order.subscriptionId === snapshot.record.subscriptionId) &&
            (order.status === "pending" || order.status === "paid" || order.status === "claimed"), "ASSOCIATION_CONFLICT");
          requireSync(Array.isArray(snapshot.evidence));
          requireSync(snapshot.evidence.length === snapshot.periods.length && snapshot.evidence.every((p, index) =>
            p.start === snapshot.periods[index].start && p.end === snapshot.periods[index].end));
          const reviewIds = new Set(snapshot.reviews?.map((r) => r.invoiceId) ?? []);
          const refundedIds = new Set(snapshot.refundedInvoices ?? []);
          requireSync(snapshot.evidence.every((p) => !reviewIds.has(p.invoiceId) && !refundedIds.has(p.invoiceId)));
          const retained = coverage?.periods.filter((p) => reviewIds.has(p.invoiceId) && !refundedIds.has(p.invoiceId)) ?? [];
          const periods = [...snapshot.evidence.map((p) => ({ invoiceId: p.invoiceId, start: Timestamp.fromMillis(p.start), end: Timestamp.fromMillis(p.end) })), ...retained];
          const uniquePeriods = [...new Map(periods.map((p) => [`${p.invoiceId}:${p.start.toMillis()}:${p.end.toMillis()}`, p])).values()];
          const computed = { ...snapshot, periods: uniquePeriods.map((p) => ({ start: p.start.toMillis(), end: p.end.toMillis() })),
            record: { ...snapshot.record, paidThrough: uniquePeriods.length ? Timestamp.fromMillis(Math.max(...uniquePeriods.map((p) => p.end.toMillis()))) : null } };
          existing.push({ snapshot: computed, previous, order, coverage, periods: uniquePeriods });
        }
        const queueAlerts = await planReviewAlerts(tx, root, environment, existing.map(({ snapshot }) => ({
          sourceType: "subscription", sourceId: snapshot.record.subscriptionId,
          details: (snapshot.reviews ?? []).map((review) => ({ reference: review.invoiceId, code: review.code })),
        })));
        // All reads precede writes. Time is sampled inside each transaction retry.
        const entitlement = deriveSubscriptionEntitlement(ticket.uid, existing.map((item) => item.snapshot), policy, Date.now());
        for (const { snapshot, previous, order, coverage, periods } of existing) {
          write(tx, "subscriptions", snapshot.record.subscriptionId, snapshot.record, previous);
          write(tx, "subscriptionCoverage", snapshot.record.subscriptionId, { uid: ticket.uid, customerId: snapshot.record.customerId,
            subscriptionId: snapshot.record.subscriptionId, periods, reviews: snapshot.reviews ?? [] }, coverage);
          const { environment: _environment, createdAt: _created, updatedAt: _updated, ...data } = order;
          void _environment; void _created; void _updated;
          write(tx, "checkoutOrders", order.orderId, { ...data, subscriptionId: snapshot.record.subscriptionId,
            status: snapshot.paidAt ? "claimed" : order.status, paidAt: order.paidAt ?? snapshot.paidAt }, order);
        }
        write(tx, "entitlements", ticket.uid, entitlement, previousEntitlement);
        const { environment: _env, createdAt: _created, updatedAt: _updated, ...eventData } = event;
        void _env; void _created; void _updated;
        const needsReview = existing.some((item) => item.snapshot.reviews?.length);
        write(tx, "stripeEvents", ticket.eventId, { ...eventData, status: needsReview ? "failed" : "processed",
          processedAt: needsReview ? null : Timestamp.now(), errorCode: needsReview ? "REVIEW_REQUIRED" : null }, event);
        queueAlerts();
        return entitlement;
      });
    },
    async fail(ticket: SyncTicket, errorCode: string) {
      await db.runTransaction(async (tx) => {
        const stateDoc = await tx.get(ref("subscriptionSyncStates", ticket.uid));
        const eventDoc = await tx.get(ref("stripeEvents", ticket.eventId));
        if (!stateDoc.exists || !eventDoc.exists) return;
        const state = readStoredFirestoreRecord("subscriptionSyncStates", ticket.uid, environment, stateDoc.data());
        const event = readStoredFirestoreRecord("stripeEvents", ticket.eventId, environment, eventDoc.data());
        if (state.generation !== ticket.generation || event.status !== "processing") return;
        const allowed = ["ASSOCIATION_CONFLICT", "INVALID_STRIPE_DATA", "STALE_SYNC", "REVIEW_REQUIRED", "LIMIT_EXCEEDED"];
        const queueAlerts = errorCode === "REVIEW_REQUIRED" ? await planReviewAlerts(tx, root, environment, [{
          sourceType: "event", sourceId: ticket.eventId, details: [{ reference: ticket.eventId, code: "REVIEW_REQUIRED" }],
        }]) : null;
        tx.update(ref("stripeEvents", ticket.eventId), { status: "failed", errorCode: allowed.includes(errorCode) ? errorCode : "TECHNICAL_FAILURE", updatedAt: FieldValue.serverTimestamp() });
        queueAlerts?.();
      });
    },
  };
}
