"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CpuChipIcon,
  ArrowRightOnRectangleIcon,
  ShieldExclamationIcon,
  Squares2X2Icon,
  UserCircleIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";
import { supabase } from "@/lib/supabaseClient";

const adminNavItems = [
  { name: "Dashboard", href: "/dashboard", icon: Squares2X2Icon },
  { name: "Hardware", href: "/hardware", icon: CpuChipIcon },
  { name: "Maintenance", href: "/maintenance", icon: WrenchScrewdriverIcon },
  { name: "Warranty", href: "/warranty", icon: ShieldExclamationIcon },
  { name: "Profile", href: "/profile", icon: UserCircleIcon },
];

const viewerNavItems = [
  { name: "Overview", href: "/dashboard", icon: Squares2X2Icon },
  { name: "Hardware Data", href: "/hardware", icon: CpuChipIcon },
  { name: "Maintenance Data", href: "/maintenance", icon: WrenchScrewdriverIcon },
  { name: "Warranty Data", href: "/warranty", icon: ShieldExclamationIcon },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = false;
  const navItems = isAdmin ? adminNavItems : viewerNavItems;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <aside
      className={`sticky top-0 min-h-screen w-72 border-r px-4 py-6 backdrop-blur ${
        isAdmin
          ? "border-black/10 bg-app-sidebar/88"
          : "border-app-warning/20 bg-gradient-to-b from-app-warning/10 to-app-sidebar/90"
      }`}
    >
      <div className="mb-6 rounded-2xl border border-black/8 bg-white/86 px-3 py-4 shadow-sm shadow-black/8">
        <p className="text-[10px] uppercase tracking-[0.3em] text-black/40">
          Hardware Lifecycle
        </p>
        <h1 className="text-lg font-semibold tracking-tight text-app-text">
          {isAdmin ? "HLM Console" : "HLM Viewer"}
        </h1>
        <p
          className={`mt-1 text-[11px] uppercase tracking-[0.2em] ${
            isAdmin ? "text-app-primary" : "text-app-warning"
          }`}
        >
          {isAdmin ? "Admin" : "Viewer"}
        </p>
      </div>
      {!isAdmin ? (
        <div className="mb-4 rounded-xl border border-app-warning/30 bg-app-warning/12 px-3 py-2 text-xs text-app-warning">
          Data access only.
        </div>
      ) : null}
      <div className="mb-2 px-3 text-[10px] uppercase tracking-[0.26em] text-black/40">
        Navigation
      </div>
      <nav className="space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? "border border-black/8 bg-white text-app-primary shadow-sm"
                  : "text-black/60 hover:bg-white/75"
              }`}
            >
              <span
                className={`grid h-9 w-9 place-items-center rounded-xl transition ${
                  isActive
                    ? "bg-app-primary/10"
                    : "bg-black/5 group-hover:bg-white"
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="mt-8 border-t border-black/5 pt-4">
        <button
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-black/60 transition hover:bg-white/75"
          type="button"
          onClick={handleSignOut}
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-black/5">
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
          </span>
          Sign out
        </button>
      </div>
    </aside>
  );
}


