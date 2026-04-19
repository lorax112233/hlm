"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMessage(error.message);
      setIsLoading(false);
      return;
    }

    router.replace("/dashboard");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-app-bg px-6 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(30,87,95,0.2),transparent_35%)]" />
      <div className="relative w-full max-w-md rounded-3xl border border-black/10 bg-white/94 p-8 shadow-[0_24px_56px_rgba(0,0,0,0.12)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 rounded-t-3xl bg-app-primary/70" />
        <div className="mb-6">
          <p className="text-[10px] uppercase tracking-[0.3em] text-black/40">
            HLM
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-app-text">Sign in</h1>
          <p className="mt-2 text-sm text-black/50">
            Access your workspace.
          </p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.2em] text-black/40">
              Email
            </label>
            <input
              className="app-input w-full rounded-xl px-3 py-2.5 text-sm"
              placeholder="you@company.com"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.2em] text-black/40">
              Password
            </label>
            <input
              className="app-input w-full rounded-xl px-3 py-2.5 text-sm"
              placeholder="••••••••"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          {errorMessage ? (
            <p className="rounded-lg bg-app-danger/10 px-3 py-2 text-xs text-app-danger">
              {errorMessage}
            </p>
          ) : null}
          <button
            className="app-btn-primary w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-70"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <div className="mt-5 rounded-xl border border-black/5 bg-app-primary/5 px-4 py-3 text-xs text-black/60">
          Use your account.
        </div>
      </div>
    </div>
  );
}
