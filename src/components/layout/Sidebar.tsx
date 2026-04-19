"use client";

import AdminSidebar from "@/features/admin/layout/Sidebar";
import ViewerSidebar from "@/features/viewer/layout/Sidebar";
import { useRole } from "@/lib/roleContext";

export default function Sidebar() {
  const { isAdmin } = useRole();

  return isAdmin ? <AdminSidebar /> : <ViewerSidebar />;
}
