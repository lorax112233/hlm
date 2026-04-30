"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type ProfileValues = {
  fullName: string;
  email: string;
  avatarUrl: string;
};

type SystemStats = {
  assets: number;
  openJobs: number;
  technicians: number;
};

const emptyProfile: ProfileValues = { fullName: "", email: "", avatarUrl: "" };
const emptyStats: SystemStats = { assets: 0, openJobs: 0, technicians: 0 };

export default function ProfilePage() {
  const router = useRouter();
  const [values, setValues] = useState<ProfileValues>(emptyProfile);
  const [stats, setStats] = useState<SystemStats>(emptyStats);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      const [userResult, assetsResult, jobsResult, techsResult] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("hardware_assets").select("id", { count: "exact", head: true }),
        supabase
          .from("maintenance_logs")
          .select("id", { count: "exact", head: true })
          .in("maintenance_status", ["Open", "In Progress"]),
        supabase.from("technicians").select("id", { count: "exact", head: true }),
      ]);

      if (!isMounted) return;

      if (userResult.error || !userResult.data.user) {
        router.replace("/login");
        return;
      }

      const metadata = userResult.data.user.user_metadata ?? {};
      setValues({
        fullName: metadata.full_name ?? "",
        email: userResult.data.user.email ?? "",
        avatarUrl: metadata.avatar_url ?? "",
      });

      setStats({
        assets: assetsResult.count ?? 0,
        openJobs: jobsResult.count ?? 0,
        technicians: techsResult.count ?? 0,
      });

      setIsLoading(false);
    };

    void load();
    return () => { isMounted = false; };
  }, [router]);

  const handleChange = (key: keyof ProfileValues, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const { data } = await supabase.auth.getUser();
    const currentEmail = data.user?.email ?? "";

    const { error } = await supabase.auth.updateUser({
      email: values.email !== currentEmail ? values.email : undefined,
      data: {
        full_name: values.fullName,
        avatar_url: values.avatarUrl,
      },
    });

    if (error) {
      setErrorMessage(error.message);
      setIsSaving(false);
      return;
    }

    setSuccessMessage("Profile updated.");
    setIsSaving(false);
  };

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
    : "A";

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-black/5 bg-white/90 p-6 shadow-sm shadow-black/5">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-app-primary/70" />
        <div className="flex flex-wrap items-center gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl border border-black/10 bg-app-primary/10 text-lg font-semibold text-app-primary">
            {values.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt="Avatar" className="h-full w-full object-cover" src={values.avatarUrl} />
            ) : (
              initials
            )}
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-black/40">Admin Account</p>
            <h2 className="text-xl font-semibold text-app-text">{values.fullName || "No name set"}</h2>
            <p className="mt-0.5 text-sm text-black/50">{values.email}</p>
            <span className="mt-1 inline-block text-[11px] uppercase tracking-[0.2em] text-app-primary">
              Administrator
            </span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-black/5 bg-white/90 px-5 py-4 shadow-sm shadow-black/5">
          <p className="text-[10px] uppercase tracking-[0.25em] text-black/40">Total Assets</p>
          <p className="mt-1 text-3xl font-semibold text-app-text">{stats.assets}</p>
          <p className="mt-1 text-xs text-black/40">Hardware in system</p>
        </div>
        <div className="rounded-2xl border border-app-warning/20 bg-white/90 px-5 py-4 shadow-sm shadow-black/5">
          <p className="text-[10px] uppercase tracking-[0.25em] text-black/40">Open Jobs</p>
          <p className="mt-1 text-3xl font-semibold text-app-warning">{stats.openJobs}</p>
          <p className="mt-1 text-xs text-black/40">Active maintenance work orders</p>
        </div>
        <div className="rounded-2xl border border-app-primary/15 bg-white/90 px-5 py-4 shadow-sm shadow-black/5">
          <p className="text-[10px] uppercase tracking-[0.25em] text-black/40">Technicians</p>
          <p className="mt-1 text-3xl font-semibold text-app-primary">{stats.technicians}</p>
          <p className="mt-1 text-xs text-black/40">Registered in system</p>
        </div>
      </section>

      <form
        className="space-y-4 rounded-2xl border border-black/5 bg-white p-6 shadow-sm"
        onSubmit={handleSave}
      >
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-black/40">Account</p>
          <h3 className="text-lg font-semibold text-app-text">Edit Profile</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <label className="text-xs uppercase tracking-[0.2em] text-black/40">Full Name</label>
            <input
              className="rounded-lg border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-app-primary/15"
              type="text"
              placeholder="Your full name"
              value={values.fullName}
              onChange={(e) => handleChange("fullName", e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-xs uppercase tracking-[0.2em] text-black/40">Email</label>
            <input
              className="rounded-lg border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-app-primary/15"
              type="email"
              value={values.email}
              onChange={(e) => handleChange("email", e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <label className="text-xs uppercase tracking-[0.2em] text-black/40">Avatar URL <span className="normal-case text-black/30">(optional)</span></label>
            <input
              className="rounded-lg border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-app-primary/15"
              placeholder="https://..."
              type="url"
              value={values.avatarUrl}
              onChange={(e) => handleChange("avatarUrl", e.target.value)}
            />
          </div>
        </div>
        {errorMessage ? (
          <p className="rounded-lg bg-app-danger/10 px-3 py-2 text-xs text-app-danger">{errorMessage}</p>
        ) : null}
        {successMessage ? (
          <p className="rounded-lg bg-app-success/10 px-3 py-2 text-xs text-app-success">{successMessage}</p>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <button
            className="rounded-lg bg-app-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-app-primary/90 disabled:opacity-70"
            type="submit"
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
          <button
            className="rounded-lg border border-black/10 px-4 py-2 text-sm font-semibold text-black/60 transition hover:bg-black/[0.03]"
            type="button"
            onClick={handleSignOut}
          >
            Sign out
          </button>
        </div>
      </form>
    </div>
  );
}
