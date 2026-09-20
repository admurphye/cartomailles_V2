"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import type { Analytics } from "firebase/analytics";

// Copy these values from the Firebase console's web app configuration into
// .env.local and Vercel. Keep the existing Supabase environment variables.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Object.values(firebaseConfig).every(Boolean);

// Auth is browser-only and remains inactive until configuration is supplied.
// Reuse the default app during Next.js hot reloads.
export const app =
  typeof window !== "undefined" && isFirebaseConfigured
    ? (getApps().some((app) => app.name === "[DEFAULT]")
          ? getApp()
          : initializeApp({
              ...firebaseConfig,
              storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
              messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
              measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
            }))
    : null;

export const auth: Auth | null = app ? getAuth(app) : null;

let analyticsPromise: Promise<Analytics | null> | undefined;

export function initializeAnalytics(): Promise<Analytics | null> {
  const firebaseApp = app;
  if (!firebaseApp || !process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID) {
    return Promise.resolve(null);
  }

  analyticsPromise ??= import("firebase/analytics")
    .then(async ({ getAnalytics, isSupported }) =>
      (await isSupported()) ? getAnalytics(firebaseApp) : null
    )
    .catch((error: unknown) => {
      console.warn("Firebase Analytics initialization failed:", error);
      return null;
    });

  return analyticsPromise;
}
