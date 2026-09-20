"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { FirebaseError } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { auth } from "@/app/lib/firebase";

export default function FirebaseTestPage() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const emailInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!auth) return;

    return onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
        setReady(true);
      },
      (sessionError) => {
        setError(sessionError.message);
      }
    );
  }, []);

  async function run(action: () => Promise<unknown>, successMessage: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
      setPassword("");
      setMessage(successMessage);
    } catch (actionError) {
      setError(
        actionError instanceof FirebaseError
          ? `${actionError.code} : ${actionError.message}`
          : "Une erreur est survenue. Réessayez."
      );
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth || busy) return;
    const firebaseAuth = auth;
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const creating = submitter instanceof HTMLButtonElement && submitter.value === "signup";

    void run(
      () => creating
        ? createUserWithEmailAndPassword(firebaseAuth, email.trim(), password)
        : signInWithEmailAndPassword(firebaseAuth, email.trim(), password),
      creating ? "Compte créé et connecté." : "Connexion réussie."
    );
  }

  function resetPassword() {
    if (!auth || busy || !emailInput.current?.reportValidity()) return;
    const firebaseAuth = auth;
    void run(
      () => sendPasswordResetEmail(firebaseAuth, email.trim()),
      "Demande envoyée. Si un compte correspond à cette adresse, consultez votre boîte mail et vos courriers indésirables."
    );
  }

  return (
    <main className="mx-auto w-full max-w-lg space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Test Firebase Authentication</h1>

      <section aria-label="Session" className="space-y-2 rounded border p-4">
        {!ready ? (
          <p>Vérification de la session…</p>
        ) : user ? (
          <>
            <p>Utilisateur connecté : {user.email ?? "E-mail non renseigné"}</p>
            <p className="break-all">UID : {user.uid}</p>
            <button
              type="button"
              disabled={busy}
              className="rounded border px-4 py-2 disabled:opacity-50"
              onClick={() => {
                const firebaseAuth = auth;
                if (firebaseAuth) void run(() => signOut(firebaseAuth), "Déconnexion réussie.");
              }}
            >
              Se déconnecter
            </button>
          </>
        ) : (
          <p>Aucun utilisateur connecté.</p>
        )}
      </section>

      <form onSubmit={submit}>
        <fieldset disabled={!ready || busy} className="space-y-4 disabled:opacity-50">
          <legend className="mb-4 font-medium">Compte e-mail / mot de passe</legend>
          <label className="block">
            Adresse e-mail
            <input
              ref={emailInput}
              type="email"
              name="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 block w-full rounded border p-2"
            />
          </label>
          <label className="block">
            Mot de passe
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 block w-full rounded border p-2"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="submit" value="signin" className="rounded border px-4 py-2">
              Se connecter
            </button>
            <button type="submit" value="signup" className="rounded border px-4 py-2">
              Créer un compte
            </button>
            <button type="button" onClick={resetPassword} className="rounded border px-4 py-2">
              Mot de passe oublié
            </button>
          </div>
        </fieldset>
      </form>

      <p role="status">{busy ? "Opération en cours…" : message}</p>
      {error && <p role="alert" className="text-red-700">{error}</p>}
    </main>
  );
}
