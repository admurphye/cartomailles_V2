import { Timestamp } from "firebase-admin/firestore";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Stripe from "stripe";
const mocks = vi.hoisted(() => ({ db: vi.fn(), event: vi.fn(), eventCustomer: vi.fn(), subscriptionIds: vi.fn(), subscription: vi.fn(), snapshot: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("../firebaseAdmin", () => ({ getFirebaseAdminFirestore: mocks.db }));
vi.mock("./subscriptionStripe", async (original) => ({
  ...await original<typeof import("./subscriptionStripe")>(),
  createSubscriptionStripe: () => ({ event: mocks.event, eventCustomer: mocks.eventCustomer, subscriptionIds: mocks.subscriptionIds, subscription: mocks.subscription, snapshot: mocks.snapshot }),
}));
import { POST } from "../../api/stripe/webhook/route";
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
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

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

describe("signed webhook through real synchronization and in-memory Firestore transactions", () => {
  const signingSecret = "whsec_local_simulation_only";
  const signatureSdk = new Stripe("sk_test_fake");
  const events = new Map<string, { id: string; type: string; livemode: boolean; created: number; data: { object: { id: string } } }>();
  function webhook(eventId = "evt_paid", type = "invoice.paid", created = 10) {
    const value = { id: eventId, type, livemode: false, created, data: { object: { id: type.startsWith("customer.subscription.") ? "sub_one" : "in_one" } } };
    events.set(eventId, value);
    const body = JSON.stringify(value);
    return new Request("https://app.example.invalid/api/stripe/webhook", { method: "POST", body,
      headers: { "stripe-signature": signatureSdk.webhooks.generateTestHeaderString({ payload: body, secret: signingSecret }) } });
  }
  beforeEach(() => {
    vi.stubEnv("STRIPE_ENVIRONMENT", "test"); vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fake");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", signingSecret); vi.stubEnv("STRIPE_PRICE_ID", "price_example");
    vi.stubEnv("APP_URL", "https://app.example.invalid"); vi.stubEnv("REVIEW_EMAIL_ENABLED", "false");
    vi.stubGlobal("fetch", vi.fn(() => { throw new Error("External calls forbidden"); }));
    vi.spyOn(console, "info").mockImplementation(() => {}); vi.spyOn(console, "error").mockImplementation(() => {});
    events.clear();
    for (const name of ["event", "eventCustomer", "subscriptionIds", "subscription", "snapshot"] as const) mocks[name].mockReset();
    mocks.event.mockImplementation(async (id: string) => events.get(id));
    mocks.eventCustomer.mockResolvedValue({ customerId: "cus_one", subscriptionId: "sub_one" });
    mocks.subscriptionIds.mockResolvedValue(["sub_one"]);
    mocks.subscription.mockResolvedValue({ id: "sub_one", customer: "cus_one", metadata: { firebaseUid: "uid1", orderId: "order1" } });
    mocks.snapshot.mockImplementation(async (_sub, _uid, order) => ({ ...paid(), orderUpdatedAt: order.updatedAt }));
  });
  const entitlement = () => documents.get(`${prefix}/entitlements/uid1`)!;
  it("commits a confirmed payment once and replays without changing rights", async () => {
    expect((await POST(webhook())).status).toBe(200);
    expect(entitlement().status).toBe("active");
    const previous = new Map(documents);
    const response = await POST(webhook());
    expect(await response.json()).toEqual({ received: true, status: "duplicate" });
    expect(documents).toEqual(previous);
    expect(mocks.snapshot).toHaveBeenCalledTimes(1);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("uses current renewed coverage even when an older event arrives later", async () => {
    await POST(webhook());
    mocks.snapshot.mockImplementation(async (_sub, _uid, order) => ({ ...paid(), orderUpdatedAt: order.updatedAt,
      periods: [{ start: 10000, end: 40000 }], evidence: [{ invoiceId: "in_renewed", start: 10000, end: 40000 }] }));
    expect((await POST(webhook("evt_newer", "invoice.paid", 14))).status).toBe(200);
    expect((await POST(webhook("evt_older", "customer.subscription.updated", 11))).status).toBe(200);
    expect((entitlement().validUntil as Timestamp).toMillis()).toBe(40000);
  });
  it("does not grant initial access merely for a completed Checkout", async () => {
    mocks.snapshot.mockImplementation(async (_sub, _uid, order) => ({ ...paid(), orderUpdatedAt: order.updatedAt, periods: [], evidence: [], paidAt: null }));
    expect((await POST(webhook("evt_checkout", "checkout.session.completed"))).status).toBe(200);
    expect(entitlement().status).toBe("inactive");
  });
  it("preserves only already paid coverage after failure and cancellation", async () => {
    await POST(webhook());
    mocks.snapshot.mockImplementation(async (_sub, _uid, order) => ({ ...paid("sub_one", "order1", "past_due"), orderUpdatedAt: order.updatedAt,
      reviews: [{ invoiceId: "in_unpaid", code: "PAYMENT_UNCONFIRMED" }] }));
    expect((await POST(webhook("evt_failure", "invoice.payment_failed"))).status).toBe(200);
    expect((entitlement().validUntil as Timestamp).toMillis()).toBe(20000);
    mocks.snapshot.mockImplementation(async (_sub, _uid, order) => ({ ...paid("sub_one", "order1", "canceled"), orderUpdatedAt: order.updatedAt }));
    expect((await POST(webhook("evt_cancel", "customer.subscription.deleted"))).status).toBe(200);
    expect((entitlement().validUntil as Timestamp).toMillis()).toBe(20000);
    vi.spyOn(Date, "now").mockReturnValue(20000);
    await POST(webhook("evt_expired", "customer.subscription.deleted"));
    expect(entitlement().status).toBe("inactive");
  });
  it("removes confirmed refunded coverage without changing the approved policy", async () => {
    await POST(webhook());
    mocks.snapshot.mockImplementation(async (_sub, _uid, order) => ({ ...paid(), orderUpdatedAt: order.updatedAt,
      periods: [], evidence: [], refundedInvoices: ["in_one"] }));
    expect((await POST(webhook("evt_refund", "charge.refunded"))).status).toBe(200);
    expect(entitlement().status).toBe("inactive");
    expect(documents.get(`${prefix}/subscriptionCoverage/sub_one`)?.periods).toEqual([]);
  });
  it("persists and deduplicates REVIEW_REQUIRED without sending an email", async () => {
    mocks.snapshot.mockImplementation(async (_sub, _uid, order) => ({ ...paid(), orderUpdatedAt: order.updatedAt,
      periods: [], evidence: [], reviews: [{ invoiceId: "in_one", code: "PARTIAL_REFUND" }] }));
    for (let n = 0; n < 2; n++) {
      const response = await POST(webhook("evt_review", "refund.updated"));
      expect(await response.json()).toEqual({ received: true, status: "review_required" });
    }
    expect(entitlement().status).toBe("inactive");
    expect(documents.get(`${prefix}/stripeEvents/evt_review`)?.errorCode).toBe("REVIEW_REQUIRED");
    expect([...documents.keys()].filter((path) => path.includes("/reviewNotifications/"))).toHaveLength(1);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("returns 503 on Firestore failure and permits a successful retry", async () => {
    rejectCommit = true;
    expect((await POST(webhook())).status).toBe(503);
    expect(documents.has(`${prefix}/entitlements/uid1`)).toBe(false);
    rejectCommit = false;
    expect((await POST(webhook())).status).toBe(200);
    expect(entitlement().status).toBe("active");
  });
  it("fences concurrent deliveries and allows the stale attempt to retry", async () => {
    const responses = await Promise.all([POST(webhook()), POST(webhook())]);
    expect(responses.map((response) => response.status)).toContain(200);
    expect(responses.every((response) => [200, 503].includes(response.status))).toBe(true);
    expect(entitlement().status).toBe("active");
    expect((await POST(webhook())).status).toBe(200);
    expect(documents.get(`${prefix}/stripeEvents/evt_paid`)?.status).toBe("processed");
  });
  it("does not acknowledge a failed commercial commit after reservation", async () => {
    mocks.snapshot.mockImplementation(async (_sub, _uid, order) => {
      rejectCommit = true;
      return { ...paid(), orderUpdatedAt: order.updatedAt };
    });
    expect((await POST(webhook())).status).toBe(503);
    expect(documents.get(`${prefix}/stripeEvents/evt_paid`)?.status).toBe("processing");
    expect(documents.has(`${prefix}/entitlements/uid1`)).toBe(false);
    rejectCommit = false;
    mocks.snapshot.mockImplementation(async (_sub, _uid, order) => ({ ...paid(), orderUpdatedAt: order.updatedAt }));
    expect((await POST(webhook())).status).toBe(200);
    expect(entitlement().status).toBe("active");
  });
});
