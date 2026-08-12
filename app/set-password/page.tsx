"use client";

import { FormEvent, useEffect, useState } from "react";
import { LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

export default function SetPasswordPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(isSupabaseConfigured);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const client = supabase;
    let active = true;

    const checkSession = async () => {
      const { data, error: sessionError } = await client.auth.getSession();

      if (!active) return;

      setHasSession(Boolean(data.session));
      setCheckingSession(false);

      if (sessionError) {
        setError("Impossible de vérifier votre invitation. Veuillez réessayer.");
      }
    };

    void checkSession();

    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      if (!active) return;

      setHasSession(Boolean(session));
      setCheckingSession(false);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (password !== confirmation) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    if (!supabase || !hasSession) {
      setError("Votre lien d’invitation est invalide ou a expiré.");
      return;
    }

    setSubmitting(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message || "Impossible de créer votre mot de passe.");
      setSubmitting(false);
      return;
    }

    router.replace("/");
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-[#FFF9F5] flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md rounded-3xl border border-pink-100 bg-white p-10 text-[#5B2E4D] shadow-xl">
        <div className="flex items-center justify-center gap-3">
          <LockKeyhole className="text-[#D98CA8]" size={30} aria-hidden="true" />
          <h1 className="text-3xl font-bold">Cartomailles</h1>
        </div>

        <h2 className="mt-6 text-center text-xl font-semibold">
          Créez votre mot de passe
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Choisissez le mot de passe qui vous permettra d’accéder à la bêta privée.
        </p>

        {checkingSession ? (
          <p className="mt-8 text-center text-sm text-gray-600">
            Vérification de votre invitation…
          </p>
        ) : !isSupabaseConfigured ? (
          <p className="mt-8 rounded-xl bg-amber-50 p-4 text-sm text-amber-800" role="alert">
            Supabase n’est pas configuré sur cette version de Cartomailles.
          </p>
        ) : !hasSession ? (
          <p className="mt-8 rounded-xl bg-red-50 p-4 text-sm text-red-700" role="alert">
            Ce lien d’invitation est invalide ou a expiré. Demandez une nouvelle invitation.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8">
            <label htmlFor="password" className="text-sm font-semibold">
              Nouveau mot de passe
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-xl border border-pink-200 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-300"
            />

            <label htmlFor="password-confirmation" className="mt-5 block text-sm font-semibold">
              Confirmer le mot de passe
            </label>
            <input
              id="password-confirmation"
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              className="mt-2 w-full rounded-xl border border-pink-200 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-300"
            />

            {error && (
              <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-6 w-full rounded-xl bg-[#D98CA8] py-3 font-semibold text-white transition hover:bg-[#E8A4BD] disabled:cursor-wait disabled:opacity-60"
            >
              {submitting ? "Création…" : "Créer mon mot de passe"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
