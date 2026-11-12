"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { LogOut } from "lucide-react";
import { FirebaseError } from "firebase/app";
import { createUserWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import { auth, isFirebaseConfigured } from "../lib/firebase";
import { navigateToCheckout } from "../lib/checkoutNavigation";

type PasswordGateProps = {
  children: React.ReactNode;
};

export default function PasswordGate({ children }: PasswordGateProps) {
  const [authorized, setAuthorized] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [accessError, setAccessError] = useState("");
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const emailInput = useRef<HTMLInputElement>(null);
  const refreshAccess = useRef<() => void>(() => {});
  const sessionUser = useRef<User | null>(null);
  const checkoutRequest = useRef<AbortController | null>(null);
  const [preparingCheckout, setPreparingCheckout] = useState(false);

  useEffect(() => {
    if (!auth) {
      return;
    }

    let generation = 0;
    let currentUser: User | null = null;
    let controller: AbortController | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let expiryTimer: ReturnType<typeof setTimeout> | undefined;
    let requestTimer: ReturnType<typeof setTimeout> | undefined;
    let allowedUntil = 0;

    async function checkAccess(user: User) {
      const requestGeneration = ++generation;
      controller?.abort();
      clearTimeout(timer); clearTimeout(requestTimer);
      const requestController = new AbortController();
      controller = requestController;
      const signal = requestController.signal;
      requestTimer = setTimeout(() => requestController.abort(), 10_000);
      // Also bounds a stalled getIdToken(), which has no abort parameter.
      const timeout = requestTimer;
      const isCurrent = () => requestGeneration === generation && currentUser === user;
      signal.addEventListener("abort", () => {
        if (!isCurrent()) return;
        setAuthorized(false); setLoading(false);
        setAccessError("La vérification de votre abonnement est indisponible. Veuillez réessayer.");
      }, { once: true });
      try {
        const token = await user.getIdToken();
        if (!isCurrent() || signal.aborted) return;
        const response = await fetch("/api/billing/access", {
          headers: { Authorization: `Bearer ${token}` }, cache: "no-store", credentials: "omit", signal,
        });
        const result = await response.json();
        if (!isCurrent() || signal.aborted) return;
        if (response.status === 401) {
          clearTimeout(expiryTimer);
          allowedUntil = 0; setAuthorized(false);
          setAccessError("Votre session a expiré ou a été révoquée. Déconnectez-vous puis reconnectez-vous.");
        } else if (response.status === 403 && result.authorized === false && result.status === "subscription_required") {
          clearTimeout(expiryTimer);
          allowedUntil = 0; setAuthorized(false); setAccessError("");
        } else if (response.ok && result.authorized === true && Number.isSafeInteger(result.validUntil) && result.validUntil > Date.now()) {
          allowedUntil = result.validUntil; setAuthorized(true); setAccessError("");
          clearTimeout(expiryTimer);
          expiryTimer = setTimeout(() => {
            if (Date.now() >= allowedUntil) { setAuthorized(false); setLoading(true); }
            void checkAccess(user);
          }, Math.min(2_147_483_647, Math.max(0, allowedUntil - Date.now())));
          timer = setTimeout(() => { void checkAccess(user); }, 5 * 60_000);
        } else {
          throw new Error("Access unavailable");
        }
      } catch {
        if (!isCurrent()) return;
        clearTimeout(expiryTimer); allowedUntil = 0; setAuthorized(false);
        setAccessError("Impossible de vérifier votre abonnement. Réessayez ou reconnectez-vous.");
      } finally {
        clearTimeout(timeout);
        if (isCurrent()) setLoading(false);
      }
    }
    refreshAccess.current = () => {
      if (currentUser) { setAccessError(""); setLoading(true); void checkAccess(currentUser); }
    };
    const onFocus = () => {
      if (!currentUser) return;
      if (Date.now() >= allowedUntil) { setAuthorized(false); setLoading(true); }
      void checkAccess(currentUser);
    };
    window.addEventListener("focus", onFocus);
    const onPageShow = () => {
      checkoutRequest.current?.abort(); checkoutRequest.current = null;
      setPreparingCheckout(false);
      onFocus();
    };
    window.addEventListener("pageshow", onPageShow);
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        checkoutRequest.current?.abort(); checkoutRequest.current = null;
        sessionUser.current = user; setPreparingCheckout(false);
        ++generation; controller?.abort(); clearTimeout(timer); clearTimeout(expiryTimer); clearTimeout(requestTimer);
        currentUser = user; allowedUntil = 0;
        setAuthorized(false); setSignedIn(Boolean(user)); setError(""); setMessage(""); setAccessError("");
        setLoading(Boolean(user));
        if (user) void checkAccess(user);
      },
      () => {
        sessionUser.current = null; checkoutRequest.current?.abort(); checkoutRequest.current = null;
        setPreparingCheckout(false);
        ++generation; currentUser = null; controller?.abort(); clearTimeout(timer); clearTimeout(expiryTimer); clearTimeout(requestTimer);
        setAuthorized(false); setSignedIn(false);
        setLoading(false);
        setError("Impossible de vérifier votre session. Rechargez la page pour réessayer.");
      }
    );
    return () => {
      sessionUser.current = null; checkoutRequest.current?.abort(); checkoutRequest.current = null;
      ++generation; currentUser = null; controller?.abort(); clearTimeout(timer); clearTimeout(expiryTimer); clearTimeout(requestTimer);
      window.removeEventListener("focus", onFocus); refreshAccess.current = () => {}; unsubscribe();
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  const handleSubscribe = async () => {
    const user = sessionUser.current;
    if (!user || authorized || loading || accessError || submitting || checkoutRequest.current) return;
    const controller = new AbortController();
    checkoutRequest.current = controller;
    setPreparingCheckout(true); setError("");
    const isCurrent = () => sessionUser.current === user && checkoutRequest.current === controller;
    const timeout = setTimeout(() => {
      controller.abort();
      if (isCurrent()) {
        checkoutRequest.current = null; setPreparingCheckout(false);
        setError("La préparation du paiement prend trop de temps. Veuillez réessayer.");
      }
    }, 30_000);
    let redirected = false;
    try {
      const token = await user.getIdToken();
      if (!isCurrent() || controller.signal.aborted) return;
      const response = await fetch("/api/stripe/checkout", {
        method: "POST", headers: { Authorization: `Bearer ${token}` },
        cache: "no-store", credentials: "omit", signal: controller.signal,
      });
      if (!isCurrent() || controller.signal.aborted) return;
      if (!response.ok) {
        setError(response.status === 401
          ? "Votre session a expiré. Déconnectez-vous puis reconnectez-vous."
          : response.status === 409
            ? "Cette session de paiement ne peut pas être reprise. Réessayez ou contactez l’assistance."
            : "Impossible de préparer le paiement. Veuillez réessayer dans quelques instants.");
        return;
      }
      const result = await response.json();
      if (!isCurrent() || controller.signal.aborted) return;
      const url = new URL(result.url);
      if (typeof result.url !== "string" || url.origin !== "https://checkout.stripe.com" || url.username || url.password) {
        throw new Error("Invalid Checkout URL");
      }
      navigateToCheckout(url.href);
      redirected = true;
    } catch {
      if (isCurrent() && !controller.signal.aborted) setError("Impossible de préparer le paiement. Veuillez réessayer dans quelques instants.");
    } finally {
      clearTimeout(timeout);
      if (isCurrent() && !redirected) { checkoutRequest.current = null; setPreparingCheckout(false); }
    }
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!auth || submitting) return;

    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      if (creatingAccount) await createUserWithEmailAndPassword(auth, email.trim(), password);
      else await signInWithEmailAndPassword(auth, email.trim(), password);
      setPassword("");
    } catch (signInError) {
      const code = signInError instanceof FirebaseError ? signInError.code : "";
      setError(
        code === "auth/network-request-failed"
          ? "Connexion impossible. Vérifiez votre connexion Internet."
          : code === "auth/too-many-requests"
            ? "Trop de tentatives. Veuillez patienter avant de réessayer."
            : creatingAccount
              ? code === "auth/weak-password" || code === "auth/password-does-not-meet-requirements"
                ? "Choisissez un mot de passe plus robuste, conforme aux exigences du service."
                : "Création du compte impossible. Réessayez ou connectez-vous si vous avez déjà un compte."
              : "Connexion impossible. Vérifiez votre e-mail et votre mot de passe."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!auth || submitting || !emailInput.current?.reportValidity()) return;
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setMessage("Si un compte correspond à cette adresse, vous recevrez un e-mail de réinitialisation. Consultez aussi vos courriers indésirables.");
    } catch {
      setError("Impossible d’envoyer l’e-mail de réinitialisation. Vérifiez l’adresse et réessayez dans quelques instants.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    if (!auth || submitting) return;
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      await signOut(auth);
      setAuthorized(false);
      setPassword("");
    } catch {
      setError("La déconnexion a échoué. Veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FFF9F5] flex items-center justify-center">
        <p role="status" className="text-[#5B2E4D]">Chargement de Cartomailles…</p>
      </main>
    );
  }

  if (authorized) {
    return (
      <>
        {children}
        {error && <p role="alert" className="fixed right-4 bottom-16 z-50 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button
          type="button"
          onClick={handleLogout}
          disabled={submitting}
          className="fixed right-4 bottom-4 z-50 flex items-center gap-2 rounded-xl border border-white/15 bg-[#302A34] px-4 py-2 text-sm text-white shadow-lg transition hover:bg-[#423A47]"
          title="Se déconnecter"
        >
          <LogOut size={16} />
          Déconnexion
        </button>
      </>
    );
  }

  if (signedIn) {
    return (
      <main className="min-h-screen bg-[#FFF9F5] flex items-center justify-center px-6">
        <div className="w-full max-w-md rounded-3xl bg-white shadow-xl border border-pink-100 p-10 text-[#5B2E4D]">
          <h1 className="text-2xl font-bold">{accessError ? "Vérification indisponible" : "Un abonnement est nécessaire"}</h1>
          {accessError ? <p role="alert" className="mt-4">{accessError}</p> : <>
            <p className="mt-4">Votre compte est connecté. Un abonnement payé et en cours de validité est nécessaire pour accéder à Cartomailles.</p>
            <button type="button" onClick={handleSubscribe} disabled={preparingCheckout || submitting} className="mt-6 w-full rounded-xl bg-[#D98CA8] py-3 text-white disabled:opacity-60">{preparingCheckout ? "Préparation du paiement…" : "S’abonner"}</button>
            {preparingCheckout && <p role="status" className="mt-3">Préparation de votre session Stripe test…</p>}
          </>}
          {error && <p role="alert" className="mt-4">{error}</p>}
          <button type="button" disabled={preparingCheckout} onClick={() => refreshAccess.current()} className="mt-4 w-full underline">Vérifier à nouveau</button>
          <button type="button" onClick={handleLogout} disabled={submitting || preparingCheckout} className="mt-4 w-full underline">Déconnexion</button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FFF9F5] flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-xl border border-pink-100 p-10 text-[#5B2E4D]">
        <h1 className="text-3xl font-bold text-center">🧶 Cartomailles</h1>
        <p className="mt-3 text-center text-gray-600">
          {creatingAccount ? "Créer votre compte Cartomailles" : "Connectez-vous à Cartomailles"}
        </p>

        {!isFirebaseConfigured ? (
          <p className="mt-8 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
            La connexion est temporairement indisponible. Veuillez réessayer plus tard.
          </p>
        ) : (
          <form onSubmit={handleLogin} className="mt-8">
            <label htmlFor="email" className="text-sm font-semibold">Adresse e-mail</label>
            <input
              ref={emailInput}
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-xl border border-pink-200 bg-white px-4 py-3 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-300"
              placeholder="vous@exemple.fr"
            />

            <label htmlFor="password" className="mt-5 block text-sm font-semibold">Mot de passe</label>
            <input
              id="password"
              type="password"
              autoComplete={creatingAccount ? "new-password" : "current-password"}
              minLength={creatingAccount ? 6 : undefined}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-xl border border-pink-200 bg-white px-4 py-3 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-300"
            />

            {error && <p className="mt-3 text-sm text-red-600" role="alert">{error}</p>}
            {message && <p className="mt-3 text-sm text-gray-600" role="status">{message}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="mt-6 w-full rounded-xl bg-[#D98CA8] py-3 font-semibold text-white transition hover:bg-[#E8A4BD] disabled:cursor-wait disabled:opacity-60"
            >
              {submitting ? "Veuillez patienter…" : creatingAccount ? "Créer mon compte" : "Se connecter"}
            </button>
            {!creatingAccount && <button
              type="button"
              onClick={handlePasswordReset}
              disabled={submitting}
              className="mt-4 w-full text-sm underline disabled:cursor-wait disabled:opacity-60"
            >
              Mot de passe oublié ?
            </button>}
            <button type="button" disabled={submitting} className="mt-4 w-full text-sm underline"
              onClick={() => { setCreatingAccount(!creatingAccount); setPassword(""); setError(""); setMessage(""); }}>
              {creatingAccount ? "J’ai déjà un compte" : "Créer un compte"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
