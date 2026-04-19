"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { formatRole } from "@/lib/roles";

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
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const role: "admin" | "viewer" = "admin";

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

    loadProfile();

    return () => {
      isMounted = false;
    };
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

  if (role !== "admin") {
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
              <p className="text-sm font-semibold text-app-text">
                {values.fullName || "No name set"}
              </p>
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

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <section className="rounded-3xl border border-black/5 bg-white/90 p-6 shadow-sm shadow-black/5">
        <p className="text-[10px] uppercase tracking-[0.3em] text-black/40">
          Account
        </p>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-app-text">Profile</h3>
            <p className="mt-1 text-sm text-black/50">
              Update your account details.
            </p>
            <p className="mt-2 text-xs uppercase tracking-[0.2em] text-app-primary">
              {formatRole(role)}
            </p>
          </div>
          {role === "admin" ? (
            <div className="flex flex-wrap gap-2">
              <Link
                href="/dashboard"
                className="rounded-lg border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-black/65 transition hover:bg-black/[0.03]"
              >
                Go Dashboard
              </Link>
            </div>
          ) : null}
        </div>
      </section>

      <form
        className="space-y-4 rounded-2xl border border-black/5 bg-white p-6 shadow-sm"
        onSubmit={handleSave}
      >
        <div className="flex flex-wrap items-center gap-4">
          <div className="h-16 w-16 overflow-hidden rounded-2xl bg-black/5">
            {values.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt="Profile"
                className="h-full w-full object-cover"
                src={values.avatarUrl}
              />
            ) : null}
          </div>
          <div className="text-sm text-black/60">
            Optional avatar URL.
          </div>
        </div>
        <div className="grid gap-2">
          <label className="text-xs uppercase tracking-[0.2em] text-black/40">
            Full Name
          </label>
          <input
            className="rounded-lg border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-app-primary/15"
            type="text"
            value={values.fullName}
            onChange={(event) => handleChange("fullName", event.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <label className="text-xs uppercase tracking-[0.2em] text-black/40">
            Email
          </label>
          <input
            className="rounded-lg border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-app-primary/15"
            type="email"
            value={values.email}
            onChange={(event) => handleChange("email", event.target.value)}
            required
          />
        </div>
        <div className="grid gap-2">
          <label className="text-xs uppercase tracking-[0.2em] text-black/40">
            Avatar URL
          </label>
          <input
            className="rounded-lg border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-app-primary/15"
            placeholder="https://"
            type="url"
            value={values.avatarUrl}
            onChange={(event) => handleChange("avatarUrl", event.target.value)}
          />
        </div>
        {errorMessage ? (
          <p className="rounded-lg bg-app-danger/10 px-3 py-2 text-xs text-app-danger">
            {errorMessage}
          </p>
        ) : null}
        {successMessage ? (
          <p className="rounded-lg bg-app-primary/10 px-3 py-2 text-xs text-app-primary">
            {successMessage}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <button
            className="rounded-lg bg-app-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
            type="submit"
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
          <button
            className="rounded-lg border border-black/10 px-4 py-2 text-sm font-semibold text-black/60"
            type="button"
            onClick={handleSignOut}
          >
            Sign out
          </button>
        </div>
      </form>
      {role === "admin" ? (
        <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-black/40">Shortcuts</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Link
              href="/hardware"
              className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-black/70 transition hover:bg-black/[0.03]"
            >
              Hardware
            </Link>
            <Link
              href="/maintenance"
              className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-black/70 transition hover:bg-black/[0.03]"
            >
              Maintenance
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}


