"use client";

import AdminHardwarePage from "@/features/admin/modules/hardware/HardwarePage";
import TechnicianHardwarePage from "@/features/technician/modules/hardware/HardwarePage";
import { useRole } from "@/lib/roleContext";

export default function HardwarePage() {
  const { isAdmin } = useRole();

  // Keep route stable while delegating UI behavior to role-specific modules.
  return isAdmin ? <AdminHardwarePage /> : <TechnicianHardwarePage />;
}

