"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type AuthGateProps = {
  children: React.ReactNode;
};

export default function AuthGate({ children }: AuthGateProps) {
  const router = useRouter();
  // Avoid rendering protected pages until auth state is confirmed.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // Initial session check for hard refreshes or direct URL access.
    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (error || !data.session) {
        router.replace("/login");
        return;
      }

      setReady(true);
    };

    // Keep UI auth state in sync after sign-in/sign-out events.
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        router.replace("/login");
        return;
      }

      if (session) {
        setReady(true);
      }
    });

    checkSession();

    return () => {
      isMounted = false;
      // Prevent memory leaks by cleaning up the subscription.
      listener.subscription.unsubscribe();
    };
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app-bg text-sm text-black/50">
        Checking session...
      </div>
    );
  }

  return <>{children}</>;
}

