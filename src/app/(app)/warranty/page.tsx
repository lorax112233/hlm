"use client";

import AdminWarrantyPage from "@/features/admin/modules/warranty/WarrantyPage";
import TechnicianWarrantyPage from "@/features/technician/modules/warranty/WarrantyPage";
import { useRole } from "@/lib/roleContext";

export default function WarrantyPage() {
  const { isAdmin } = useRole();

  return isAdmin ? <AdminWarrantyPage /> : <TechnicianWarrantyPage />;
}

