"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import DashboardCard from "@/components/ui/DashboardCard";
import DataTable from "@/components/ui/DataTable";
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

const viewerColumns = columns.filter((column) => column.key !== "actions");

export default function DashboardPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [totalAssets, setTotalAssets] = useState(0);
  const [activeAssets, setActiveAssets] = useState(0);
  const [maintenanceAssets, setMaintenanceAssets] = useState(0);
  const [expiredWarranties, setExpiredWarranties] = useState(0);
  const [recentAssets, setRecentAssets] = useState<RecentAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isAdmin = false;

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

  const viewerRows = filteredAssets.map((asset) => ({
    asset: asset.asset_id,
    type: asset.device_type,
    status: asset.lifecycle_status,
    warranty: asset.warranty_expiry ?? "-",
  }));

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <section className="rounded-3xl border border-app-warning/25 bg-white/88 p-6 shadow-sm shadow-black/5">
          <p className="text-[10px] uppercase tracking-[0.3em] text-black/40">Viewer</p>
          <h1 className="mt-2 text-2xl font-semibold text-app-text">System Data</h1>
          <p className="mt-1 text-sm text-black/55">Read-only hardware lifecycle overview.</p>
        </section>

        {errorMessage ? (
          <p className="rounded-lg bg-app-danger/10 px-3 py-2 text-xs text-app-danger">
            {errorMessage}
          </p>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DashboardCard title="Total Assets" value={totalAssets} />
          <DashboardCard title="Active" value={activeAssets} />
          <DashboardCard title="Maintenance" value={maintenanceAssets} />
          <DashboardCard title="Expired" value={expiredWarranties} />
        </section>

        <section className="space-y-4 rounded-3xl border border-black/8 bg-white/88 p-5 shadow-sm shadow-black/5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-app-text">Recent Assets</h3>
            <input
              className="app-input rounded-xl px-3 py-2 text-sm"
              placeholder="Search assets"
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          {isLoading ? (
            <div className="rounded-2xl border border-dashed border-black/10 bg-white/60 p-6 text-sm text-black/60">
              Loading...
            </div>
          ) : null}
          <DataTable columns={viewerColumns} rows={viewerRows} />
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-black/5 bg-white/90 p-6 shadow-sm shadow-black/5">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-app-primary/70" />
        <p className="text-[10px] uppercase tracking-[0.3em] text-black/40">
          Overview
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-app-text">Hardware</h1>
            <p className="mt-1 text-sm text-black/50">
              {isAdmin
                ? "Assets, maintenance, and warranty status."
                : "Read-only asset, maintenance, and warranty status."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-app-primary/25 bg-app-primary/10 px-3 py-1 text-[11px] font-semibold text-app-primary">
                Assets
              </span>
              <span className="rounded-full border border-app-primary/20 bg-app-primary/5 px-3 py-1 text-[11px] font-semibold text-app-primary/90">
                Warranties
              </span>
            </div>
          </div>
          {isAdmin ? (
            <Link
              href="/hardware"
              className="rounded-lg bg-app-primary px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-app-primary/25 transition hover:bg-app-primary/90"
            >
              Manage Hardware
            </Link>
          ) : (
            <span className="rounded-lg border border-app-warning/30 bg-app-warning/10 px-4 py-2 text-sm font-semibold text-app-warning">
              Viewer
            </span>
          )}
        </div>
      </section>

      {errorMessage ? (
        <p className="rounded-lg bg-app-danger/10 px-3 py-2 text-xs text-app-danger">
          {errorMessage}
        </p>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardCard title="Total Assets" value={totalAssets} />
        <DashboardCard title="Active" value={activeAssets} />
        <DashboardCard title="Maintenance" value={maintenanceAssets} />
        <DashboardCard title="Expired Warranties" value={expiredWarranties} />
      </section>

      <section className="rounded-3xl border border-black/5 bg-white/75 p-4 shadow-sm shadow-black/5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-black/40">
              Recent assets
            </p>
            <h3 className="text-lg font-semibold text-app-text">Hardware Overview</h3>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-app-primary/15"
              placeholder="Search assets"
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <Link
              href="/hardware"
              className="rounded-lg border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-black/60 transition hover:bg-black/[0.03]"
            >
              View all
            </Link>
          </div>
        </div>
        {isLoading ? (
          <div className="rounded-2xl border border-dashed border-black/10 bg-white/60 p-6 text-sm text-black/60">
            Loading...
          </div>
        ) : null}
        <DataTable columns={columns} rows={rows} />
      </section>
    </div>
  );
}


