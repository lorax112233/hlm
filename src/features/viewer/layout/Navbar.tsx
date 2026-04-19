"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { formatRole } from "@/lib/roles";

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
  const dayStamp = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date());
  const [displayName, setDisplayName] = useState("Admin");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const role: "admin" | "viewer" = "viewer";
  const isAdmin = false;

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
    <header
      className={`sticky top-0 z-20 flex items-center justify-between border-b px-4 py-4 backdrop-blur sm:px-6 ${
        isAdmin
          ? "border-black/10 bg-white/72"
          : "border-app-warning/25 bg-gradient-to-r from-app-warning/8 to-white/72"
      }`}
    >
      <div>
        <p className="text-[10px] uppercase tracking-[0.28em] text-black/45">
          {isAdmin ? "Console" : "Viewer Portal"}
        </p>
        <h2 className="text-xl font-semibold tracking-tight text-app-text">{pageTitle}</h2>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right leading-tight">
          <p className="text-[11px] uppercase tracking-[0.12em] text-black/45">{dayStamp}</p>
          <p className="text-xs text-black/50">{isAdmin ? "Signed in" : "View only"}</p>
          <p className="text-sm font-medium text-app-text">{displayName}</p>
          <p
            className={`text-[11px] uppercase tracking-[0.15em] ${
              isAdmin ? "text-app-primary" : "text-app-warning"
            }`}
          >
            {formatRole(role)}
          </p>
        </div>
        <div
          className={`h-11 w-11 overflow-hidden rounded-2xl border border-black/10 ${
            isAdmin
              ? "bg-gradient-to-br from-app-primary/18 to-app-primary/5"
              : "bg-gradient-to-br from-app-warning/18 to-app-warning/5"
          }`}
        >
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


