import "server-only";

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

const APP_NAME = "cartomailles-server";

/** Reuses the Admin SDK client for the (default) database. No document I/O. */
export function getFirebaseAdminFirestore(): Firestore {
  return getFirestore(getFirebaseAdminApp());
}

// Lazy initialization: importing this module does not require deployment secrets.
export function getFirebaseAdminApp(): App {
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    throw new Error("Firebase Admin authentication emulator is not supported here.");
  }

  const existing = getApps().find((app) => app.name === APP_NAME);
  if (existing) return existing;

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin requires FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL and FIREBASE_ADMIN_PRIVATE_KEY."
    );
  }

  try {
    return initializeApp({
      projectId,
      credential: cert({ projectId, clientEmail, privateKey }),
    }, APP_NAME);
  } catch {
    // Do not expose credential contents through SDK error messages.
    throw new Error("Firebase Admin initialization failed. Check server credentials.");
  }
}

export class FirebaseIdTokenError extends Error {
  constructor() {
    super("Invalid Firebase ID token.");
    this.name = "FirebaseIdTokenError";
  }
}

/** Accepts the raw ID token, not an Authorization header. No subscription check. */
export async function verifyFirebaseIdToken(idToken: string): Promise<string> {
  if (typeof idToken !== "string" || !idToken.trim()) {
    throw new FirebaseIdTokenError();
  }

  // Configuration errors remain distinct from authentication failures.
  const auth = getAuth(getFirebaseAdminApp());
  try {
    // Also reject revoked tokens and disabled users.
    const decoded = await auth.verifyIdToken(idToken, true);
    if (!decoded.uid) throw new FirebaseIdTokenError();
    return decoded.uid;
  } catch {
    // Fail closed without returning SDK details or the submitted token.
    throw new FirebaseIdTokenError();
  }
}
