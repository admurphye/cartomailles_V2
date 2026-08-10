"use client";

import { FormEvent, useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

type PasswordGateProps = {
  children: React.ReactNode;
};

export default function PasswordGate({ children }: PasswordGateProps) {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supabase) {
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setAuthorized(Boolean(data.session));
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthorized(Boolean(session));
      setLoading(false);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;

    setSubmitting(true);
    setError("");

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) setError("E-mail ou mot de passe incorrect.");
    setSubmitting(false);
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
        <button
          type="button"
          onClick={() => supabase?.auth.signOut()}
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

        {!isSupabaseConfigured ? (
          <p className="mt-8 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
            Supabase n’est pas encore configuré. Ajoutez les variables d’environnement indiquées dans le README.
          </p>
        ) : (
          <form onSubmit={handleLogin} className="mt-8">
            <label htmlFor="email" className="text-sm font-semibold">Adresse e-mail</label>
            <input
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

            <button
              type="submit"
              disabled={submitting}
              className="mt-6 w-full rounded-xl bg-[#D98CA8] py-3 font-semibold text-white transition hover:bg-[#E8A4BD] disabled:cursor-wait disabled:opacity-60"
            >
              {submitting ? "Connexion…" : "Accéder à Cartomailles"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
