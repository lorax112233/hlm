"use client";

import AdminNavbar from "@/features/admin/layout/Navbar";
import TechnicianNavbar from "@/features/technician/layout/Navbar";
import { useRole } from "@/lib/roleContext";

export default function Navbar() {
  const { isAdmin } = useRole();

  return isAdmin ? <AdminNavbar /> : <TechnicianNavbar />;
}

