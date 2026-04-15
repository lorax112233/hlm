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

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: Squares2X2Icon },
  { name: "Hardware", href: "/hardware", icon: CpuChipIcon },
  { name: "Maintenance", href: "/maintenance", icon: WrenchScrewdriverIcon },
  { name: "Warranty", href: "/warranty", icon: ShieldExclamationIcon },
  { name: "Profile", href: "/profile", icon: UserCircleIcon },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <aside className="min-h-screen w-64 border-r border-black/5 bg-app-sidebar/90 px-4 py-6 backdrop-blur">
      <div className="mb-8 rounded-2xl bg-white/80 px-3 py-4 shadow-sm">
        <p className="text-[10px] uppercase tracking-[0.3em] text-black/40">
          Hardware Lifecycle
        </p>
        <h1 className="text-lg font-semibold text-app-text">HLM Console</h1>
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
                  ? "bg-white text-app-primary shadow-sm"
                  : "text-black/60 hover:bg-white/70"
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
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-black/60 transition hover:bg-white/70"
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
