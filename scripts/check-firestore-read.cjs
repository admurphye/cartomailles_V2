// Standalone Node.js check. Importing this file does not contact Firebase.
async function checkFirestoreRead({
  env = process.env,
  loadSdk = async () => ({
    ...await import("firebase-admin/app"),
    ...await import("firebase-admin/firestore"),
  }),
  report = (message) => console.log(message),
  exit = (code) => process.exit(code),
} = {}) {
  let app;
  let db;
  let sdk;
  let expired = false;
  let cleanupPromise;

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
      if (env.FIRESTORE_EMULATOR_HOST) throw new Error();
      const projectId = env.FIREBASE_ADMIN_PROJECT_ID?.trim();
      const clientEmail = env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim();
      const privateKey = env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
      const publicProjectId = env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
      if (!projectId || !clientEmail || !privateKey || !publicProjectId || projectId !== publicProjectId) {
        throw new Error();
      }

      sdk = await loadSdk();
      if (expired) return 1;
      app = sdk.initializeApp({ projectId, credential: sdk.cert({ projectId, clientEmail, privateKey }) }, "firestore-read-check");
      db = sdk.getFirestore(app);
      // Missing document is a successful read. Never inspect or log its contents.
      await db.doc("diagnostics/connection-check").get();
      success = true;
    } catch {
      // Intentionally discard SDK errors: they may include credential details.
    } finally {
      try {
        await cleanup();
      } catch {
        success = false;
      }
    }
    if (expired) return 1;
    clearTimeout(timer);
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
