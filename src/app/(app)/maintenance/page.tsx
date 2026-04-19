"use client";

import AdminMaintenancePage from "@/features/admin/modules/maintenance/MaintenancePage";
import ViewerMaintenancePage from "@/features/viewer/modules/maintenance/MaintenancePage";
import { useRole } from "@/lib/roleContext";

export default function MaintenancePage() {
  const { isAdmin } = useRole();

  return isAdmin ? <AdminMaintenancePage /> : <ViewerMaintenancePage />;
}
