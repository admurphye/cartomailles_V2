"use client";
import { useEffect, useState } from "react";

type PasswordGateProps = {
  children: React.ReactNode;
};

export default function PasswordGate({
  children,
}: PasswordGateProps) {
  const [authorized, setAuthorized] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("cartomailles_authorized");

    if (saved === "true") {
      setAuthorized(true);
    }
  }, []);

  const PASSWORD = "Cartomailles2026";

  const handleLogin = () => {
    if (password === PASSWORD) {
      localStorage.setItem("cartomailles_authorized", "true");
      setAuthorized(true);
    } else {
      setError("Mot de passe incorrect.");
    }
  };

  if (authorized) {
    return <>{children}</>;
  }

  return (
    <main className="min-h-screen bg-[#FFF9F5] flex items-center justify-center px-6">

      <div className="w-full max-w-md rounded-3xl bg-white shadow-xl border border-pink-100 p-10">

        <h1 className="text-3xl font-bold text-center text-[#5B2E4D]">
          🧶 Cartomailles
        </h1>

        <p className="mt-3 text-center text-gray-600">
          Bienvenue dans la bêta privée de Cartomailles 🧶
        </p>

        <p className="mt-8 text-gray-600">
          Saisissez le mot de passe reçu par e-mail.
        </p>

        <input
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleLogin();
            }
          }}
          className="mt-4 w-full rounded-xl border border-pink-200 bg-white px-4 py-3 text-[#5B2E4D] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-300"
        />

        {error && (
          <p className="mt-3 text-red-500 text-sm">
            {error}
          </p>
        )}

        <button
          onClick={handleLogin}
          className="mt-6 w-full rounded-xl bg-[#D98CA8] hover:bg-[#E8A4BD] text-white font-semibold py-3 transition"
        >
          🚀 Accéder à Cartomailles
        </button>

      </div>

    </main>
  );
}