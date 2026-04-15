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
    <div className="flex min-h-screen items-center justify-center bg-app-bg px-6">
      <div className="w-full max-w-md rounded-3xl border border-black/5 bg-white/90 p-8 shadow-lg shadow-black/5">
        <div className="mb-6">
          <p className="text-[10px] uppercase tracking-[0.3em] text-black/40">
            Welcome back
          </p>
          <h1 className="text-2xl font-semibold text-app-text">Sign in</h1>
          <p className="mt-2 text-sm text-black/50">
            Manage hardware, maintenance, and warranty workflows.
          </p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.2em] text-black/40">
              Email
            </label>
            <input
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-app-primary/15"
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
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-app-primary/15"
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
            className="w-full rounded-lg bg-app-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <div className="mt-5 rounded-xl border border-black/5 bg-app-primary/5 px-4 py-3 text-xs text-black/60">
          Use a Supabase Auth user created in your project.
        </div>
      </div>
    </div>
  );
}
