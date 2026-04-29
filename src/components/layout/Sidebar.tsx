"use client";

import AdminSidebar from "@/features/admin/layout/Sidebar";
import TechnicianSidebar from "@/features/technician/layout/Sidebar";
import { useRole } from "@/lib/roleContext";

export default function Sidebar() {
  const { isAdmin } = useRole();

  return isAdmin ? <AdminSidebar /> : <TechnicianSidebar />;
}

