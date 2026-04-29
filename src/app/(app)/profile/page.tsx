"use client";

import AdminProfilePage from "@/features/admin/modules/profile/ProfilePage";
import TechnicianProfilePage from "@/features/technician/modules/profile/ProfilePage";
import { useRole } from "@/lib/roleContext";

export default function ProfilePage() {
  const { isAdmin } = useRole();

  return isAdmin ? <AdminProfilePage /> : <TechnicianProfilePage />;
}

