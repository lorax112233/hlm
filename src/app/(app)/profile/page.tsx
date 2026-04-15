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
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-black/40">Profile</p>
        <h3 className="text-lg font-semibold text-app-text">Account Details</h3>
        <p className="mt-1 text-sm text-black/50">
          Update your contact details and avatar.
        </p>
      </div>
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
            Optional: add an image URL for your avatar.
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
    </div>
  );
}
