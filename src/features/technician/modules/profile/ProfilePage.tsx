"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type ProfileValues = {
  fullName: string;
  email: string;
  avatarUrl: string;
};

type MyStats = {
  active: number;
  resolved: number;
};

const emptyProfile: ProfileValues = { fullName: "", email: "", avatarUrl: "" };

export default function ProfilePage() {
  const router = useRouter();
  const [values, setValues] = useState<ProfileValues>(emptyProfile);
  const [myStats, setMyStats] = useState<MyStats>({ active: 0, resolved: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      const { data, error } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (error || !data.user) {
        router.replace("/login");
        return;
      }

      const metadata = data.user.user_metadata ?? {};
      const name = metadata.full_name || data.user.email || "";

      setValues({
        fullName: name,
        email: data.user.email ?? "",
        avatarUrl: metadata.avatar_url ?? "",
      });

      if (name) {
        const [activeResult, resolvedResult] = await Promise.all([
          supabase
            .from("maintenance_logs")
            .select("id", { count: "exact", head: true })
            .ilike("technician_name", name)
            .in("maintenance_status", ["Open", "In Progress"]),
          supabase
            .from("maintenance_logs")
            .select("id", { count: "exact", head: true })
            .ilike("technician_name", name)
            .eq("maintenance_status", "Resolved"),
        ]);

        if (!isMounted) return;
        setMyStats({
          active: activeResult.count ?? 0,
          resolved: resolvedResult.count ?? 0,
        });
      }

      setIsLoading(false);
    };

    void load();
    return () => { isMounted = false; };
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

  const initials = values.fullName
    ? values.fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "T";

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-app-warning/30 bg-white/90 p-6 shadow-sm shadow-black/5">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-app-warning/60" />
        <div className="flex flex-wrap items-center gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl border border-app-warning/20 bg-app-warning/10 text-lg font-semibold text-app-warning">
            {values.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt="Avatar" className="h-full w-full object-cover" src={values.avatarUrl} />
            ) : (
              initials
            )}
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-black/40">Technician Account</p>
            <h2 className="text-xl font-semibold text-app-text">{values.fullName || "No name set"}</h2>
            <p className="mt-0.5 text-sm text-black/50">{values.email}</p>
            <span className="mt-1 inline-block text-[11px] uppercase tracking-[0.2em] text-app-warning">
              Technician
            </span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-app-warning/20 bg-white/90 px-5 py-4 shadow-sm shadow-black/5">
          <p className="text-[10px] uppercase tracking-[0.25em] text-black/40">Active Jobs</p>
          <p className="mt-1 text-3xl font-semibold text-app-warning">{myStats.active}</p>
          <p className="mt-1 text-xs text-black/40">Open and in-progress work orders</p>
        </div>
        <div className="rounded-2xl border border-app-success/20 bg-white/90 px-5 py-4 shadow-sm shadow-black/5">
          <p className="text-[10px] uppercase tracking-[0.25em] text-black/40">Completed</p>
          <p className="mt-1 text-3xl font-semibold text-app-success">{myStats.resolved}</p>
          <p className="mt-1 text-xs text-black/40">Resolved maintenance jobs</p>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-black/8 bg-white/88 p-6 shadow-sm shadow-black/5">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-black/40">Account Details</p>
          <h3 className="text-lg font-semibold text-app-text">Your Information</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-black/8 bg-white/92 px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-black/40">Full Name</p>
            <p className="mt-1 text-sm font-medium text-app-text">{values.fullName || "-"}</p>
            <p className="mt-1 text-[10px] text-black/35">
              Must match the name your admin registered you under.
            </p>
          </div>
          <div className="rounded-xl border border-black/8 bg-white/92 px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-black/40">Email</p>
            <p className="mt-1 text-sm font-medium text-app-text">{values.email || "-"}</p>
          </div>
        </div>
        <button
          className="mt-2 rounded-xl border border-black/12 bg-white px-4 py-2.5 text-sm font-semibold text-black/60 transition hover:bg-black/[0.03]"
          type="button"
          onClick={handleSignOut}
        >
          Sign out
        </button>
      </section>
    </div>
  );
}
