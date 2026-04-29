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

const myJobsColumns = [
  { key: "asset", label: "Asset" },
  { key: "issue", label: "Issue" },
  { key: "date", label: "Date" },
  { key: "status", label: "Status" },
  { key: "action", label: "Action" },
];

const unassignedColumns = [
  { key: "asset", label: "Asset" },
  { key: "issue", label: "Issue" },
  { key: "date", label: "Date" },
  { key: "claim", label: "" },
];

export default function DashboardPage() {
  const [allLogs, setAllLogs] = useState<MaintenanceLog[]>([]);
  const [hardwareOptions, setHardwareOptions] = useState<HardwareOption[]>([]);
  const [underMaintenance, setUnderMaintenance] = useState(0);
  const [expiringSoon, setExpiringSoon] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState("");

  const loadActiveLogs = async () => {
    const { data } = await supabase
      .from("maintenance_logs")
      .select(
        "id, hardware_id, maintenance_date, issue_description, technician_name, maintenance_status",
      )
      .in("maintenance_status", ["Open", "In Progress"])
      .order("maintenance_date", { ascending: false });
    if (data) setAllLogs(data);
  };

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      const today = new Date().toISOString().split("T")[0];
      const soon = new Date();
      soon.setDate(soon.getDate() + 30);
      const soonDate = soon.toISOString().split("T")[0];

      const [logsResult, hardwareResult, underMaintenanceResult, expiringResult, userResult] =
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
          supabase.auth.getUser(),
        ]);

      if (!isMounted) return;

      if (logsResult.error) setErrorMessage(logsResult.error.message);
      else setAllLogs(logsResult.data ?? []);

      if (hardwareResult.data) setHardwareOptions(hardwareResult.data);
      setUnderMaintenance(underMaintenanceResult.count ?? 0);
      setExpiringSoon(expiringResult.count ?? 0);

      const metadata = userResult.data.user?.user_metadata ?? {};
      const name = metadata.full_name || userResult.data.user?.email || "";
      setCurrentUserName(name);

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

  // Jobs the admin assigned to this technician by name
  const myJobs = useMemo(
    () =>
      allLogs.filter(
        (l) =>
          l.technician_name &&
          l.technician_name.toLowerCase() === currentUserName.toLowerCase(),
      ),
    [allLogs, currentUserName],
  );

  // Open jobs with no technician assigned yet — available to self-assign
  const unassignedJobs = useMemo(
    () =>
      allLogs.filter(
        (l) => !l.technician_name && l.maintenance_status === "Open",
      ),
    [allLogs],
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

  const handleClaim = async (logId: string) => {
    setUpdatingId(logId);
    await supabase
      .from("maintenance_logs")
      .update({ technician_name: currentUserName, maintenance_status: "In Progress" })
      .eq("id", logId);
    await loadActiveLogs();
    setUpdatingId(null);
  };

  const myJobRows = myJobs.map((log) => ({
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

  const unassignedRows = unassignedJobs.map((log) => ({
    asset: hardwareLookup.get(log.hardware_id) ?? "Unknown",
    issue: log.issue_description,
    date: log.maintenance_date,
    claim: (
      <button
        className="rounded-lg border border-app-primary/25 bg-app-primary/8 px-2.5 py-1 text-xs font-semibold text-app-primary transition hover:bg-app-primary/15 disabled:opacity-50"
        type="button"
        disabled={updatingId === log.id}
        onClick={() => handleClaim(log.id)}
      >
        {updatingId === log.id ? "..." : "Claim"}
      </button>
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
          {currentUserName ? (
            <>Jobs assigned to <span className="font-medium text-app-text">{currentUserName}</span>, plus unassigned tickets you can claim.</>
          ) : (
            "Your assigned jobs and available tickets."
          )}
        </p>
      </section>

      {errorMessage ? (
        <p className="rounded-lg bg-app-danger/10 px-3 py-2 text-xs text-app-danger">
          {errorMessage}
        </p>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-app-warning/20 bg-white/88 px-4 py-3 shadow-sm shadow-black/5">
          <p className="text-[10px] uppercase tracking-[0.25em] text-black/40">
            Assigned to Me
          </p>
          <p className="mt-1 text-2xl font-semibold text-app-warning">
            {myJobs.length}
          </p>
        </div>
        <div className="rounded-2xl border border-black/8 bg-white/88 px-4 py-3 shadow-sm shadow-black/5">
          <p className="text-[10px] uppercase tracking-[0.25em] text-black/40">
            Unassigned
          </p>
          <p className="mt-1 text-2xl font-semibold text-app-text">
            {unassignedJobs.length}
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

      {/* My assigned jobs — from admin setting technician_name = this user */}
      <section className="space-y-4 rounded-3xl border border-app-warning/20 bg-white/88 p-5 shadow-sm shadow-black/5">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-black/40">
            Assigned to me
          </p>
          <h3 className="text-lg font-semibold text-app-text">My Jobs</h3>
          <p className="mt-1 text-sm text-black/50">
            Jobs the admin assigned to you. Start or resolve them here.
          </p>
        </div>
        {isLoading ? (
          <div className="rounded-2xl border border-dashed border-black/10 bg-white/60 p-6 text-sm text-black/60">
            Loading...
          </div>
        ) : myJobRows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/10 bg-white/60 p-6 text-sm text-black/60">
            No jobs assigned to you yet.
          </div>
        ) : (
          <DataTable columns={myJobsColumns} rows={myJobRows} />
        )}
      </section>

      {/* Unassigned jobs — admin created but hasn't named a technician yet */}
      <section className="space-y-4 rounded-3xl border border-black/8 bg-white/88 p-5 shadow-sm shadow-black/5">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-black/40">
            Available
          </p>
          <h3 className="text-lg font-semibold text-app-text">
            Unassigned Jobs
          </h3>
          <p className="mt-1 text-sm text-black/50">
            Open tickets with no technician yet. Claim one to assign it to yourself.
          </p>
        </div>
        {isLoading ? null : unassignedRows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/10 bg-white/60 p-6 text-sm text-black/60">
            No unassigned tickets right now.
          </div>
        ) : (
          <DataTable columns={unassignedColumns} rows={unassignedRows} />
        )}
      </section>
    </div>
  );
}
