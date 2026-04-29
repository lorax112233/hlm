"use client";

import { useEffect, useMemo, useState } from "react";
import DataTable from "@/components/ui/DataTable";
import { supabase } from "@/lib/supabaseClient";

type MaintenanceLog = {
  id: string;
  hardware_id: string;
  maintenance_date: string;
  issue_description: string;
  technician_name: string | null;
  maintenance_status: string;
};

type HardwareOption = {
  id: string;
  asset_id: string;
  device_name: string;
};

const workQueueColumns = [
  { key: "asset", label: "Asset" },
  { key: "issue", label: "Issue" },
  { key: "date", label: "Date" },
  { key: "status", label: "Status" },
  { key: "action", label: "Action" },
];

export default function DashboardPage() {
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [hardwareOptions, setHardwareOptions] = useState<HardwareOption[]>([]);
  const [underMaintenance, setUnderMaintenance] = useState(0);
  const [expiringSoon, setExpiringSoon] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadActiveLogs = async () => {
    const { data } = await supabase
      .from("maintenance_logs")
      .select(
        "id, hardware_id, maintenance_date, issue_description, technician_name, maintenance_status",
      )
      .in("maintenance_status", ["Open", "In Progress"])
      .order("maintenance_date", { ascending: false });
    if (data) setLogs(data);
  };

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      const today = new Date().toISOString().split("T")[0];
      const soon = new Date();
      soon.setDate(soon.getDate() + 30);
      const soonDate = soon.toISOString().split("T")[0];

      const [logsResult, hardwareResult, underMaintenanceResult, expiringResult] =
        await Promise.all([
          supabase
            .from("maintenance_logs")
            .select(
              "id, hardware_id, maintenance_date, issue_description, technician_name, maintenance_status",
            )
            .in("maintenance_status", ["Open", "In Progress"])
            .order("maintenance_date", { ascending: false }),
          supabase.from("hardware_assets").select("id, asset_id, device_name"),
          supabase
            .from("hardware_assets")
            .select("id", { count: "exact", head: true })
            .eq("lifecycle_status", "Under Maintenance"),
          supabase
            .from("hardware_assets")
            .select("id", { count: "exact", head: true })
            .gt("warranty_expiry", today)
            .lte("warranty_expiry", soonDate),
        ]);

      if (!isMounted) return;

      if (logsResult.error) setErrorMessage(logsResult.error.message);
      else setLogs(logsResult.data ?? []);

      if (hardwareResult.data) setHardwareOptions(hardwareResult.data);
      setUnderMaintenance(underMaintenanceResult.count ?? 0);
      setExpiringSoon(expiringResult.count ?? 0);
      setIsLoading(false);
    };

    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  const hardwareLookup = useMemo(
    () =>
      new Map(
        hardwareOptions.map((h) => [h.id, `${h.asset_id} – ${h.device_name}`]),
      ),
    [hardwareOptions],
  );

  const handleStatusUpdate = async (logId: string, newStatus: string) => {
    setUpdatingId(logId);
    await supabase
      .from("maintenance_logs")
      .update({ maintenance_status: newStatus })
      .eq("id", logId);
    await loadActiveLogs();
    setUpdatingId(null);
  };

  const openCount = logs.filter((l) => l.maintenance_status === "Open").length;
  const inProgressCount = logs.filter(
    (l) => l.maintenance_status === "In Progress",
  ).length;

  const workQueueRows = logs.map((log) => ({
    asset: hardwareLookup.get(log.hardware_id) ?? "Unknown",
    issue: log.issue_description,
    date: log.maintenance_date,
    status: log.maintenance_status,
    action: (
      <div className="flex items-center gap-2">
        {log.maintenance_status === "Open" ? (
          <button
            className="rounded-lg border border-app-warning/30 bg-app-warning/10 px-2.5 py-1 text-xs font-semibold text-app-warning transition hover:bg-app-warning/20 disabled:opacity-50"
            type="button"
            disabled={updatingId === log.id}
            onClick={() => handleStatusUpdate(log.id, "In Progress")}
          >
            {updatingId === log.id ? "..." : "Start"}
          </button>
        ) : null}
        {log.maintenance_status === "In Progress" ? (
          <button
            className="rounded-lg border border-app-success/30 bg-app-success/10 px-2.5 py-1 text-xs font-semibold text-app-success transition hover:bg-app-success/20 disabled:opacity-50"
            type="button"
            disabled={updatingId === log.id}
            onClick={() => handleStatusUpdate(log.id, "Resolved")}
          >
            {updatingId === log.id ? "..." : "Resolve"}
          </button>
        ) : null}
      </div>
    ),
  }));

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-app-warning/30 bg-white/90 p-6 shadow-sm shadow-black/5">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-app-warning/60" />
        <p className="text-[10px] uppercase tracking-[0.3em] text-black/40">
          Technician Portal
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-app-text">
          Work Queue
        </h1>
        <p className="mt-1 text-sm text-black/55">
          Active tickets and jobs that need your attention.
        </p>
      </section>

      {errorMessage ? (
        <p className="rounded-lg bg-app-danger/10 px-3 py-2 text-xs text-app-danger">
          {errorMessage}
        </p>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-app-danger/20 bg-white/88 px-4 py-3 shadow-sm shadow-black/5">
          <p className="text-[10px] uppercase tracking-[0.25em] text-black/40">
            Open Tickets
          </p>
          <p className="mt-1 text-2xl font-semibold text-app-danger">
            {openCount}
          </p>
        </div>
        <div className="rounded-2xl border border-app-warning/20 bg-white/88 px-4 py-3 shadow-sm shadow-black/5">
          <p className="text-[10px] uppercase tracking-[0.25em] text-black/40">
            In Progress
          </p>
          <p className="mt-1 text-2xl font-semibold text-app-warning">
            {inProgressCount}
          </p>
        </div>
        <div className="rounded-2xl border border-black/8 bg-white/88 px-4 py-3 shadow-sm shadow-black/5">
          <p className="text-[10px] uppercase tracking-[0.25em] text-black/40">
            Under Maintenance
          </p>
          <p className="mt-1 text-2xl font-semibold text-app-text">
            {underMaintenance}
          </p>
        </div>
        <div className="rounded-2xl border border-app-warning/20 bg-white/88 px-4 py-3 shadow-sm shadow-black/5">
          <p className="text-[10px] uppercase tracking-[0.25em] text-black/40">
            Warranties Expiring
          </p>
          <p className="mt-1 text-2xl font-semibold text-app-warning">
            {expiringSoon}
          </p>
        </div>
      </section>

      <section className="space-y-4 rounded-3xl border border-black/8 bg-white/88 p-5 shadow-sm shadow-black/5">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-black/40">
            Active Work
          </p>
          <h3 className="text-lg font-semibold text-app-text">
            Open &amp; In-Progress Tickets
          </h3>
          <p className="mt-1 text-sm text-black/50">
            Update status as you work through each job.
          </p>
        </div>
        {isLoading ? (
          <div className="rounded-2xl border border-dashed border-black/10 bg-white/60 p-6 text-sm text-black/60">
            Loading...
          </div>
        ) : workQueueRows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/10 bg-white/60 p-6 text-sm text-black/60">
            No open or in-progress tickets. All clear!
          </div>
        ) : (
          <DataTable columns={workQueueColumns} rows={workQueueRows} />
        )}
      </section>
    </div>
  );
}
