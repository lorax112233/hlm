"use client";

import AdminHardwarePage from "@/features/admin/modules/hardware/HardwarePage";
import ViewerHardwarePage from "@/features/viewer/modules/hardware/HardwarePage";
import { useRole } from "@/lib/roleContext";

export default function HardwarePage() {
  const { isAdmin } = useRole();

  return isAdmin ? <AdminHardwarePage /> : <ViewerHardwarePage />;
}
