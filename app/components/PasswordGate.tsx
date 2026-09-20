"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { LogOut } from "lucide-react";
import { FirebaseError } from "firebase/app";
import { onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth, isFirebaseConfigured } from "../lib/firebase";

type PasswordGateProps = {
  children: React.ReactNode;
};

export default function PasswordGate({ children }: PasswordGateProps) {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const emailInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!auth) {
      return;
    }

    return onAuthStateChanged(
      auth,
      (user) => {
        setAuthorized(Boolean(user));
        setLoading(false);
      },
      () => {
        setAuthorized(false);
        setLoading(false);
        setError("Impossible de vérifier votre session. Rechargez la page pour réessayer.");
      }
    );
  }, []);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!auth || submitting) return;

    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      setPassword("");
    } catch (signInError) {
      const code = signInError instanceof FirebaseError ? signInError.code : "";
      setError(
        code === "auth/network-request-failed"
          ? "Connexion impossible. Vérifiez votre connexion Internet."
          : code === "auth/too-many-requests"
            ? "Trop de tentatives. Veuillez patienter avant de réessayer."
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
        <p className="text-[#5B2E4D]">Chargement de Cartomailles…</p>
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

  return (
    <main className="min-h-screen bg-[#FFF9F5] flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-xl border border-pink-100 p-10 text-[#5B2E4D]">
        <h1 className="text-3xl font-bold text-center">🧶 Cartomailles</h1>
        <p className="mt-3 text-center text-gray-600">
          Bienvenue dans la bêta privée de Cartomailles
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
              autoComplete="current-password"
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
              {submitting ? "Veuillez patienter…" : "Accéder à Cartomailles"}
            </button>
            <button
              type="button"
              onClick={handlePasswordReset}
              disabled={submitting}
              className="mt-4 w-full text-sm underline disabled:cursor-wait disabled:opacity-60"
            >
              Mot de passe oublié ?
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
