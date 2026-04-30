"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import { supabase } from "@/lib/supabaseClient";

type HardwareAsset = {
  id: string;
  asset_id: string;
  device_name: string;
  device_type: string;
  lifecycle_status: string;
  warranty_expiry: string | null;
};

const columns = [
  { key: "asset", label: "Asset" },
  { key: "name", label: "Device" },
  { key: "type", label: "Type" },
  { key: "status", label: "Status" },
  { key: "actions", label: "" },
];

export default function HardwarePage() {
  const [assets, setAssets] = useState<HardwareAsset[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    let isMounted = true;

    const loadAssets = async () => {
      const { data, error } = await supabase
        .from("hardware_assets")
        .select(
          "id, asset_id, device_name, device_type, lifecycle_status, warranty_expiry",
        )
        .order("created_at", { ascending: false });

      if (!isMounted) return;
      if (error) { setErrorMessage(error.message); return; }
      setAssets(data ?? []);
    };

    void loadAssets();
    return () => {
      isMounted = false;
    };
  }, []);

  const assetStats = useMemo(
    () => ({
      total: assets.length,
      active: assets.filter((a) => a.lifecycle_status === "Active").length,
      maintenance: assets.filter(
        (a) => a.lifecycle_status === "Under Maintenance",
      ).length,
      retired: assets.filter((a) => a.lifecycle_status === "Retired").length,
    }),
    [assets],
  );

  const filteredAssets = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    return assets.filter((asset) => {
      const matchesStatus =
        statusFilter === "All" || asset.lifecycle_status === statusFilter;
      if (!normalized) return matchesStatus;
      const haystack = [
        asset.asset_id,
        asset.device_name,
        asset.device_type,
        asset.lifecycle_status,
      ]
        .join(" ")
        .toLowerCase();
      return matchesStatus && haystack.includes(normalized);
    });
  }, [assets, searchTerm, statusFilter]);

  const rows = filteredAssets.map((asset) => ({
    asset: asset.asset_id,
    name: asset.device_name,
    type: asset.device_type,
    status: <StatusBadge status={asset.lifecycle_status} />,
    actions: (
      <div className="flex items-center gap-2">
        <Link
          className="text-xs font-semibold text-black/50 transition hover:text-app-text"
          href={`/hardware/${asset.id}`}
        >
          View
        </Link>
        <Link
          className="rounded border border-app-warning/30 bg-app-warning/10 px-2 py-0.5 text-xs font-semibold text-app-warning transition hover:bg-app-warning/20"
          href="/maintenance"
        >
          Log Issue
        </Link>
      </div>
    ),
  }));

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-app-warning/30 bg-white/90 p-6 shadow-sm shadow-black/5">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-app-warning/60" />
        <p className="text-[10px] uppercase tracking-[0.3em] text-black/40">
          Technician
        </p>
        <h3 className="mt-2 text-xl font-semibold text-app-text">
          Hardware Assets
        </h3>
        <p className="mt-1 text-sm text-black/55">
          Read-only inventory. Use Log Issue to raise a work order for any
          device.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-black/8 bg-white/88 px-4 py-3 shadow-sm shadow-black/5">
          <p className="text-[10px] uppercase tracking-[0.25em] text-black/40">
            Total
          </p>
          <p className="mt-1 text-2xl font-semibold text-app-text">
            {assetStats.total}
          </p>
        </div>
        <div className="rounded-2xl border border-black/8 bg-white/88 px-4 py-3 shadow-sm shadow-black/5">
          <p className="text-[10px] uppercase tracking-[0.25em] text-black/40">
            Active
          </p>
          <p className="mt-1 text-2xl font-semibold text-app-primary">
            {assetStats.active}
          </p>
        </div>
        <div className="rounded-2xl border border-app-warning/20 bg-white/88 px-4 py-3 shadow-sm shadow-black/5">
          <p className="text-[10px] uppercase tracking-[0.25em] text-black/40">
            Maintenance
          </p>
          <p className="mt-1 text-2xl font-semibold text-app-warning">
            {assetStats.maintenance}
          </p>
        </div>
        <div className="rounded-2xl border border-black/8 bg-white/88 px-4 py-3 shadow-sm shadow-black/5">
          <p className="text-[10px] uppercase tracking-[0.25em] text-black/40">
            Retired
          </p>
          <p className="mt-1 text-2xl font-semibold text-black/70">
            {assetStats.retired}
          </p>
        </div>
      </section>

      <section className="space-y-4 rounded-3xl border border-black/8 bg-white/88 p-5 shadow-sm shadow-black/5">
        <div className="flex flex-wrap items-center gap-3">
          <input
            className="app-input rounded-xl px-3 py-2 text-sm"
            placeholder="Search assets"
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <select
            className="app-input rounded-xl px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="All">All statuses</option>
            <option value="New">New</option>
            <option value="Active">Active</option>
            <option value="Under Maintenance">Under Maintenance</option>
            <option value="Retired">Retired</option>
            <option value="Disposed">Disposed</option>
          </select>
        </div>
        {errorMessage ? (
          <p className="rounded-lg bg-app-danger/10 px-3 py-2 text-xs text-app-danger">
            {errorMessage}
          </p>
        ) : null}
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/10 bg-white/60 p-6 text-sm text-black/60">
            {assets.length === 0
              ? "No hardware assets yet."
              : "No assets match the current filters."}
          </div>
        ) : null}
        <DataTable columns={columns} rows={rows} />
      </section>
    </div>
  );
}
