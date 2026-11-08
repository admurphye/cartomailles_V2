import { Timestamp } from "firebase-admin/firestore";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ db: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("../firebaseAdmin", () => ({ getFirebaseAdminFirestore: mocks.db }));
import { createSubscriptionSyncStore } from "./subscriptionSyncStore";
import { CARTOMAILLES_SUBSCRIPTION_POLICY, type SubscriptionSnapshot, type SubscriptionPolicy } from "./subscriptionPolicy";
import type { StripeEventRecord } from "../firestore/types";

type Data = Record<string, unknown>;
type Ref = { path: string; query?: { field: string; value: string; limit: number } };
let documents: Map<string, Data>;
let rejectCommit: boolean;
const now = 15_000;
const prefix = "stripeEnvironments/test";
const policy: SubscriptionPolicy = { pastDue: "paid_coverage", unpaid: "suspend", canceled: "revoke", pausedCollection: "suspend", refunds: "manual_review", disputes: "manual_review", nonCashInvoices: "exclude_invoice" };
function doc(path: string) {
  return { path, collection: (name: string) => doc(`${path}/${name}`), doc: (id: string) => doc(`${path}/${id}`),
    get: async () => snapshot(path),
    where: (field: string, _op: string, value: string) => ({ limit: (limit: number) => {
      const query = { path, query: { field, value, limit } };
      return { ...query, get: async () => read(query) };
    } }),
  };
}
function snapshot(path: string) { const data = documents.get(path); return { exists: Boolean(data), data: () => data }; }
function read(ref: Ref) {
  if (!ref.query) return snapshot(ref.path);
  const q = ref.query;
  return { docs: [...documents.entries()].filter(([path, data]) => path.startsWith(`${ref.path}/`) && data[q.field] === q.value)
    .slice(0, q.limit).map(([path, data]) => ({ id: path.split("/").at(-1)!, data: () => data })) };
}
function put(collection: string, id: string, data: Data) {
  documents.set(`${prefix}/${collection}/${id}`, { ...data, environment: "test", createdAt: Timestamp.fromMillis(1), updatedAt: Timestamp.fromMillis(1) });
}
function event(eventId = "evt_one"): StripeEventRecord {
  return { eventId, type: "invoice.paid", objectId: "in_one", status: "pending", attempts: 0, occurredAt: Timestamp.fromMillis(10_000), processedAt: null, errorCode: null };
}
function paid(subscriptionId = "sub_one", orderId = "order1", status: SubscriptionSnapshot["record"]["status"] = "active"): SubscriptionSnapshot {
  return { orderId, sessionId: `cs_${orderId}`, orderUpdatedAt: Timestamp.fromMillis(1), paidAt: Timestamp.fromMillis(10_000), pausedCollection: false,
    periods: [{ start: 10_000, end: 20_000 }], evidence: [{ invoiceId: "in_one", start: 10_000, end: 20_000 }], record: { uid: "uid1", customerId: "cus_one", subscriptionId, priceId: "price_example", status,
      currentPeriodStart: Timestamp.fromMillis(10_000), currentPeriodEnd: Timestamp.fromMillis(20_000), paidThrough: Timestamp.fromMillis(20_000), cancelAtPeriodEnd: false, canceledAt: null, latestInvoiceId: "in_one" } };
}
function putOrder(orderId = "order1") {
  put("checkoutOrders", orderId, { orderId, uid: "uid1", customerId: "cus_one", sessionId: `cs_${orderId}`, subscriptionId: null,
    status: "pending", expiresAt: Timestamp.fromMillis(30_000), paidAt: null });
}
beforeEach(() => {
  vi.spyOn(Date, "now").mockReturnValue(now);
  documents = new Map(); rejectCommit = false;
  let tail = Promise.resolve();
  mocks.db.mockReturnValue({ collection: (name: string) => doc(name),
    runTransaction: (callback: (tx: unknown) => Promise<unknown>) => {
      const run = tail.then(async () => {
        const writes: { method: string; ref: Ref; data: Data }[] = [];
        let writing = false;
        const result = await callback({
          get: async (ref: Ref) => { if (writing) throw new Error("Read after write"); return read(ref); },
          set: (ref: Ref, data: Data) => { writing = true; writes.push({ method: "set", ref, data }); },
          update: (ref: Ref, data: Data) => { writing = true; writes.push({ method: "update", ref, data }); },
        });
        if (rejectCommit) throw new Error("Sensitive database outage");
        const next = new Map(documents);
        for (const { method, ref, data } of writes) {
          if (method === "update" && !next.has(ref.path)) throw new Error("Missing document");
          const value = { ...(method === "update" ? next.get(ref.path) : {}), ...data };
          if ("createdAt" in value && !(value.createdAt instanceof Timestamp)) value.createdAt = Timestamp.fromMillis(now);
          value.updatedAt = Timestamp.fromMillis(now);
          next.set(ref.path, value);
        }
        documents = next; return result;
      });
      tail = run.then(() => undefined, () => undefined); return run;
    } });
  put("stripeCustomers", "cus_one", { customerId: "cus_one", uid: "uid1" }); putOrder();
});
import { afterEach } from "vitest";
afterEach(() => vi.restoreAllMocks());

