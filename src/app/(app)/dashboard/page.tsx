"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import DashboardCard from "@/components/DashboardCard";
import DataTable from "@/components/DataTable";
import { supabase } from "@/lib/supabaseClient";

type RecentAsset = {
  id: string;
  asset_id: string;
  device_type: string;
  lifecycle_status: string;
  warranty_expiry: string | null;
};

const columns = [
  { key: "asset", label: "Asset" },
  { key: "type", label: "Type" },
  { key: "status", label: "Status" },
  { key: "warranty", label: "Warranty" },
  { key: "actions", label: "Actions" },
];

export default function DashboardPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [totalAssets, setTotalAssets] = useState(0);
  const [activeAssets, setActiveAssets] = useState(0);
  const [maintenanceAssets, setMaintenanceAssets] = useState(0);
  const [expiredWarranties, setExpiredWarranties] = useState(0);
  const [recentAssets, setRecentAssets] = useState<RecentAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      const today = new Date();
      const todayString = today.toISOString().split("T")[0];
      const [
        totalResult,
        activeResult,
        maintenanceResult,
        expiredResult,
        recentResult,
      ] = await Promise.all([
        supabase.from("hardware_assets").select("id", {
          count: "exact",
          head: true,
        }),
        supabase
          .from("hardware_assets")
          .select("id", { count: "exact", head: true })
          .eq("lifecycle_status", "Active"),
        supabase
          .from("hardware_assets")
          .select("id", { count: "exact", head: true })
          .eq("lifecycle_status", "Under Maintenance"),
        supabase
          .from("hardware_assets")
          .select("id", { count: "exact", head: true })
          .lt("warranty_expiry", todayString),
        supabase
          .from("hardware_assets")
          .select("id, asset_id, device_type, lifecycle_status, warranty_expiry")
          .order("created_at", { ascending: false })
          .limit(8),
      ]);

      if (!isMounted) {
        return;
      }

      const firstError =
        totalResult.error ||
        activeResult.error ||
        maintenanceResult.error ||
        expiredResult.error ||
        recentResult.error;

      if (firstError) {
        setErrorMessage(firstError.message);
        setIsLoading(false);
        return;
      }

      setTotalAssets(totalResult.count ?? 0);
      setActiveAssets(activeResult.count ?? 0);
      setMaintenanceAssets(maintenanceResult.count ?? 0);
      setExpiredWarranties(expiredResult.count ?? 0);
      setRecentAssets(recentResult.data ?? []);
      setIsLoading(false);
    };

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredAssets = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) {
      return recentAssets;
    }

    return recentAssets.filter((asset) =>
      [asset.asset_id, asset.device_type, asset.lifecycle_status]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [recentAssets, searchTerm]);

  const rows = filteredAssets.map((asset) => ({
    asset: asset.asset_id,
    type: asset.device_type,
    status: asset.lifecycle_status,
    warranty: asset.warranty_expiry ?? "-",
    actions: (
      <Link
        className="text-xs font-semibold text-app-primary"
        href={`/hardware/${asset.id}`}
      >
        View
      </Link>
    ),
  }));

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-black/5 bg-white/80 p-6 shadow-sm">
        <p className="text-[10px] uppercase tracking-[0.3em] text-black/40">
          Do more
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-app-text">Hardware</h1>
            <p className="mt-1 text-sm text-black/50">
              Track assets, maintenance, and warranties at a glance.
            </p>
          </div>
          <Link
            href="/hardware"
            className="rounded-lg bg-app-primary px-4 py-2 text-sm font-semibold text-white"
          >
            Manage Hardware
          </Link>
        </div>
      </section>

      {errorMessage ? (
        <p className="rounded-lg bg-app-danger/10 px-3 py-2 text-xs text-app-danger">
          {errorMessage}
        </p>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardCard title="Total Assets" value={totalAssets} tone="primary" />
        <DashboardCard title="Active" value={activeAssets} tone="success" />
        <DashboardCard title="Maintenance" value={maintenanceAssets} tone="warning" />
        <DashboardCard title="Expired Warranties" value={expiredWarranties} tone="danger" />
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-black/40">
              Recent assets
            </p>
            <h3 className="text-lg font-semibold text-app-text">Hardware Overview</h3>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              className="rounded-lg border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-app-primary/15"
              placeholder="Search assets"
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <Link
              href="/hardware"
              className="rounded-lg border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-black/60"
            >
              View all
            </Link>
          </div>
        </div>
        {isLoading ? (
          <div className="rounded-2xl border border-dashed border-black/10 bg-white/60 p-6 text-sm text-black/60">
            Loading dashboard...
          </div>
        ) : null}
        <DataTable columns={columns} rows={rows} />
      </section>
    </div>
  );
}
