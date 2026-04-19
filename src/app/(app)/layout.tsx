import type { ReactNode } from "react";
import AuthGate from "@/components/layout/AuthGate";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import { RoleProvider } from "@/lib/roleContext";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <RoleProvider>
        <div className="min-h-screen bg-app-bg text-app-text">
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex min-h-screen flex-1 flex-col">
              <Navbar />
              <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">
                <div className="mx-auto w-full max-w-7xl">{children}</div>
              </main>
            </div>
          </div>
        </div>
      </RoleProvider>
    </AuthGate>
  );
}
