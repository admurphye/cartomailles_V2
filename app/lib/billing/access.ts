import "server-only";

import { Timestamp } from "firebase-admin/firestore";
import { FirebaseIdTokenError, verifyFirebaseIdToken } from "../firebaseAdmin";
import { createServerFirestoreStore } from "../firestore/store";

export type AccessResult =
  | { authorized: true; uid: string; validUntil: Timestamp }
  | { authorized: false; kind: "unauthenticated"; reason: "invalid_token" }
  | { authorized: false; kind: "denied"; reason: "missing_entitlement" | "invalid_entitlement" | "inactive_entitlement" | "outside_validity" }
  | { authorized: false; kind: "unavailable"; reason: "configuration" | "authentication" | "entitlement_read" };

/** Raw Firebase ID token only. No UID, clock or environment supplied by a browser.
 * Read-only and deliberately not connected to the UI or any public route.
 * STRIPE_ENVIRONMENT must be explicitly configured on the server (test or live).
 */
export async function checkCartomaillesAccess(idToken: string): Promise<AccessResult> {
  const environment = process.env.STRIPE_ENVIRONMENT;
  if (environment !== "test" && environment !== "live") {
    return { authorized: false, kind: "unavailable", reason: "configuration" };
  }

  let uid: string;
  try {
    uid = await verifyFirebaseIdToken(idToken);
  } catch (error) {
    return error instanceof FirebaseIdTokenError
      ? { authorized: false, kind: "unauthenticated", reason: "invalid_token" }
      : { authorized: false, kind: "unavailable", reason: "authentication" };
  }

  try {
    const entitlement = await createServerFirestoreStore(environment).read("entitlements", uid);
    if (!entitlement) return { authorized: false, kind: "denied", reason: "missing_entitlement" };
    // Defense in depth: the store also validates ownership, schema and environment.
    if (entitlement.uid !== uid || entitlement.environment !== environment ||
        entitlement.product !== "cartomailles") {
      return { authorized: false, kind: "denied", reason: "invalid_entitlement" };
    }
    if (entitlement.status !== "active") {
      return { authorized: false, kind: "denied", reason: "inactive_entitlement" };
    }
    const { validFrom, validUntil, subscriptionId } = entitlement;
    if (!(validFrom instanceof Timestamp) || !(validUntil instanceof Timestamp) ||
        !subscriptionId || validFrom.toMillis() >= validUntil.toMillis()) {
      return { authorized: false, kind: "denied", reason: "invalid_entitlement" };
    }
    // Sample after the database read so slow reads cannot authorize expired access.
    const now = Date.now();
    if (now < validFrom.toMillis() || now >= validUntil.toMillis()) {
      return { authorized: false, kind: "denied", reason: "outside_validity" };
    }
    return { authorized: true, uid, validUntil };
  } catch {
    // Includes corrupt stored records: never report these as a missing subscription.
    return { authorized: false, kind: "unavailable", reason: "entitlement_read" };
  }
}
