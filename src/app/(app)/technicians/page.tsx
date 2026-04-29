"use client";

import TechniciansPage from "@/features/admin/modules/technicians/TechniciansPage";
import { useRole } from "@/lib/roleContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Page() {
  const { isAdmin, isLoading } = useRole();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      router.replace("/dashboard");
    }
  }, [isAdmin, isLoading, router]);

  if (isLoading || !isAdmin) return null;

  return <TechniciansPage />;
}
