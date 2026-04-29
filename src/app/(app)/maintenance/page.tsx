"use client";

import AdminMaintenancePage from "@/features/admin/modules/maintenance/MaintenancePage";
import TechnicianMaintenancePage from "@/features/technician/modules/maintenance/MaintenancePage";
import { useRole } from "@/lib/roleContext";

export default function MaintenancePage() {
  const { isAdmin } = useRole();

  return isAdmin ? <AdminMaintenancePage /> : <TechnicianMaintenancePage />;
}

