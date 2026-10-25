import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  apps: [] as { name: string }[],
  cert: vi.fn(),
  initializeApp: vi.fn(),
  verifyIdToken: vi.fn(),
  getFirestore: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("firebase-admin/app", () => ({
  getApps: () => mocks.apps,
  cert: mocks.cert,
  initializeApp: mocks.initializeApp,
}));
vi.mock("firebase-admin/auth", () => ({
  getAuth: () => ({ verifyIdToken: mocks.verifyIdToken }),
}));
vi.mock("firebase-admin/firestore", () => ({ getFirestore: mocks.getFirestore }));

import { FirebaseIdTokenError, getFirebaseAdminApp, getFirebaseAdminFirestore, verifyFirebaseIdToken } from "./firebaseAdmin";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.apps.length = 0;
  vi.stubEnv("FIREBASE_ADMIN_PROJECT_ID", "test-project");
  vi.stubEnv("FIREBASE_ADMIN_CLIENT_EMAIL", "admin@example.invalid");
  vi.stubEnv("FIREBASE_ADMIN_PRIVATE_KEY", "fake-key\\nsecond-line");
  vi.stubEnv("FIREBASE_AUTH_EMULATOR_HOST", "");
  mocks.cert.mockReturnValue("mock-credential");
  mocks.initializeApp.mockImplementation((_options, name: string) => {
    const app = { name };
    mocks.apps.push(app);
    return app;
  });
});

afterEach(() => vi.unstubAllEnvs());

describe("Firebase Admin configuration", () => {
  it("gets the default Firestore client using the reusable Admin app", () => {
    const client = {};
    mocks.getFirestore.mockReturnValue(client);
    expect(getFirebaseAdminFirestore()).toBe(client);
    expect(getFirebaseAdminFirestore()).toBe(client);
    expect(mocks.getFirestore).toHaveBeenCalledWith(getFirebaseAdminApp());
    expect(mocks.initializeApp).toHaveBeenCalledTimes(1);
  });
  it.each(["FIREBASE_ADMIN_PROJECT_ID", "FIREBASE_ADMIN_CLIENT_EMAIL", "FIREBASE_ADMIN_PRIVATE_KEY"])(
    "rejects missing %s before initializing", (name) => {
      vi.stubEnv(name, "   ");
      expect(getFirebaseAdminApp).toThrow("Firebase Admin requires");
      expect(mocks.initializeApp).not.toHaveBeenCalled();
    }
  );

  it.each(["fake-key\\nsecond-line", "fake-key\nsecond-line"])("accepts both newline formats", (key) => {
    vi.stubEnv("FIREBASE_ADMIN_PRIVATE_KEY", key);
    getFirebaseAdminApp();
    expect(mocks.cert).toHaveBeenCalledWith({
      projectId: "test-project", clientEmail: "admin@example.invalid", privateKey: "fake-key\nsecond-line",
    });
    expect(mocks.initializeApp).toHaveBeenCalledWith({ projectId: "test-project", credential: "mock-credential" }, "cartomailles-server");
  });

  it("reuses the named app after module reload and ignores unrelated apps", async () => {
    mocks.apps.push({ name: "unrelated" });
    const first = getFirebaseAdminApp();
    vi.resetModules();
    const reloaded = await import("./firebaseAdmin");
    expect(reloaded.getFirebaseAdminApp()).toBe(first);
    expect(mocks.initializeApp).toHaveBeenCalledTimes(1);
  });

  it("does not leak SDK credential errors", () => {
    mocks.cert.mockImplementation(() => { throw new Error("sensitive credential detail"); });
    expect(getFirebaseAdminApp).toThrow("Firebase Admin initialization failed. Check server credentials.");
  });

  it("refuses emulator authentication even with an existing app", () => {
    getFirebaseAdminApp();
    vi.stubEnv("FIREBASE_AUTH_EMULATOR_HOST", "localhost:9099");
    expect(getFirebaseAdminApp).toThrow("emulator is not supported");
  });
});

describe("Firebase ID token verification", () => {
  it("returns the verified UID and checks revocation", async () => {
    mocks.verifyIdToken.mockResolvedValue({ uid: "verified-user" });
    await expect(verifyFirebaseIdToken("test-token")).resolves.toBe("verified-user");
    expect(mocks.verifyIdToken).toHaveBeenCalledWith("test-token", true);
  });

  it.each(["", "   "])("rejects empty tokens without initialization", async (token) => {
    await expect(verifyFirebaseIdToken(token)).rejects.toBeInstanceOf(FirebaseIdTokenError);
    expect(mocks.initializeApp).not.toHaveBeenCalled();
  });

  it.each(["auth/argument-error", "auth/id-token-expired", "auth/id-token-revoked", "auth/user-disabled", "auth/invalid-id-token"])(
    "refuses SDK rejection %s", async (code) => {
      mocks.verifyIdToken.mockRejectedValue(Object.assign(new Error("private SDK detail"), { code }));
      await expect(verifyFirebaseIdToken("invalid-token")).rejects.toThrow("Invalid Firebase ID token.");
    }
  );

  it("rejects a decoded result without UID", async () => {
    mocks.verifyIdToken.mockResolvedValue({});
    await expect(verifyFirebaseIdToken("test-token")).rejects.toBeInstanceOf(FirebaseIdTokenError);
  });

  it("keeps missing configuration separate from invalid tokens", async () => {
    vi.stubEnv("FIREBASE_ADMIN_PROJECT_ID", "");
    await expect(verifyFirebaseIdToken("test-token")).rejects.toThrow("Firebase Admin requires");
    expect(mocks.verifyIdToken).not.toHaveBeenCalled();
  });
});
