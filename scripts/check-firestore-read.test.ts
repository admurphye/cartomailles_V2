import { createRequire } from "node:module";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requireScript = createRequire(import.meta.url);
const { checkFirestoreRead } = requireScript("./check-firestore-read.cjs");

function setup() {
  const env: Record<string, string> = {
    FIREBASE_ADMIN_PROJECT_ID: "test-project",
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: "test-project",
    FIREBASE_ADMIN_CLIENT_EMAIL: "test@example.invalid",
    FIREBASE_ADMIN_PRIVATE_KEY: "fake-key\\nsecond-line",
  };
  const app = {};
  const get = vi.fn().mockResolvedValue({ exists: false });
  const db = { doc: vi.fn().mockReturnValue({ get }), terminate: vi.fn().mockResolvedValue(undefined) };
  const sdk = {
    cert: vi.fn().mockReturnValue({}), initializeApp: vi.fn().mockReturnValue(app),
    getFirestore: vi.fn().mockReturnValue(db), deleteApp: vi.fn().mockResolvedValue(undefined),
  };
  const options = { env, loadSdk: vi.fn().mockResolvedValue(sdk), report: vi.fn(), diagnostic: vi.fn(), exit: vi.fn() };
  return { options, sdk, db, get, app };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("standalone Firestore read check", () => {
  it.each([
    ["FIREBASE_ADMIN_PROJECT_ID", "MISSING_ADMIN_PROJECT_ID"],
    ["FIREBASE_ADMIN_CLIENT_EMAIL", "MISSING_ADMIN_CLIENT_EMAIL"],
    ["FIREBASE_ADMIN_PRIVATE_KEY", "MISSING_ADMIN_PRIVATE_KEY"],
    ["NEXT_PUBLIC_FIREBASE_PROJECT_ID", "MISSING_PUBLIC_PROJECT_ID"],
  ])("identifies missing configuration %s without values", async (name, code) => {
    const { options } = setup();
    options.env[name] = "";
    await checkFirestoreRead(options);
    expect(options.diagnostic.mock.calls).toEqual([["ENV_UNSPECIFIED_OR_UNKNOWN"], [code]]);
  });

  it.each(["production", "preview", "development", "sensitive-unexpected-value"])("reports only known environment labels: %s", async (environment) => {
    const { options } = setup();
    options.env.VERCEL_ENV = environment;
    options.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "different-secret-project";
    await checkFirestoreRead(options);
    expect(options.diagnostic.mock.calls).toEqual([
      [environment === "sensitive-unexpected-value" ? "ENV_UNSPECIFIED_OR_UNKNOWN" : `ENV_${environment.toUpperCase()}`],
      ["PROJECT_ID_MISMATCH"],
    ]);
  });

  it.each([
    [7, "READ_PERMISSION_DENIED"], [16, "READ_UNAUTHENTICATED"],
    [5, "READ_DATABASE_NOT_FOUND"], [14, "READ_UNAVAILABLE"], [4, "READ_DEADLINE_EXCEEDED"],
    ["secret-code", "DOCUMENT_READ_FAILED"],
  ])("classifies read failure %s without exposing SDK errors", async (code, expected) => {
    const { options, get } = setup();
    get.mockRejectedValue(Object.assign(new Error("secret-message"), { code }));
    await checkFirestoreRead(options);
    expect(options.diagnostic.mock.calls).toEqual([["ENV_UNSPECIFIED_OR_UNKNOWN"], [expected]]);
  });
  it.each([true, false])("only reads the fixed document, including exists=%s", async (exists) => {
    const { options, sdk, db, get, app } = setup();
    get.mockResolvedValue({ exists, data: () => { throw new Error("must not inspect data"); } });
    expect(await checkFirestoreRead(options)).toBe(0);
    expect(sdk.getFirestore).toHaveBeenCalledWith(app);
    expect(db.doc).toHaveBeenCalledExactlyOnceWith("diagnostics/connection-check");
    expect(get).toHaveBeenCalledExactlyOnceWith();
    expect(db.terminate).toHaveBeenCalledTimes(1);
    expect(sdk.deleteApp).toHaveBeenCalledWith(app);
    expect(options.report).toHaveBeenCalledExactlyOnceWith("FIRESTORE_READ_CHECK_OK");
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["fake-key\nsecond-line", "fake-key\\nsecond-line"])("normalizes key newlines", async (key) => {
    const { options, sdk } = setup();
    options.env.FIREBASE_ADMIN_PRIVATE_KEY = key;
    await checkFirestoreRead(options);
    expect(sdk.cert).toHaveBeenCalledWith({ projectId: "test-project", clientEmail: "test@example.invalid", privateKey: "fake-key\nsecond-line" });
  });

  it.each(["FIREBASE_ADMIN_PROJECT_ID", "NEXT_PUBLIC_FIREBASE_PROJECT_ID", "FIREBASE_ADMIN_CLIENT_EMAIL", "FIREBASE_ADMIN_PRIVATE_KEY"])("rejects missing %s", async (name) => {
    const { options } = setup();
    options.env[name] = " ";
    expect(await checkFirestoreRead(options)).toBe(1);
    expect(options.loadSdk).not.toHaveBeenCalled();
    expect(options.report).toHaveBeenCalledExactlyOnceWith("FIRESTORE_READ_CHECK_FAILED");
  });

  it.each([ ["NEXT_PUBLIC_FIREBASE_PROJECT_ID", "other-project"], ["FIRESTORE_EMULATOR_HOST", "localhost:8080"] ])("rejects unsafe configuration %s", async (name, value) => {
    const { options } = setup();
    options.env[name] = value;
    expect(await checkFirestoreRead(options)).toBe(1);
    expect(options.loadSdk).not.toHaveBeenCalled();
  });

  it.each(["load", "cert", "app", "firestore", "read", "terminate", "delete"])("sanitizes %s failure and cleans acquired resources", async (stage) => {
    const { options, sdk, db, get } = setup();
    const error = new Error("private-key-and-secret-details");
    if (stage === "load") options.loadSdk.mockRejectedValue(error);
    if (stage === "cert") sdk.cert.mockImplementation(() => { throw error; });
    if (stage === "app") sdk.initializeApp.mockImplementation(() => { throw error; });
    if (stage === "firestore") sdk.getFirestore.mockImplementation(() => { throw error; });
    if (stage === "read") get.mockRejectedValue(error);
    if (stage === "terminate") db.terminate.mockRejectedValue(error);
    if (stage === "delete") sdk.deleteApp.mockRejectedValue(error);
    expect(await checkFirestoreRead(options)).toBe(1);
    expect(options.report).toHaveBeenCalledExactlyOnceWith("FIRESTORE_READ_CHECK_FAILED");
    const expected = { load: "SDK_IMPORT_FAILED", cert: "CREDENTIAL_PARSE_FAILED", app: "APP_INITIALIZATION_FAILED", firestore: "FIRESTORE_INITIALIZATION_FAILED", read: "DOCUMENT_READ_FAILED", terminate: "CLEANUP_FAILED", delete: "CLEANUP_FAILED" }[stage];
    expect(options.diagnostic.mock.calls).toEqual([["ENV_UNSPECIFIED_OR_UNKNOWN"], [expected]]);
    if (!["load", "cert", "app"].includes(stage)) expect(sdk.deleteApp).toHaveBeenCalledTimes(1);
    if (["read", "terminate", "delete"].includes(stage)) expect(db.terminate).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["load", "read", "cleanup"])("enforces 20 seconds even if %s stalls", async (stage) => {
    const { options, db, get } = setup();
    const stalled = new Promise(() => {});
    if (stage === "load") options.loadSdk.mockReturnValue(stalled);
    if (stage === "read") get.mockReturnValue(stalled);
    if (stage === "cleanup") db.terminate.mockReturnValue(stalled);
    const result = checkFirestoreRead(options);
    await vi.advanceTimersByTimeAsync(19_999);
    expect(options.report).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(await result).toBe(1);
    expect(options.report).toHaveBeenCalledExactlyOnceWith("FIRESTORE_READ_CHECK_FAILED");
    expect(options.exit).toHaveBeenCalledWith(1);
    expect(options.diagnostic).toHaveBeenCalledWith(`TIMEOUT_${stage === "load" ? "SDK_IMPORT" : stage === "read" ? "DOCUMENT_READ" : "CLEANUP"}`);
    if (stage !== "load") expect(db.terminate).toHaveBeenCalledTimes(1);
  });
});
