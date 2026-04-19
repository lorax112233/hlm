"use client";

import AdminDashboardPage from "@/features/admin/modules/dashboard/DashboardPage";
import ViewerDashboardPage from "@/features/viewer/modules/dashboard/DashboardPage";
import { useRole } from "@/lib/roleContext";

export default function DashboardPage() {
  const { isAdmin } = useRole();

  return isAdmin ? <AdminDashboardPage /> : <ViewerDashboardPage />;
}
