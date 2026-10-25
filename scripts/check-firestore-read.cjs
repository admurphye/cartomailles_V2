// Standalone Node.js check. Importing this file does not contact Firebase.
async function checkFirestoreRead({
  env = process.env,
  loadSdk = async () => ({
    ...await import("firebase-admin/app"),
    ...await import("firebase-admin/firestore"),
  }),
  report = (message) => console.log(message),
  diagnostic = (code) => console.log(`FIRESTORE_READ_CHECK_DIAG_${code}`),
  exit = (code) => process.exit(code),
} = {}) {
  let app;
  let db;
  let sdk;
  let expired = false;
  let cleanupPromise;
  let stage = "CONFIGURATION";
  let failure;

  function reportContext() {
    diagnostic(env.VERCEL_ENV === "production" ? "ENV_PRODUCTION" :
      env.VERCEL_ENV === "preview" ? "ENV_PREVIEW" :
      env.VERCEL_ENV === "development" ? "ENV_DEVELOPMENT" : "ENV_UNSPECIFIED_OR_UNKNOWN");
  }

  function cleanup() {
    cleanupPromise ??= (async () => {
      try {
        if (db) await db.terminate();
      } finally {
        if (app) await sdk.deleteApp(app);
      }
    })();
    return cleanupPromise;
  }

  let timer;
  const deadline = new Promise((resolve) => {
    timer = setTimeout(() => {
      expired = true;
      reportContext();
      diagnostic(`TIMEOUT_${stage}`);
      // Start best-effort cleanup, but do not let a stalled SDK exceed 20s.
      void cleanup().catch(() => {});
      report("FIRESTORE_READ_CHECK_FAILED");
      exit(1);
      resolve(1);
    }, 20_000);
  });

  const work = (async () => {
    let success = false;
    try {
      if (env.FIRESTORE_EMULATOR_HOST) {
        failure = "EMULATOR_FORBIDDEN";
        throw new Error();
      }
      const projectId = env.FIREBASE_ADMIN_PROJECT_ID?.trim();
      const clientEmail = env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim();
      const privateKey = env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
      const publicProjectId = env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
      const required = [
        [projectId, "MISSING_ADMIN_PROJECT_ID"],
        [clientEmail, "MISSING_ADMIN_CLIENT_EMAIL"],
        [privateKey, "MISSING_ADMIN_PRIVATE_KEY"],
        [publicProjectId, "MISSING_PUBLIC_PROJECT_ID"],
      ];
      failure = required.find(([value]) => !value)?.[1];
      if (failure) throw new Error();
      if (projectId !== publicProjectId) {
        failure = "PROJECT_ID_MISMATCH";
        throw new Error();
      }

      stage = "SDK_IMPORT";
      sdk = await loadSdk();
      if (expired) return 1;
      stage = "CREDENTIAL_PARSE";
      const credential = sdk.cert({ projectId, clientEmail, privateKey });
      stage = "APP_INITIALIZATION";
      app = sdk.initializeApp({ projectId, credential }, "firestore-read-check");
      stage = "FIRESTORE_INITIALIZATION";
      db = sdk.getFirestore(app);
      // Missing document is a successful read. Never inspect or log its contents.
      stage = "DOCUMENT_READ";
      await db.doc("diagnostics/connection-check").get();
      success = true;
    } catch (error) {
      // Only allowlisted categories; never print messages, stacks or arbitrary codes.
      const readCodes = new Map([
        [7, "READ_PERMISSION_DENIED"], [16, "READ_UNAUTHENTICATED"],
        [5, "READ_DATABASE_NOT_FOUND"], [14, "READ_UNAVAILABLE"], [4, "READ_DEADLINE_EXCEEDED"],
      ]);
      failure ??= stage === "DOCUMENT_READ" ? readCodes.get(error?.code) ?? "DOCUMENT_READ_FAILED" : `${stage}_FAILED`;
    } finally {
      stage = "CLEANUP";
      try {
        await cleanup();
      } catch {
        failure ??= "CLEANUP_FAILED";
        success = false;
      }
    }
    if (expired) return 1;
    clearTimeout(timer);
    if (!success) {
      reportContext();
      diagnostic(failure ?? "UNKNOWN_FAILURE");
    }
    report(success ? "FIRESTORE_READ_CHECK_OK" : "FIRESTORE_READ_CHECK_FAILED");
    return success ? 0 : 1;
  })();

  return Promise.race([work, deadline]);
}

module.exports = { checkFirestoreRead };

if (require.main === module) {
  checkFirestoreRead().then((code) => { process.exitCode = code; }).catch(() => {
    console.error("FIRESTORE_READ_CHECK_FAILED");
    process.exit(1);
  });
}
