"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import DataTable from "@/components/ui/DataTable";
import { supabase } from "@/lib/supabaseClient";

type HardwareAsset = {
  id: string;
  asset_id: string;
  device_name: string;
  device_type: string;
  lifecycle_status: string;
  serial_number: string | null;
  purchase_date: string | null;
  warranty_expiry: string | null;
  assigned_to: string | null;
};

type MaintenanceLog = {
  id: string;
  maintenance_date: string;
  issue_description: string;
  action_taken: string | null;
  technician_name: string | null;
  maintenance_status: string;
};

type LifecycleHistory = {
  id: string;
  old_status: string | null;
  new_status: string;
  changed_by: string | null;
  changed_at: string | null;
};

const maintenanceColumns = [
  { key: "date", label: "Date" },
  { key: "issue", label: "Issue" },
  { key: "technician", label: "Technician" },
  { key: "status", label: "Status" },
  { key: "action", label: "Action Taken" },
];

const historyColumns = [
  { key: "from", label: "From" },
  { key: "to", label: "To" },
  { key: "by", label: "Changed By" },
  { key: "date", label: "Date" },
];

const formatDate = (value: string | null) => {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
};

export default function HardwareDetailPage() {
  const router = useRouter();
  const params = useParams();
  const assetId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [asset, setAsset] = useState<HardwareAsset | null>(null);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [history, setHistory] = useState<LifecycleHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadDetails = async () => {
      if (!assetId) {
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      const [assetResult, maintenanceResult, historyResult] = await Promise.all([
        supabase
          .from("hardware_assets")
          .select(
            "id, asset_id, device_name, device_type, lifecycle_status, serial_number, purchase_date, warranty_expiry, assigned_to",
          )
          .eq("id", assetId)
          .single(),
        supabase
          .from("maintenance_logs")
          .select(
            "id, maintenance_date, issue_description, action_taken, technician_name, maintenance_status",
          )
          .eq("hardware_id", assetId)
          .order("maintenance_date", { ascending: false }),
        supabase
          .from("lifecycle_history")
          .select("id, old_status, new_status, changed_by, changed_at")
          .eq("hardware_id", assetId)
          .order("changed_at", { ascending: false }),
      ]);

      if (!isMounted) {
        return;
      }

      if (assetResult.error) {
        setErrorMessage(assetResult.error.message);
        setIsLoading(false);
        return;
      }

      setAsset(assetResult.data ?? null);
      if (maintenanceResult.error) {
        setErrorMessage(maintenanceResult.error.message);
        setIsLoading(false);
        return;
      }

      if (historyResult.error) {
        setErrorMessage(historyResult.error.message);
        setIsLoading(false);
        return;
      }

      setMaintenanceLogs(maintenanceResult.data ?? []);
      setHistory(historyResult.data ?? []);
      setIsLoading(false);
    };

    loadDetails();

    return () => {
      isMounted = false;
    };
  }, [assetId]);

  const maintenanceRows = useMemo(
    () =>
      maintenanceLogs.map((log) => ({
        date: formatDate(log.maintenance_date),
        issue: log.issue_description,
        technician: log.technician_name ?? "-",
        status: log.maintenance_status,
        action: log.action_taken ?? "-",
      })),
    [maintenanceLogs],
  );

  const historyRows = useMemo(
    () =>
      history.map((entry) => ({
        from: entry.old_status ?? "-",
        to: entry.new_status,
        by: entry.changed_by ?? "System",
        date: formatDate(entry.changed_at),
      })),
    [history],
  );

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-black/10 bg-white/70 p-6 text-sm text-black/60">
        Loading asset details...
      </div>
    );
  }

  if (errorMessage || !asset) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-app-danger">
          {errorMessage ?? "Asset not found."}
        </p>
        <button
          className="rounded-lg border border-black/10 px-4 py-2 text-sm font-semibold text-black/60"
          type="button"
          onClick={() => router.replace("/hardware")}
        >
          Back to Hardware
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-black/40">Asset</p>
          <h2 className="text-2xl font-semibold text-app-text">
            {asset.asset_id} - {asset.device_name}
          </h2>
          <p className="mt-1 text-sm text-black/50">
            {asset.device_type} · {asset.lifecycle_status}
          </p>
        </div>
        <Link
          href="/hardware"
          className="rounded-lg border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-black/60"
        >
          Back to Hardware
        </Link>
      </div>

      <section className="grid gap-4 rounded-2xl border border-black/5 bg-white p-6 shadow-sm md:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-black/40">Assigned To</p>
          <p className="mt-1 text-sm text-app-text">
            {asset.assigned_to ?? "-"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-black/40">Serial Number</p>
          <p className="mt-1 text-sm text-app-text">
            {asset.serial_number ?? "-"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-black/40">Purchase Date</p>
          <p className="mt-1 text-sm text-app-text">
            {formatDate(asset.purchase_date)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-black/40">Warranty Expiry</p>
          <p className="mt-1 text-sm text-app-text">
            {formatDate(asset.warranty_expiry)}
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-black/40">Maintenance</p>
          <h3 className="text-lg font-semibold text-app-text">Recent Work Orders</h3>
        </div>
        {maintenanceRows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/10 bg-white/60 p-6 text-sm text-black/60">
            No maintenance logs recorded for this asset.
          </div>
        ) : null}
        <DataTable columns={maintenanceColumns} rows={maintenanceRows} />
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-black/40">
            Lifecycle History
          </p>
          <h3 className="text-lg font-semibold text-app-text">Status Changes</h3>
        </div>
        {historyRows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/10 bg-white/60 p-6 text-sm text-black/60">
            No lifecycle updates recorded yet.
          </div>
        ) : null}
        <DataTable columns={historyColumns} rows={historyRows} />
      </section>
    </div>
  );
}
