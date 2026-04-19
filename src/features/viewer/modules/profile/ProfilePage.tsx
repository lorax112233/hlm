"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type ProfileValues = {
  fullName: string;
  email: string;
  avatarUrl: string;
};

const emptyProfile: ProfileValues = {
  fullName: "",
  email: "",
  avatarUrl: "",
};

export default function ProfilePage() {
  const router = useRouter();
  const [values, setValues] = useState<ProfileValues>(emptyProfile);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      const { data, error } = await supabase.auth.getUser();

      if (!isMounted) {
        return;
      }

      if (error || !data.user) {
        router.replace("/login");
        return;
      }

      const metadata = data.user.user_metadata ?? {};
      setValues({
        fullName: metadata.full_name ?? "",
        email: data.user.email ?? "",
        avatarUrl: metadata.avatar_url ?? "",
      });
      setIsLoading(false);
    };

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-black/10 bg-white/70 p-6 text-sm text-black/60">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <section className="rounded-3xl border border-app-warning/25 bg-white/88 p-6 shadow-sm shadow-black/5">
        <p className="text-[10px] uppercase tracking-[0.3em] text-black/40">Viewer</p>
        <h3 className="mt-2 text-xl font-semibold text-app-text">Profile Data</h3>
        <p className="mt-1 text-sm text-black/55">Read-only account details.</p>
      </section>

      <section className="space-y-4 rounded-2xl border border-black/8 bg-white/88 p-6 shadow-sm shadow-black/5">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 overflow-hidden rounded-2xl border border-black/10 bg-black/5">
            {values.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt="Profile"
                className="h-full w-full object-cover"
                src={values.avatarUrl}
              />
            ) : null}
          </div>
          <div>
            <p className="text-sm font-semibold text-app-text">{values.fullName || "No name set"}</p>
            <p className="text-sm text-black/60">{values.email}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-app-warning">Viewer</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-black/8 bg-white/92 px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-black/40">Full Name</p>
            <p className="mt-1 text-sm text-app-text">{values.fullName || "-"}</p>
          </div>
          <div className="rounded-xl border border-black/8 bg-white/92 px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-black/40">Email</p>
            <p className="mt-1 text-sm text-app-text">{values.email || "-"}</p>
          </div>
        </div>

        <button
          className="rounded-xl border border-black/12 bg-white px-4 py-2.5 text-sm font-semibold text-black/60"
          type="button"
          onClick={handleSignOut}
        >
          Sign out
        </button>
      </section>
    </div>
  );
}
