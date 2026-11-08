import "server-only";

import { randomUUID } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getFirebaseAdminFirestore } from "../firebaseAdmin";
import { readStoredFirestoreRecord, validateFirestoreRecord } from "../firestore/store";
import type { CollectionName, FirestoreRecords, StoredRecord, StripeEnvironment } from "../firestore/types";

export class CheckoutConflictError extends Error {
  constructor() { super("Checkout requires reconciliation or a new request."); }
}

/** Trusted verified UIDs only. Stripe calls must remain outside these transactions. */
export function createCheckoutStore(environment: StripeEnvironment) {
  if (environment !== "test" && environment !== "live") throw new Error("Invalid Stripe environment.");
  const db = getFirebaseAdminFirestore();
  const root = db.collection("stripeEnvironments").doc(environment);
  function ref(collection: CollectionName, id: string) {
    if (!id || /[\/\x00-\x1f]/.test(id) || id === "." || id === "..") throw new Error("Invalid document ID.");
    return root.collection(collection).doc(id);
  }
  function stored<K extends CollectionName>(collection: K, id: string, data: FirestoreRecords[K]): StoredRecord<K> {
    validateFirestoreRecord(collection, id, data);
    const now = Timestamp.now();
    return { ...data, environment, createdAt: now, updatedAt: now };
  }
  const metadata = () => ({ environment, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });

  return {
    async reserve(uid: string, priceId: string, appUrl: string) {
      return db.runTransaction(async (tx) => {
        const accountRef = ref("checkoutAccounts", uid);
        const snapshot = await tx.get(accountRef);
        let account = snapshot.exists ? readStoredFirestoreRecord("checkoutAccounts", uid, environment, snapshot.data()) : null;
        if (account) {
          const orderSnapshot = await tx.get(ref("checkoutOrders", account.currentOrderId));
          if (!orderSnapshot.exists) throw new CheckoutConflictError();
          const order = readStoredFirestoreRecord("checkoutOrders", account.currentOrderId, environment, orderSnapshot.data());
          if (order.uid !== uid || order.customerId !== account.customerId) throw new CheckoutConflictError();
          if (order.status !== "expired") {
            if (order.status !== "pending" || account.priceId !== priceId || account.appUrl !== appUrl) throw new CheckoutConflictError();
            return { account, order };
          }
        }
        let customerId = account?.customerId ?? null;
        if (!account) {
          // Migration/reuse of existing ownership: never search by email.
          const customers = await tx.get(root.collection("stripeCustomers").where("uid", "==", uid).limit(2));
          if (customers.docs.length > 1) throw new CheckoutConflictError();
          if (customers.docs.length === 1) {
            const doc = customers.docs[0];
            const customer = readStoredFirestoreRecord("stripeCustomers", doc.id, environment, doc.data());
            if (customer.uid !== uid) throw new CheckoutConflictError();
            customerId = customer.customerId;
          }
        }
        const orderId = randomUUID();
        const order = stored("checkoutOrders", orderId, {
          orderId, uid, customerId, sessionId: null, subscriptionId: null, status: "pending",
          expiresAt: Timestamp.fromMillis(Date.now() + 2 * 60 * 60 * 1000), paidAt: null,
        });
        const nextAccount = stored("checkoutAccounts", uid, {
          uid, customerId, customerOperationId: account?.customerOperationId ?? randomUUID(),
          currentOrderId: orderId, priceId, appUrl,
        });
        if (account) nextAccount.createdAt = account.createdAt;
        tx.create(ref("checkoutOrders", orderId), { ...order, ...metadata() });
        tx.set(accountRef, { ...nextAccount, ...metadata(), createdAt: account?.createdAt ?? FieldValue.serverTimestamp() });
        account = nextAccount;
        return { account, order };
      });
    },

    async attachCustomer(uid: string, orderId: string, customerId: string) {
      await db.runTransaction(async (tx) => {
        const accountRef = ref("checkoutAccounts", uid);
        const orderRef = ref("checkoutOrders", orderId);
        const customerRef = ref("stripeCustomers", customerId);
        const [a, o, c] = await Promise.all([tx.get(accountRef), tx.get(orderRef), tx.get(customerRef)]);
        if (!a.exists || !o.exists) throw new CheckoutConflictError();
        const account = readStoredFirestoreRecord("checkoutAccounts", uid, environment, a.data());
        const order = readStoredFirestoreRecord("checkoutOrders", orderId, environment, o.data());
        if (account.currentOrderId !== orderId || order.uid !== uid || order.status !== "pending" ||
            (account.customerId !== null && account.customerId !== customerId) ||
            (order.customerId !== null && order.customerId !== customerId)) throw new CheckoutConflictError();
        if (c.exists) {
          const customer = readStoredFirestoreRecord("stripeCustomers", customerId, environment, c.data());
          if (customer.uid !== uid) throw new CheckoutConflictError();
        } else {
          const customer = stored("stripeCustomers", customerId, { uid, customerId });
          tx.create(customerRef, { ...customer, ...metadata() });
        }
        tx.update(accountRef, { customerId, updatedAt: FieldValue.serverTimestamp() });
        tx.update(orderRef, { customerId, updatedAt: FieldValue.serverTimestamp() });
      });
    },

    async attachSession(uid: string, orderId: string, customerId: string, sessionId: string) {
      await db.runTransaction(async (tx) => {
        const accountSnapshot = await tx.get(ref("checkoutAccounts", uid));
        const orderRef = ref("checkoutOrders", orderId);
        const snapshot = await tx.get(orderRef);
        if (!snapshot.exists || !accountSnapshot.exists) throw new CheckoutConflictError();
        const account = readStoredFirestoreRecord("checkoutAccounts", uid, environment, accountSnapshot.data());
        const order = readStoredFirestoreRecord("checkoutOrders", orderId, environment, snapshot.data());
        if (account.currentOrderId !== orderId || account.customerId !== customerId || order.uid !== uid ||
            order.customerId !== customerId || order.status !== "pending" ||
            (order.sessionId !== null && order.sessionId !== sessionId)) throw new CheckoutConflictError();
        validateFirestoreRecord("checkoutOrders", orderId, {
          orderId, uid, sessionId, customerId, subscriptionId: order.subscriptionId,
          status: order.status, expiresAt: order.expiresAt, paidAt: order.paidAt,
        });
        tx.update(orderRef, { sessionId, updatedAt: FieldValue.serverTimestamp() });
      });
    },

    async expire(uid: string, orderId: string, sessionId: string) {
      await db.runTransaction(async (tx) => {
        const orderRef = ref("checkoutOrders", orderId);
        const snapshot = await tx.get(orderRef);
        if (!snapshot.exists) throw new CheckoutConflictError();
        const order = readStoredFirestoreRecord("checkoutOrders", orderId, environment, snapshot.data());
        if (order.uid !== uid || order.sessionId !== sessionId || order.status !== "pending") throw new CheckoutConflictError();
        tx.update(orderRef, { status: "expired", updatedAt: FieldValue.serverTimestamp() });
      });
    },
  };
}
