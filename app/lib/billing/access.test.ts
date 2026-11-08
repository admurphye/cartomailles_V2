import { Timestamp } from "firebase-admin/firestore";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ verify: vi.fn(), read: vi.fn(), store: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("../firebaseAdmin", async (importOriginal) => ({
  ...await importOriginal<typeof import("../firebaseAdmin")>(),
  verifyFirebaseIdToken: mocks.verify,
}));
vi.mock("../firestore/store", () => ({ createServerFirestoreStore: mocks.store }));
import { FirebaseAuthServiceError, FirebaseIdTokenError } from "../firebaseAdmin";
import { checkCartomaillesAccess } from "./access";

const now = 10_000;
function entitlement(overrides: Record<string, unknown> = {}) {
  return {
    uid: "verified-user", product: "cartomailles", environment: "live", status: "active",
    validFrom: Timestamp.fromMillis(now - 1000), validUntil: Timestamp.fromMillis(now + 1000),
    subscriptionId: "sub_example", ...overrides,
  };
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(now);
  vi.stubEnv("STRIPE_ENVIRONMENT", "live");
  mocks.verify.mockResolvedValue("verified-user");
  mocks.store.mockReturnValue({ read: mocks.read });
  mocks.read.mockResolvedValue(entitlement());
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

describe("read-only subscription access", () => {
  it.each(["test", "live"])("uses the configured %s environment and verified UID only", async (environment) => {
    vi.stubEnv("STRIPE_ENVIRONMENT", environment);
    mocks.read.mockResolvedValue(entitlement({ environment }));
    expect(await checkCartomaillesAccess("raw-id-token")).toEqual({
      authorized: true, uid: "verified-user", validUntil: Timestamp.fromMillis(now + 1000),
    });
    expect(mocks.verify).toHaveBeenCalledExactlyOnceWith("raw-id-token");
    expect(mocks.store).toHaveBeenCalledExactlyOnceWith(environment);
    expect(mocks.read).toHaveBeenCalledExactlyOnceWith("entitlements", "verified-user");
  });
  it.each(["", "production", "LIVE"])("fails closed without an explicit valid Stripe environment: %s", async (environment) => {
    vi.stubEnv("STRIPE_ENVIRONMENT", environment);
    expect(await checkCartomaillesAccess("token")).toEqual({ authorized: false, kind: "unavailable", reason: "configuration" });
    expect(mocks.verify).not.toHaveBeenCalled();
    expect(mocks.store).not.toHaveBeenCalled();
  });
  it("distinguishes no subscription from an unavailable database", async () => {
    mocks.read.mockResolvedValue(null);
    expect(await checkCartomaillesAccess("token")).toEqual({ authorized: false, kind: "denied", reason: "missing_entitlement" });
    mocks.read.mockRejectedValue(new Error("sensitive database detail"));
    expect(await checkCartomaillesAccess("token")).toEqual({ authorized: false, kind: "unavailable", reason: "entitlement_read" });
  });
  it.each([new FirebaseIdTokenError(), new FirebaseAuthServiceError(), new Error("configuration secret")])("never reads rights after authentication failure (%s)", async (error) => {
    mocks.verify.mockRejectedValue(error);
    const result = await checkCartomaillesAccess("invalid-token");
    expect(result).toEqual(error instanceof FirebaseIdTokenError
      ? { authorized: false, kind: "unauthenticated", reason: "invalid_token" }
      : { authorized: false, kind: "unavailable", reason: "authentication" });
    expect(mocks.store).not.toHaveBeenCalled();
  });
  it.each([
    { uid: "someone-else" }, { environment: "test" }, { product: "other-product" },
    { validFrom: null }, { validUntil: null }, { validUntil: "future" },
    { validFrom: Timestamp.fromMillis(now + 2000) }, { subscriptionId: null },
    { validFrom: Timestamp.fromMillis(now + 1000) },
  ])("refuses malformed or foreign rights: %j", async (overrides) => {
    mocks.read.mockResolvedValue(entitlement(overrides));
    expect(await checkCartomaillesAccess("token")).toEqual({ authorized: false, kind: "denied", reason: "invalid_entitlement" });
  });
  it.each(["inactive", "suspended", "unknown"])("refuses status %s", async (status) => {
    mocks.read.mockResolvedValue(entitlement({ status }));
    expect(await checkCartomaillesAccess("token")).toEqual({ authorized: false, kind: "denied", reason: "inactive_entitlement" });
  });
  it.each([
    [now - 1000, now - 1, false], [now - 1000, now, false],
    [now + 1, now + 1000, false], [now, now + 1000, true],
  ])("checks inclusive start and exclusive end (%s, %s)", async (start, end, authorized) => {
    mocks.read.mockResolvedValue(entitlement({ validFrom: Timestamp.fromMillis(start), validUntil: Timestamp.fromMillis(end) }));
    expect((await checkCartomaillesAccess("token")).authorized).toBe(authorized);
  });
  it("checks server time after a slow Firestore read", async () => {
    mocks.read.mockImplementation(async () => { vi.setSystemTime(now + 1000); return entitlement(); });
    expect(await checkCartomaillesAccess("token")).toEqual({ authorized: false, kind: "denied", reason: "outside_validity" });
  });
});
