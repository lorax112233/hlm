"use client";

import AdminWarrantyPage from "@/features/admin/modules/warranty/WarrantyPage";
import ViewerWarrantyPage from "@/features/viewer/modules/warranty/WarrantyPage";
import { useRole } from "@/lib/roleContext";

export default function WarrantyPage() {
  const { isAdmin } = useRole();

  return isAdmin ? <AdminWarrantyPage /> : <ViewerWarrantyPage />;
}
