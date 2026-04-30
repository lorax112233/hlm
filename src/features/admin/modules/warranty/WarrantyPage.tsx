"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import { supabase } from "@/lib/supabaseClient";

type WarrantyAsset = {
  id: string;
  asset_id: string;
  device_name: string;
  warranty_expiry: string | null;
};

const columns = [
  { key: "asset", label: "Asset" },
  { key: "expiry", label: "Expiry" },
  { key: "days", label: "Days Left" },
  { key: "status", label: "Status" },
];

// Shared conversion constant for milliseconds-to-days calculations.
const MS_PER_DAY = 1000 * 60 * 60 * 24;

export default function WarrantyPage() {
  // State: source rows, filter controls, and request error feedback.
  const [assets, setAssets] = useState<WarrantyAsset[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    // Load only assets with warranty dates because undated records are not actionable here.
    const loadAssets = async () => {
      const { data, error } = await supabase
        .from("hardware_assets")
        .select("id, asset_id, device_name, warranty_expiry")
        .not("warranty_expiry", "is", null)
        .order("warranty_expiry", { ascending: true });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setAssets(data ?? []);
    };

    loadAssets();
  }, []);

  const { rows, expiredCount, expiringCount } = useMemo(() => {
    // Derive risk classification (OK, Expiring Soon, Expired) from expiry dates.
    const today = new Date();
    const end = new Date();
    end.setDate(today.getDate() + 30);

    const mappedRows = assets.map((asset) => {
      const expiryDate = asset.warranty_expiry
        ? new Date(asset.warranty_expiry)
        : null;

      if (!expiryDate) {
        return {
          asset: asset.asset_id,
          expiry: "-",
          days: "-",
          status: <StatusBadge status="Unknown" />,
          _statusStr: "Unknown",
        };
      }

      const diffDays = Math.ceil(
        (expiryDate.getTime() - today.getTime()) / MS_PER_DAY,
      );

      let status = "OK";
      if (expiryDate < today) {
        status = "Expired";
      } else if (expiryDate <= end) {
        status = "Expiring Soon";
      }

      return {
        asset: `${asset.asset_id} - ${asset.device_name}`,
        expiry: asset.warranty_expiry,
        days: status === "Expired" ? "Expired" : `${diffDays}`,
        status: <StatusBadge status={status} />,
        _statusStr: status,
      };
    });

    const expired = mappedRows.filter((row) => row._statusStr === "Expired").length;
    const expiringSoon = mappedRows.filter(
      (row) => row._statusStr === "Expiring Soon",
    ).length;

    return {
      rows: mappedRows,
      expiredCount: expired,
      expiringCount: expiringSoon,
    };
  }, [assets]);

  const filteredRows = useMemo(() => {
    // Apply status and text filters locally for responsive table UX.
    const normalized = searchTerm.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesStatus = statusFilter === "All" || row._statusStr === statusFilter;

      if (!normalized) {
        return matchesStatus;
      }

      const haystack = [row.asset, row.expiry ?? "", row._statusStr]
        .join(" ")
        .toLowerCase();

      return matchesStatus && haystack.includes(normalized);
    });
  }, [rows, searchTerm, statusFilter]);

  const emptyMessage =
    assets.length === 0
      ? "No warranty dates found yet. Add warranty expiry dates on hardware."
      : "No assets match the current filters.";

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-black/5 bg-white/90 p-6 shadow-sm shadow-black/5">
        <p className="text-[10px] uppercase tracking-[0.3em] text-black/40">
          Warranty
        </p>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-app-text">Coverage</h3>
            <p className="mt-1 text-sm text-black/50">
              Track expiring coverage and plan renewals.
            </p>
          </div>
          <Link
            href="/hardware"
            className="rounded-lg border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-black/65 transition hover:bg-black/[0.03]"
          >
            Update Assets
          </Link>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-black/5 bg-white px-4 py-3 shadow-sm">
          <p className="text-[10px] uppercase tracking-[0.3em] text-black/40">
            Expired
          </p>
          <p className="mt-2 text-2xl font-semibold text-app-danger">
            {expiredCount}
          </p>
        </div>
        <div className="rounded-2xl border border-black/5 bg-white px-4 py-3 shadow-sm">
          <p className="text-[10px] uppercase tracking-[0.3em] text-black/40">
            Expiring Soon
          </p>
          <p className="mt-2 text-2xl font-semibold text-app-warning">
            {expiringCount}
          </p>
        </div>
      </div>
      <section className="space-y-4 rounded-3xl border border-black/5 bg-white/80 p-5 shadow-sm shadow-black/5">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-black/40">Warranty</p>
          <h3 className="text-lg font-semibold text-app-text">Expiring Assets</h3>
          <p className="mt-1 text-sm text-black/50">
            Filter by risk and due date.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            className="rounded-lg border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-app-primary/15"
            placeholder="Search assets"
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <select
            className="rounded-lg border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-app-primary/15"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="All">All statuses</option>
            <option value="OK">OK</option>
            <option value="Expiring Soon">Expiring Soon</option>
            <option value="Expired">Expired</option>
            <option value="Unknown">Unknown</option>
          </select>
        </div>
        {errorMessage ? (
          <p className="rounded-lg bg-app-danger/10 px-3 py-2 text-xs text-app-danger">
            {errorMessage}
          </p>
        ) : null}
        {filteredRows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/10 bg-white/60 p-6 text-sm text-black/60">
            {emptyMessage}
          </div>
        ) : null}
        <DataTable columns={columns} rows={filteredRows} />
      </section>
    </div>
  );
}



