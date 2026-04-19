"use client";

import AdminProfilePage from "@/features/admin/modules/profile/ProfilePage";
import ViewerProfilePage from "@/features/viewer/modules/profile/ProfilePage";
import { useRole } from "@/lib/roleContext";

export default function ProfilePage() {
  const { isAdmin } = useRole();

  return isAdmin ? <AdminProfilePage /> : <ViewerProfilePage />;
}
