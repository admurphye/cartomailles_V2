import { Timestamp } from "firebase-admin/firestore";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ db: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("../firebaseAdmin", () => ({ getFirebaseAdminFirestore: mocks.db }));
import { createCheckoutStore } from "./checkoutStore";

// In-memory transactional Firestore double: atomic commits, serialized concurrent
// calls and rollback on failure. No Firebase credentials or network are used.
type Data = Record<string, unknown>;
type Ref = { path: string; query?: { field: string; value: string; limit: number } };
let documents: Map<string, Data>;
function reference(path: string) {
  return { path,
    collection: (name: string) => reference(`${path}/${name}`),
    doc: (id: string) => reference(`${path}/${id}`),
    where: (field: string, _op: string, value: string) => ({ limit: (limit: number) => ({ path, query: { field, value, limit } }) }),
  };
}
const prefix = "stripeEnvironments/test";
function put(collection: string, id: string, data: Data) {
  documents.set(`${prefix}/${collection}/${id}`, { ...data, environment: "test", createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
}
beforeEach(() => {
  documents = new Map();
  let tail = Promise.resolve();
  mocks.db.mockReturnValue({
    collection: (name: string) => reference(name),
    runTransaction: (callback: (tx: unknown) => Promise<unknown>) => {
      const run = tail.then(async () => {
        const writes: { method: string; ref: Ref; data: Data }[] = [];
        const result = await callback({
          get: async (ref: Ref) => {
            if (ref.query) {
              const query = ref.query;
              return { docs: [...documents.entries()].filter(([path, data]) => path.startsWith(`${ref.path}/`) && data[query.field] === query.value)
                .slice(0, query.limit).map(([path, data]) => ({ id: path.split("/").at(-1)!, data: () => data })) };
            }
            const data = documents.get(ref.path);
            return { exists: Boolean(data), data: () => data };
          },
          create: (ref: Ref, data: Data) => writes.push({ method: "create", ref, data }),
          set: (ref: Ref, data: Data) => writes.push({ method: "set", ref, data }),
          update: (ref: Ref, data: Data) => writes.push({ method: "update", ref, data }),
        });
        const next = new Map(documents);
        for (const { method, ref, data } of writes) {
          if (method === "create" && next.has(ref.path)) throw new Error("Already exists");
          if (method === "update" && !next.has(ref.path)) throw new Error("Missing document");
          const value = { ...(method === "update" ? next.get(ref.path) : {}), ...data };
          if ("createdAt" in value && !(value.createdAt instanceof Timestamp)) value.createdAt = Timestamp.now();
          value.updatedAt = Timestamp.now();
          next.set(ref.path, value);
        }
        documents = next;
        return result;
      });
      tail = run.then(() => undefined, () => undefined);
      return run;
    },
  });
});

describe("durable checkout ownership and reservations", () => {
  it("reserves one order for concurrent calls by the same UID", async () => {
    const store = createCheckoutStore("test");
    const results = await Promise.all(Array.from({ length: 5 }, () => store.reserve("uid1", "price_example", "https://app.example.invalid")));
    expect(new Set(results.map((r) => r.order.orderId)).size).toBe(1);
    expect(new Set(results.map((r) => r.account.customerOperationId)).size).toBe(1);
    expect([...documents.keys()].filter((p) => p.includes("/checkoutOrders/"))).toHaveLength(1);
    expect(results[0].order.uid).toBe("uid1");
  });
  it("reuses an existing customer association without email lookup", async () => {
    put("stripeCustomers", "cus_existing", { customerId: "cus_existing", uid: "uid1" });
    const result = await createCheckoutStore("test").reserve("uid1", "price_example", "https://app.example.invalid");
    expect(result.account.customerId).toBe("cus_existing"); expect(result.order.customerId).toBe("cus_existing");
  });
  it("refuses ambiguous customer associations", async () => {
    put("stripeCustomers", "cus_one", { customerId: "cus_one", uid: "uid1" });
    put("stripeCustomers", "cus_two", { customerId: "cus_two", uid: "uid1" });
    await expect(createCheckoutStore("test").reserve("uid1", "price_example", "https://app.example.invalid")).rejects.toThrow();
    expect(documents.size).toBe(2);
  });
  it("atomically attaches customer ownership and tolerates concurrent replay", async () => {
    const store = createCheckoutStore("test");
    const { order } = await store.reserve("uid1", "price_example", "https://app.example.invalid");
    await Promise.all([store.attachCustomer("uid1", order.orderId, "cus_one"), store.attachCustomer("uid1", order.orderId, "cus_one")]);
    expect(documents.get(`${prefix}/checkoutAccounts/uid1`)?.customerId).toBe("cus_one");
    expect(documents.get(`${prefix}/checkoutOrders/${order.orderId}`)?.customerId).toBe("cus_one");
    expect(documents.get(`${prefix}/stripeCustomers/cus_one`)?.uid).toBe("uid1");
    await expect(store.attachCustomer("uid1", order.orderId, "cus_two")).rejects.toThrow();
    expect(documents.has(`${prefix}/stripeCustomers/cus_two`)).toBe(false);
  });
  it("never reassigns a Stripe customer owned by another UID", async () => {
    const store = createCheckoutStore("test");
    const { order } = await store.reserve("uid1", "price_example", "https://app.example.invalid");
    put("stripeCustomers", "cus_foreign", { customerId: "cus_foreign", uid: "other" });
    await expect(store.attachCustomer("uid1", order.orderId, "cus_foreign")).rejects.toThrow();
    expect(documents.get(`${prefix}/checkoutAccounts/uid1`)?.customerId).toBeNull();
    expect(documents.get(`${prefix}/checkoutOrders/${order.orderId}`)?.customerId).toBeNull();
  });
  it("persists one session and rejects competing sessions or foreign users", async () => {
    const store = createCheckoutStore("test");
    const { order } = await store.reserve("uid1", "price_example", "https://app.example.invalid");
    await store.attachCustomer("uid1", order.orderId, "cus_one");
    await store.attachSession("uid1", order.orderId, "cus_one", "cs_one");
    await store.attachSession("uid1", order.orderId, "cus_one", "cs_one");
    await expect(store.attachSession("uid1", order.orderId, "cus_one", "cs_two")).rejects.toThrow();
    await expect(store.attachSession("other", order.orderId, "cus_one", "cs_one")).rejects.toThrow();
    expect(documents.get(`${prefix}/checkoutOrders/${order.orderId}`)?.sessionId).toBe("cs_one");
  });
  it("keeps pending expired-by-clock attempts locked until reconciliation", async () => {
    const store = createCheckoutStore("test");
    const first = await store.reserve("uid1", "price_example", "https://app.example.invalid");
    documents.get(`${prefix}/checkoutOrders/${first.order.orderId}`)!.expiresAt = Timestamp.fromMillis(1);
    const retry = await store.reserve("uid1", "price_example", "https://app.example.invalid");
    expect(retry.order.orderId).toBe(first.order.orderId);
  });
  it("creates a new order only after a confirmed expiration and retains the customer", async () => {
    const store = createCheckoutStore("test");
    const { order } = await store.reserve("uid1", "price_example", "https://app.example.invalid");
    await store.attachCustomer("uid1", order.orderId, "cus_one");
    await store.attachSession("uid1", order.orderId, "cus_one", "cs_one");
    await expect(store.expire("other", order.orderId, "cs_one")).rejects.toThrow();
    await store.expire("uid1", order.orderId, "cs_one");
    const next = await store.reserve("uid1", "price_example", "https://app.example.invalid");
    expect(next.order.orderId).not.toBe(order.orderId); expect(next.account.customerId).toBe("cus_one");
  });
  it("refuses config changes mid-checkout and never activates entitlements", async () => {
    const store = createCheckoutStore("test");
    await store.reserve("uid1", "price_example", "https://app.example.invalid");
    await expect(store.reserve("uid1", "price_other", "https://app.example.invalid")).rejects.toThrow();
    expect([...documents.keys()].some((path) => /entitlements|subscriptions|users/.test(path))).toBe(false);
  });
  it("isolates test and live reservations for the same UID", async () => {
    const test = await createCheckoutStore("test").reserve("uid1", "price_test", "https://app.example.invalid");
    const live = await createCheckoutStore("live").reserve("uid1", "price_live", "https://app.example.invalid");
    expect(test.order.orderId).not.toBe(live.order.orderId);
    expect(documents.has("stripeEnvironments/test/checkoutAccounts/uid1")).toBe(true);
    expect(documents.has("stripeEnvironments/live/checkoutAccounts/uid1")).toBe(true);
  });
});
