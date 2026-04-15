"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const navTitles = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/hardware", label: "Hardware" },
  { href: "/maintenance", label: "Maintenance" },
  { href: "/warranty", label: "Warranty" },
  { href: "/profile", label: "Profile" },
];

const getPageTitle = (pathname: string) => {
  const match = navTitles.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

  if (match) {
    return match.label;
  }

  if (pathname === "/") {
    return "Overview";
  }

  return "Control Center";
};

export default function Navbar() {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);
  const [displayName, setDisplayName] = useState("Admin");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const updateFromUser = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (!isMounted) {
        return;
      }

      const metadata = user?.user_metadata ?? {};
      setDisplayName(metadata.full_name || user?.email || "Admin");
      setAvatarUrl(metadata.avatar_url || null);
    };

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "USER_UPDATED" || event === "SIGNED_IN") {
        updateFromUser();
      }

      if (event === "SIGNED_OUT") {
        setDisplayName("Admin");
        setAvatarUrl(null);
      }
    });

    updateFromUser();

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <header className="flex items-center justify-between border-b border-black/5 bg-white/80 px-6 py-4 backdrop-blur">
      <div>
        <p className="text-[10px] uppercase tracking-[0.3em] text-black/40">
          Control Center
        </p>
        <h2 className="text-xl font-semibold text-app-text">{pageTitle}</h2>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-xs text-black/50">Signed in as</p>
          <p className="text-sm font-medium text-app-text">{displayName}</p>
        </div>
        <div className="h-10 w-10 overflow-hidden rounded-2xl bg-gradient-to-br from-app-primary/20 to-app-primary/5">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt="Profile"
              className="h-full w-full object-cover"
              src={avatarUrl}
            />
          ) : null}
        </div>
      </div>
    </header>
  );
}
