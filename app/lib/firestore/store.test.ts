import { beforeEach, describe, expect, it, vi } from "vitest";
import { Timestamp } from "firebase-admin/firestore";
import type { CollectionName, FirestoreRecords, StripeEnvironment } from "./types";

const mocks = vi.hoisted(() => ({
  get: vi.fn(), create: vi.fn(), set: vi.fn(), collection: vi.fn(), doc: vi.fn(), db: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("../firebaseAdmin", () => ({ getFirebaseAdminFirestore: mocks.db }));
import { createServerFirestoreStore } from "./store";

const now = Timestamp.fromMillis(1000);
const later = Timestamp.fromMillis(2000);
const records: FirestoreRecords = {
  users: { uid: "user1", email: null, activationStatus: "pending" },
  stripeCustomers: { uid: "user1", customerId: "cus_1" },
  subscriptions: { uid: "user1", customerId: "cus_1", subscriptionId: "sub_1", priceId: "price_1", status: "incomplete", currentPeriodStart: now, currentPeriodEnd: later, paidThrough: null, cancelAtPeriodEnd: false, canceledAt: null, latestInvoiceId: null },
  entitlements: { uid: "user1", product: "cartomailles", status: "inactive", validFrom: null, validUntil: null, subscriptionId: null },
  stripeEvents: { eventId: "evt_1", type: "invoice.paid", objectId: "in_1", status: "pending", attempts: 0, occurredAt: now, processedAt: null, errorCode: null },
  checkoutOrders: { orderId: "order1", uid: null, sessionId: null, customerId: null, subscriptionId: null, status: "pending", expiresAt: later, paidAt: null },
};
const cases: [CollectionName, string][] = [["users", "user1"], ["stripeCustomers", "cus_1"], ["subscriptions", "sub_1"], ["entitlements", "user1"], ["stripeEvents", "evt_1"], ["checkoutOrders", "order1"]];
const stored = (collection: CollectionName, environment: StripeEnvironment = "test") => ({ ...records[collection], environment, createdAt: now, updatedAt: now });

beforeEach(() => {
  vi.resetAllMocks();
  const ref = { collection: mocks.collection, doc: mocks.doc, get: mocks.get, create: mocks.create };
  mocks.collection.mockReturnValue(ref);
  mocks.doc.mockReturnValue(ref);
  mocks.db.mockReturnValue({
    collection: mocks.collection,
    runTransaction: async (callback: (tx: unknown) => Promise<void>) => callback({ get: mocks.get, set: mocks.set }),
  });
  mocks.get.mockResolvedValue({ exists: false });
});

describe("server Firestore store", () => {
  it("is lazy and requires an explicit environment", () => {
    createServerFirestoreStore("test");
    expect(mocks.db).not.toHaveBeenCalled();
    expect(() => createServerFirestoreStore("production" as StripeEnvironment)).toThrow();
  });

  it.each(["test", "live"] as const)("isolates %s paths", async (environment) => {
    await createServerFirestoreStore(environment).read("users", "user1");
    expect(mocks.collection.mock.calls).toEqual([["stripeEnvironments"], ["users"]]);
    expect(mocks.doc.mock.calls).toEqual([[environment], ["user1"]]);
  });

  it.each(cases)("creates and reads validated %s records", async (collection, key) => {
    const store = createServerFirestoreStore("test");
    await store.create(collection, key, records[collection]);
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ ...records[collection], environment: "test", createdAt: expect.anything(), updatedAt: expect.anything() }));
    mocks.get.mockResolvedValue({ exists: true, data: () => stored(collection) });
    await expect(store.read(collection, key)).resolves.toEqual(stored(collection));
  });

  it("returns null for missing documents", async () => {
    await expect(createServerFirestoreStore("test").read("users", "user1")).resolves.toBeNull();
  });

  it.each(["", "a/b", ".."])("rejects unsafe document path %s", async (key) => {
    await expect(createServerFirestoreStore("test").read("users", key)).rejects.toThrow();
    expect(mocks.db).not.toHaveBeenCalled();
  });

  it("rejects unknown collections", async () => {
    await expect(createServerFirestoreStore("test").read("other" as CollectionName, "user1")).rejects.toThrow();
    expect(mocks.db).not.toHaveBeenCalled();
  });

  it("rejects extra fields, mismatched identity and injected timestamps", async () => {
    const store = createServerFirestoreStore("test");
    for (const data of [{ ...records.users, isPaid: true }, { ...records.users, uid: "other" }, { ...records.users, createdAt: now }]) {
      await expect(store.create("users", "user1", data)).rejects.toThrow();
    }
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("rejects invalid dates and reversed subscription periods", async () => {
    const store = createServerFirestoreStore("test");
    await expect(store.create("subscriptions", "sub_1", { ...records.subscriptions, currentPeriodEnd: now })).rejects.toThrow("period");
    await expect(store.create("subscriptions", "sub_1", { ...records.subscriptions, paidThrough: "tomorrow" as unknown as Timestamp })).rejects.toThrow();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("never writes active paid access", async () => {
    const store = createServerFirestoreStore("test");
    const active = { ...records.entitlements, status: "active" as const, validFrom: now, validUntil: later, subscriptionId: "sub_1" };
    await expect(store.create("entitlements", "user1", active)).rejects.toThrow("not implemented");
    await expect(store.replace("entitlements", "user1", active, now)).rejects.toThrow("not implemented");
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.set).not.toHaveBeenCalled();
  });

  it("propagates duplicate creation and database failures", async () => {
    mocks.create.mockRejectedValue(new Error("already exists"));
    await expect(createServerFirestoreStore("test").create("stripeEvents", "evt_1", records.stripeEvents)).rejects.toThrow("already exists");
    mocks.get.mockRejectedValue(new Error("unavailable"));
    await expect(createServerFirestoreStore("test").read("users", "user1")).rejects.toThrow("unavailable");
  });

  it("rejects stored environment mismatch and corrupt records", async () => {
    const store = createServerFirestoreStore("test");
    for (const value of [stored("users", "live"), { ...stored("users"), createdAt: "bad" }, { ...stored("users"), uid: "other" }]) {
      mocks.get.mockResolvedValue({ exists: true, data: () => value });
      await expect(store.read("users", "user1")).rejects.toThrow();
    }
  });

  it("replaces transactionally while retaining creation date", async () => {
    mocks.get.mockResolvedValue({ exists: true, data: () => stored("users") });
    await createServerFirestoreStore("test").replace("users", "user1", { ...records.users, activationStatus: "ready" }, now);
    expect(mocks.set).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ createdAt: now, activationStatus: "ready", environment: "test" }));
  });

  it("rejects stale updates and missing documents", async () => {
    const store = createServerFirestoreStore("test");
    await expect(store.replace("users", "user1", records.users, now)).rejects.toThrow("not found");
    mocks.get.mockResolvedValue({ exists: true, data: () => stored("users") });
    await expect(store.replace("users", "user1", records.users, later)).rejects.toThrow("changed");
    expect(mocks.set).not.toHaveBeenCalled();
  });

  it("refuses reassignment of a Stripe customer", async () => {
    mocks.get.mockResolvedValue({ exists: true, data: () => stored("stripeCustomers") });
    await expect(createServerFirestoreStore("test").replace("stripeCustomers", "cus_1", { ...records.stripeCustomers, uid: "other" }, now)).rejects.toThrow("ownership");
    expect(mocks.set).not.toHaveBeenCalled();
  });
});
