"use client";

import AdminDashboardPage from "@/features/admin/modules/dashboard/DashboardPage";
import TechnicianDashboardPage from "@/features/technician/modules/dashboard/DashboardPage";
import { useRole } from "@/lib/roleContext";

export default function DashboardPage() {
  const { isAdmin } = useRole();

  return isAdmin ? <AdminDashboardPage /> : <TechnicianDashboardPage />;
}

