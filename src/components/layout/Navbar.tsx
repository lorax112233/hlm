"use client";

import AdminNavbar from "@/features/admin/layout/Navbar";
import ViewerNavbar from "@/features/viewer/layout/Navbar";
import { useRole } from "@/lib/roleContext";

export default function Navbar() {
  const { isAdmin } = useRole();

  return isAdmin ? <AdminNavbar /> : <ViewerNavbar />;
}
