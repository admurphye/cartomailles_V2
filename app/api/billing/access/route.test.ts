import { Timestamp } from "firebase-admin/firestore";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ verify: vi.fn(), read: vi.fn(), store: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("../../../lib/firebaseAdmin", async (original) => ({
  ...await original<typeof import("../../../lib/firebaseAdmin")>(), verifyFirebaseIdToken: mocks.verify,
}));
vi.mock("../../../lib/firestore/store", () => ({ createServerFirestoreStore: mocks.store }));
import { FirebaseIdTokenError } from "../../../lib/firebaseAdmin";
import { GET } from "./route";
const now = 10000;
function request(authorization = "Bearer token", query = "", extra = {}) {
  return new Request(`https://app.example.invalid/api/billing/access${query}`, { headers: { authorization, ...extra } });
}
function entitlement(patch = {}) {
  return { uid: "verified-user", environment: "test", product: "cartomailles", status: "active", subscriptionId: "sub_fake",
    validFrom: Timestamp.fromMillis(now - 1000), validUntil: Timestamp.fromMillis(now + 1000), ...patch };
}
beforeEach(() => {
  vi.resetAllMocks(); vi.useFakeTimers(); vi.setSystemTime(now);
  vi.stubEnv("STRIPE_ENVIRONMENT", "test");
  mocks.verify.mockResolvedValue("verified-user"); mocks.read.mockResolvedValue(entitlement());
  mocks.store.mockReturnValue({ read: mocks.read });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });
describe("authenticated own subscription access API with simulated Firestore", () => {
  it("uses the verified UID only and returns no private references", async () => {
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ authorized: true, validUntil: now + 1000 });
    expect(mocks.verify).toHaveBeenCalledExactlyOnceWith("token");
    expect(mocks.read).toHaveBeenCalledExactlyOnceWith("entitlements", "verified-user");
    expect(mocks.store).toHaveBeenCalledExactlyOnceWith("test");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("vary")).toBe("Authorization");
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });
  it.each(["", "Basic token", "Bearer one two", "Bearer token, other", `Bearer ${"x".repeat(8192)}`])("rejects malformed authentication before Firestore: %s", async (header) => {
    expect((await GET(request(header))).status).toBe(401);
    expect(mocks.verify).not.toHaveBeenCalled(); expect(mocks.read).not.toHaveBeenCalled();
  });
  it("rejects browser-selected UIDs, environments and Checkout redirects", async () => {
    for (const query of ["?uid=another", "?environment=live", "?checkout=success"]) expect((await GET(request("Bearer token", query))).status).toBe(400);
    expect(mocks.read).not.toHaveBeenCalled();
    expect((await GET(request("Bearer token", "", { origin: "https://foreign.example.invalid" }))).status).toBe(403);
  });
  it("rejects revoked or invalid tokens before reading rights", async () => {
    mocks.verify.mockRejectedValue(new FirebaseIdTokenError());
    expect((await GET(request())).status).toBe(401); expect(mocks.read).not.toHaveBeenCalled();
  });
  it.each([null, entitlement({ status: "inactive" }), entitlement({ status: "suspended" }), entitlement({ validUntil: Timestamp.fromMillis(now) }), entitlement({ uid: "foreign" })])("refuses missing, expired or invalid rights", async (record) => {
    mocks.read.mockResolvedValue(record);
    const response = await GET(request());
    expect(response.status).toBe(403); expect(await response.json()).toEqual({ authorized: false, status: "subscription_required" });
  });
  it("treats database and configuration failures as unavailable, not unsubscribed", async () => {
    mocks.read.mockRejectedValue(new Error("private credentials"));
    const response = await GET(request());
    expect(response.status).toBe(503); expect(await response.text()).not.toContain("private");
    vi.stubEnv("STRIPE_ENVIRONMENT", "");
    expect((await GET(request())).status).toBe(503);
  });
  it("isolates concurrent requests using their verified identities", async () => {
    mocks.verify.mockImplementation(async (token: string) => token === "one" ? "verified-user" : "other-user");
    mocks.read.mockImplementation(async (_collection: string, uid: string) => uid === "verified-user" ? entitlement() : null);
    const responses = await Promise.all([GET(request("Bearer one")), GET(request("Bearer two"))]);
    expect(responses.map((response) => response.status)).toEqual([200, 403]);
    expect(mocks.read).toHaveBeenCalledWith("entitlements", "other-user");
  });
});