describe("atomic subscription synchronization", () => {
  it("commits subscription, entitlement, order and processed event together", async () => {
    const store = createSubscriptionSyncStore("test"); const ticket = (await store.begin(event(), "cus_one"))!;
    await store.commit(ticket, ["cus_one"], [paid()], policy);
    expect(documents.get(`${prefix}/subscriptions/sub_one`)?.uid).toBe("uid1");
    expect(documents.get(`${prefix}/entitlements/uid1`)?.status).toBe("active");
    expect(documents.get(`${prefix}/stripeEvents/evt_one`)?.status).toBe("processed");
    expect(documents.get(`${prefix}/checkoutOrders/order1`)?.subscriptionId).toBe("sub_one");
    expect(await store.begin(event(), "cus_one")).toBeNull();
  });
  it("rolls back all commercial writes on a failed commit and permits replay", async () => {
    const store = createSubscriptionSyncStore("test"); const ticket = (await store.begin(event(), "cus_one"))!;
    rejectCommit = true;
    await expect(store.commit(ticket, ["cus_one"], [paid()], policy)).rejects.toThrow(); rejectCommit = false;
    expect(documents.has(`${prefix}/subscriptions/sub_one`)).toBe(false); expect(documents.has(`${prefix}/entitlements/uid1`)).toBe(false);
    expect(documents.get(`${prefix}/stripeEvents/evt_one`)?.status).toBe("processing");
    const retry = (await store.begin(event(), "cus_one"))!;
    await store.commit(retry, ["cus_one"], [paid()], policy);
    expect(documents.get(`${prefix}/stripeEvents/evt_one`)?.attempts).toBe(2);
  });
  it("fences stale workers and allows retry of an older event against current Stripe state", async () => {
    const store = createSubscriptionSyncStore("test");
    const old = (await store.begin(event("evt_old"), "cus_one"))!;
    const latest = (await store.begin(event("evt_latest"), "cus_one"))!;
    await store.commit(latest, ["cus_one"], [paid("sub_one", "order1", "canceled")], policy);
    await expect(store.commit(old, ["cus_one"], [paid()], policy)).rejects.toThrow("STALE_SYNC");
    await store.fail(old, "TECHNICAL_FAILURE");
    expect(documents.get(`${prefix}/entitlements/uid1`)?.status).toBe("inactive");
    expect(documents.get(`${prefix}/stripeEvents/evt_latest`)?.status).toBe("processed");
  });
  it("preserves another paid subscription when one is canceled", async () => {
    putOrder("order2"); const store = createSubscriptionSyncStore("test");
    const ticket = (await store.begin(event(), "cus_one"))!;
    await store.commit(ticket, ["cus_one"], [paid("sub_one", "order1", "canceled"), paid("sub_two", "order2")], policy);
    expect(documents.get(`${prefix}/entitlements/uid1`)?.subscriptionId).toBe("sub_two");
  });
  it("refuses two subscriptions claiming a single checkout order", async () => {
    const store = createSubscriptionSyncStore("test"); const ticket = (await store.begin(event(), "cus_one"))!;
    await expect(store.commit(ticket, ["cus_one"], [paid(), paid("sub_two")], policy)).rejects.toThrow("ASSOCIATION_CONFLICT");
    expect(documents.has(`${prefix}/entitlements/uid1`)).toBe(false);
  });
  it("refuses reassignment of an existing subscription", async () => {
    put("subscriptions", "sub_one", { ...paid().record, uid: "other" });
    const store = createSubscriptionSyncStore("test"); const ticket = (await store.begin(event(), "cus_one"))!;
    await expect(store.commit(ticket, ["cus_one"], [paid()], policy)).rejects.toThrow("ASSOCIATION_CONFLICT");
    expect(documents.get(`${prefix}/subscriptions/sub_one`)?.uid).toBe("other");
  });
  it("refuses changed order bindings and changed customer enumeration", async () => {
    const store = createSubscriptionSyncStore("test"); const ticket = (await store.begin(event(), "cus_one"))!;
    documents.get(`${prefix}/checkoutOrders/order1`)!.updatedAt = Timestamp.fromMillis(2);
    await expect(store.commit(ticket, ["cus_one"], [paid()], policy)).rejects.toThrow("STALE_SYNC");
    documents.get(`${prefix}/checkoutOrders/order1`)!.updatedAt = Timestamp.fromMillis(1);
    put("stripeCustomers", "cus_two", { customerId: "cus_two", uid: "uid1" });
    await expect(store.commit(ticket, ["cus_one"], [paid()], policy)).rejects.toThrow("STALE_SYNC");
  });
  it("does not erase known subscriptions omitted from a snapshot", async () => {
    put("subscriptions", "sub_two", paid("sub_two").record as unknown as Data);
    const store = createSubscriptionSyncStore("test"); const ticket = (await store.begin(event(), "cus_one"))!;
    await expect(store.commit(ticket, ["cus_one"], [paid()], policy)).rejects.toThrow("STALE_SYNC");
  });
  it("stores only allowlisted failure codes without granting rights", async () => {
    const store = createSubscriptionSyncStore("test"); const ticket = (await store.begin(event(), "cus_one"))!;
    await store.fail(ticket, "secret credential detail");
    expect(documents.get(`${prefix}/stripeEvents/evt_one`)?.errorCode).toBe("TECHNICAL_FAILURE");
    expect(documents.has(`${prefix}/entitlements/uid1`)).toBe(false);
    const retry = (await store.begin(event(), "cus_one"))!;
    await store.fail(retry, "REVIEW_REQUIRED");
    expect(documents.get(`${prefix}/stripeEvents/evt_one`)?.errorCode).toBe("REVIEW_REQUIRED");
  });
  it("isolates identical event IDs in live and test", async () => {
    await expect(createSubscriptionSyncStore("live").begin(event(), "cus_one")).rejects.toThrow("ASSOCIATION_CONFLICT");
    expect(documents.has("stripeEnvironments/live/stripeEvents/evt_one")).toBe(false);
  });
  it("retains exactly the previously confirmed period during manual review without extending it", async () => {
    const store = createSubscriptionSyncStore("test");
    await store.commit((await store.begin(event(), "cus_one"))!, ["cus_one"], [paid()], CARTOMAILLES_SUBSCRIPTION_POLICY);
    const pending = { ...paid(), periods: [], evidence: [], reviews: [{ invoiceId: "in_one", code: "PARTIAL_REFUND" as const }],
      orderUpdatedAt: documents.get(`${prefix}/checkoutOrders/order1`)!.updatedAt as Timestamp };
    pending.record.status = "canceled";
    const ticket = (await store.begin(event("evt_review"), "cus_one"))!;
    await store.commit(ticket, ["cus_one"], [pending], CARTOMAILLES_SUBSCRIPTION_POLICY);
    expect((documents.get(`${prefix}/entitlements/uid1`)!.validUntil as Timestamp).toMillis()).toBe(20_000);
    expect(documents.get(`${prefix}/stripeEvents/evt_review`)?.errorCode).toBe("REVIEW_REQUIRED");
    expect(documents.get(`${prefix}/subscriptionCoverage/sub_one`)?.reviews).toEqual(pending.reviews);
    // Replaying the same review changes no paid boundary.
    pending.orderUpdatedAt = documents.get(`${prefix}/checkoutOrders/order1`)!.updatedAt as Timestamp;
    await store.commit((await store.begin(event("evt_review"), "cus_one"))!, ["cus_one"], [pending], CARTOMAILLES_SUBSCRIPTION_POLICY);
    expect((documents.get(`${prefix}/entitlements/uid1`)!.validUntil as Timestamp).toMillis()).toBe(20_000);
  });
  it("does not invent coverage for an ambiguous invoice with no prior evidence and preserves another subscription", async () => {
    putOrder("order2"); const store = createSubscriptionSyncStore("test");
    const review = { ...paid(), periods: [], evidence: [], reviews: [{ invoiceId: "in_zero", code: "ZERO_INVOICE" as const }] };
    await store.commit((await store.begin(event(), "cus_one"))!, ["cus_one"], [review, paid("sub_two", "order2")], CARTOMAILLES_SUBSCRIPTION_POLICY);
    expect(documents.get(`${prefix}/entitlements/uid1`)?.subscriptionId).toBe("sub_two");
    expect(documents.get(`${prefix}/subscriptionCoverage/sub_one`)?.periods).toEqual([]);
    expect(documents.get(`${prefix}/stripeEvents/evt_one`)?.errorCode).toBe("REVIEW_REQUIRED");
  });
  it("removes only the refunded invoice period while retaining another paid period of the same subscription", async () => {
    const store = createSubscriptionSyncStore("test"); const initial = paid();
    initial.periods.push({ start: 12_000, end: 25_000 }); initial.evidence!.push({ invoiceId: "in_two", start: 12_000, end: 25_000 });
    await store.commit((await store.begin(event(), "cus_one"))!, ["cus_one"], [initial], CARTOMAILLES_SUBSCRIPTION_POLICY);
    const refunded = { ...paid(), periods: [{ start: 12_000, end: 25_000 }], evidence: [{ invoiceId: "in_two", start: 12_000, end: 25_000 }],
      refundedInvoices: ["in_one"], orderUpdatedAt: documents.get(`${prefix}/checkoutOrders/order1`)!.updatedAt as Timestamp };
    await store.commit((await store.begin(event("evt_refund"), "cus_one"))!, ["cus_one"], [refunded], CARTOMAILLES_SUBSCRIPTION_POLICY);
    const result = documents.get(`${prefix}/entitlements/uid1`)!;
    expect((result.validFrom as Timestamp).toMillis()).toBe(12_000); expect((result.validUntil as Timestamp).toMillis()).toBe(25_000);
    expect((documents.get(`${prefix}/subscriptionCoverage/sub_one`)!.periods as { invoiceId: string }[]).map((p) => p.invoiceId)).toEqual(["in_two"]);
    expect(await store.begin(event("evt_refund"), "cus_one")).toBeNull();
  });
  it("commits a confirmed refund even while another subscription requires manual review", async () => {
    putOrder("order2"); const store = createSubscriptionSyncStore("test");
    await store.commit((await store.begin(event(), "cus_one"))!, ["cus_one"], [paid(), paid("sub_two", "order2")], CARTOMAILLES_SUBSCRIPTION_POLICY);
    const refunded = { ...paid(), periods: [], evidence: [], refundedInvoices: ["in_one"], orderUpdatedAt: documents.get(`${prefix}/checkoutOrders/order1`)!.updatedAt as Timestamp };
    const reviewed = { ...paid("sub_two", "order2"), periods: [], evidence: [], reviews: [{ invoiceId: "in_one", code: "DISPUTE" as const }], orderUpdatedAt: documents.get(`${prefix}/checkoutOrders/order2`)!.updatedAt as Timestamp };
    await store.commit((await store.begin(event("evt_mixed"), "cus_one"))!, ["cus_one"], [refunded, reviewed], CARTOMAILLES_SUBSCRIPTION_POLICY);
    expect(documents.get(`${prefix}/subscriptionCoverage/sub_one`)?.periods).toEqual([]);
    expect(documents.get(`${prefix}/entitlements/uid1`)?.subscriptionId).toBe("sub_two");
    expect(documents.get(`${prefix}/stripeEvents/evt_mixed`)?.errorCode).toBe("REVIEW_REQUIRED");
  });
  it("does not retain a confirmed refunded period merely because that same invoice has a review diagnostic", async () => {
    const store = createSubscriptionSyncStore("test");
    await store.commit((await store.begin(event(), "cus_one"))!, ["cus_one"], [paid()], CARTOMAILLES_SUBSCRIPTION_POLICY);
    const removed = { ...paid(), periods: [], evidence: [], refundedInvoices: ["in_one"], reviews: [{ invoiceId: "in_one", code: "DISPUTE" as const }],
      orderUpdatedAt: documents.get(`${prefix}/checkoutOrders/order1`)!.updatedAt as Timestamp };
    await store.commit((await store.begin(event("evt_refund_dispute"), "cus_one"))!, ["cus_one"], [removed], CARTOMAILLES_SUBSCRIPTION_POLICY);
    expect(documents.get(`${prefix}/entitlements/uid1`)?.status).toBe("inactive");
    expect(documents.get(`${prefix}/subscriptionCoverage/sub_one`)?.periods).toEqual([]);
    expect(documents.get(`${prefix}/stripeEvents/evt_refund_dispute`)?.errorCode).toBe("REVIEW_REQUIRED");
  });
  it("queues one durable alert atomically with REVIEW_REQUIRED and deduplicates event replays", async () => {
    const store = createSubscriptionSyncStore("test");
    const reviewed = { ...paid(), periods: [], evidence: [], reviews: [{ invoiceId: "in_one", code: "DISPUTE" as const }] };
    const ticket = (await store.begin(event("evt_review"), "cus_one"))!;
    rejectCommit = true;
    await expect(store.commit(ticket, ["cus_one"], [reviewed], CARTOMAILLES_SUBSCRIPTION_POLICY)).rejects.toThrow(); rejectCommit = false;
    expect([...documents.keys()].filter((p) => p.includes("/reviewNotifications/"))).toHaveLength(0);
    await store.commit((await store.begin(event("evt_review"), "cus_one"))!, ["cus_one"], [reviewed], CARTOMAILLES_SUBSCRIPTION_POLICY);
    reviewed.orderUpdatedAt = documents.get(`${prefix}/checkoutOrders/order1`)!.updatedAt as Timestamp;
    await store.commit((await store.begin(event("evt_review"), "cus_one"))!, ["cus_one"], [reviewed], CARTOMAILLES_SUBSCRIPTION_POLICY);
    const messages = [...documents.entries()].filter(([p]) => p.includes("/reviewNotifications/"));
    expect(messages).toHaveLength(1); expect(messages[0][1].status).toBe("pending"); expect(messages[0][1].codes).toEqual(["DISPUTE"]);
    expect(messages[0][1]).not.toHaveProperty("email"); expect(messages[0][1]).not.toHaveProperty("uid");
  });
  it("alerts on new anomalies and reopening, without alerting for reordering or partial resolution", async () => {
    const store = createSubscriptionSyncStore("test"); let sequence = 0;
    const sync = async (reviews: NonNullable<SubscriptionSnapshot["reviews"]>) => {
      const data = { ...paid(), periods: [], evidence: [], reviews,
        orderUpdatedAt: documents.get(`${prefix}/checkoutOrders/order1`)!.updatedAt as Timestamp };
      await store.commit((await store.begin(event(`evt_${sequence++}`), "cus_one"))!, ["cus_one"], [data], CARTOMAILLES_SUBSCRIPTION_POLICY);
    };
    const dispute = { invoiceId: "in_one", code: "DISPUTE" as const };
    const refund = { invoiceId: "in_two", code: "PARTIAL_REFUND" as const };
    const count = () => [...documents.keys()].filter((p) => p.includes("/reviewNotifications/")).length;
    await sync([dispute]); expect(count()).toBe(1);
    await sync([dispute, refund]); expect(count()).toBe(2);
    await sync([refund, dispute, dispute]); expect(count()).toBe(2);
    await sync([dispute]); expect(count()).toBe(2);
    await sync([]); await sync([dispute]); expect(count()).toBe(3);
  });
  it("also queues a generic review alert from the failure path", async () => {
    const store = createSubscriptionSyncStore("test"); const ticket = (await store.begin(event(), "cus_one"))!;
    await store.fail(ticket, "REVIEW_REQUIRED");
    const message = [...documents.entries()].find(([path]) => path.includes("/reviewNotifications/"))![1];
    expect(message.sourceType).toBe("event"); expect(message.codes).toEqual(["REVIEW_REQUIRED"]);
    expect(documents.get(`${prefix}/stripeEvents/evt_one`)?.errorCode).toBe("REVIEW_REQUIRED");
  });
});
