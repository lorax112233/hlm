"use client";

import { useEffect, useMemo, useState } from "react";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import { supabase } from "@/lib/supabaseClient";

type HardwareOption = {
  id: string;
  asset_id: string;
  device_name: string;
};

type MaintenanceLog = {
  id: string;
  hardware_id: string;
  maintenance_date: string;
  issue_description: string;
  action_taken: string | null;
  technician_id: string | null;
  maintenance_status: string;
};

const columns = [
  { key: "asset", label: "Asset" },
  { key: "issue", label: "Issue" },
  { key: "date", label: "Date" },
  { key: "status", label: "Status" },
  { key: "action_taken", label: "Action Taken" },
  { key: "actions", label: "Actions" },
];

export default function MaintenancePage() {
  const [hardwareOptions, setHardwareOptions] = useState<HardwareOption[]>([]);
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [editingLog, setEditingLog] = useState<MaintenanceLog | null>(null);
  const [actionNote, setActionNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState("");
  const [currentUserName, setCurrentUserName] = useState("");

  const loadMyLogs = async (userId: string) => {
    const { data, error } = await supabase
      .from("maintenance_logs")
      .select("id, hardware_id, maintenance_date, issue_description, action_taken, technician_id, maintenance_status")
      .eq("technician_id", userId)
      .order("maintenance_date", { ascending: false });
    if (!error) setLogs(data ?? []);
  };

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      const [hardwareResult, userResult] = await Promise.all([
        supabase.from("hardware_assets").select("id, asset_id, device_name").order("asset_id"),
        supabase.auth.getUser(),
      ]);

      if (!isMounted) return;

      if (hardwareResult.data) setHardwareOptions(hardwareResult.data);

      const user = userResult.data.user;
      const userId = user?.id ?? "";
      const name = user?.user_metadata?.full_name || user?.email || "";
      setCurrentUserId(userId);
      setCurrentUserName(name);

      if (userId) {
        const logsResult = await supabase
          .from("maintenance_logs")
          .select("id, hardware_id, maintenance_date, issue_description, action_taken, technician_id, maintenance_status")
          .eq("technician_id", userId)
          .order("maintenance_date", { ascending: false });
        if (!isMounted) return;
        if (logsResult.error) setErrorMessage(logsResult.error.message);
        else setLogs(logsResult.data ?? []);
      }

      setIsLoading(false);
    };

    void load();
    return () => { isMounted = false; };
  }, []);

  const hardwareLookup = useMemo(
    () => new Map(hardwareOptions.map((h) => [h.id, `${h.asset_id} – ${h.device_name}`])),
    [hardwareOptions],
  );

  const myStats = useMemo(() => ({
    open: logs.filter((l) => l.maintenance_status === "Open").length,
    inProgress: logs.filter((l) => l.maintenance_status === "In Progress").length,
    resolved: logs.filter((l) => l.maintenance_status === "Resolved").length,
    escalated: logs.filter((l) => l.maintenance_status === "Escalated").length,
  }), [logs]);

  const filteredLogs = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    return logs.filter((log) => {
      const matchesStatus = statusFilter === "All" || log.maintenance_status === statusFilter;
      if (!normalized) return matchesStatus;
      const haystack = [
        hardwareLookup.get(log.hardware_id) ?? "",
        log.issue_description,
        log.action_taken ?? "",
        log.maintenance_status,
      ].join(" ").toLowerCase();
      return matchesStatus && haystack.includes(normalized);
    });
  }, [logs, searchTerm, statusFilter, hardwareLookup]);

  const handleQuickStatus = async (logId: string, newStatus: string) => {
    const log = logs.find((l) => l.id === logId);
    if (!log) return;

    if (newStatus === "Resolved" || newStatus === "Escalated") {
      const { data: fresh } = await supabase
        .from("maintenance_logs")
        .select("action_taken")
        .eq("id", logId)
        .single();
      const actionTaken = fresh?.action_taken ?? log.action_taken;
      if (!actionTaken?.trim()) {
        setErrorMessage(
          newStatus === "Resolved"
            ? "Document what you did under Action Taken before marking this job resolved."
            : "Document what you tried under Action Taken before escalating to the admin.",
        );
        handleOpenNote(log);
        return;
      }
    }

    setErrorMessage(null);
    setUpdatingId(logId);

    const { error: statusError } = await supabase
      .from("maintenance_logs")
      .update({ maintenance_status: newStatus })
      .eq("id", logId);

    if (statusError) {
      setErrorMessage(statusError.message);
      setUpdatingId(null);
      return;
    }

    // Reload immediately so the UI reflects the status change.
    await loadMyLogs(currentUserId);
    setUpdatingId(null);

    // Sync hardware lifecycle in the background — don't block the UI.
    if (newStatus === "Resolved") {
      const { count } = await supabase
        .from("maintenance_logs")
        .select("id", { count: "exact", head: true })
        .eq("hardware_id", log.hardware_id)
        .in("maintenance_status", ["Open", "In Progress", "Escalated"]);
      if ((count ?? 0) === 0) {
        await supabase
          .from("hardware_assets")
          .update({ lifecycle_status: "Active" })
          .eq("id", log.hardware_id)
          .eq("lifecycle_status", "Under Maintenance");
      }
    } else {
      const { data: asset } = await supabase
        .from("hardware_assets")
        .select("lifecycle_status")
        .eq("id", log.hardware_id)
        .single();
      if (asset && asset.lifecycle_status !== "Retired" && asset.lifecycle_status !== "Disposed") {
        await supabase
          .from("hardware_assets")
          .update({ lifecycle_status: "Under Maintenance" })
          .eq("id", log.hardware_id);
      }
    }
  };

  const handleEscalate = async (logId: string) => {
    try {
      const log = logs.find((l) => l.id === logId);
      if (!log) return;

      if (!log.action_taken?.trim()) {
        setErrorMessage("Document what you tried under Action Taken before escalating to the admin.");
        setEditingLog(log);
        setActionNote(log.action_taken ?? "");
        return;
      }

      setErrorMessage(null);
      setUpdatingId(logId);

      const { error } = await supabase
        .from("maintenance_logs")
        .update({ maintenance_status: "Escalated" })
        .eq("id", logId);

      if (error) {
        setErrorMessage(error.message);
        setUpdatingId(null);
        return;
      }

      await loadMyLogs(currentUserId);
      setUpdatingId(null);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Unexpected error. Please try again.");
      setUpdatingId(null);
    }
  };

  const handleOpenNote = (log: MaintenanceLog) => {
    setEditingLog(log);
    setActionNote(log.action_taken ?? "");
  };

  const handleSaveNote = async () => {
    if (!editingLog) return;
    setIsSaving(true);
    await supabase.from("maintenance_logs").update({ action_taken: actionNote }).eq("id", editingLog.id);
    await loadMyLogs(currentUserId);
    setEditingLog(null);
    setIsSaving(false);
  };

  const rows = filteredLogs.map((log) => ({
    asset: hardwareLookup.get(log.hardware_id) ?? "Unknown",
    issue: log.issue_description,
    date: log.maintenance_date,
    status: <StatusBadge status={log.maintenance_status} />,
    action_taken: log.action_taken ? (
      <span className="block max-w-[260px] whitespace-normal break-words text-xs leading-relaxed text-black/70">
        {log.action_taken}
      </span>
    ) : (
      <span className="text-xs italic text-black/30">Not documented</span>
    ),
    actions: (
      <div className="flex flex-wrap items-center gap-2">
        {log.maintenance_status === "Open" ? (
          <button
            className="rounded border border-app-warning/30 bg-app-warning/10 px-2 py-0.5 text-xs font-semibold text-app-warning transition hover:bg-app-warning/20 disabled:opacity-50"
            type="button"
            disabled={updatingId === log.id}
            onClick={() => handleQuickStatus(log.id, "In Progress")}
          >
            {updatingId === log.id ? "..." : "Start"}
          </button>
        ) : null}
        {log.maintenance_status === "In Progress" ? (
          <>
            <button
              className="rounded border border-app-success/30 bg-app-success/10 px-2 py-0.5 text-xs font-semibold text-app-success transition hover:bg-app-success/20 disabled:opacity-50"
              type="button"
              disabled={updatingId === log.id}
              onClick={() => handleQuickStatus(log.id, "Resolved")}
            >
              {updatingId === log.id ? "..." : "Resolve"}
            </button>
            <button
              className="rounded border border-app-danger/30 bg-app-danger/10 px-2 py-0.5 text-xs font-semibold text-app-danger transition hover:bg-app-danger/20 disabled:opacity-50"
              type="button"
              disabled={updatingId === log.id}
              onClick={() => handleEscalate(log.id)}
            >
              {updatingId === log.id ? "..." : "Can't Fix"}
            </button>
          </>
        ) : null}
        <button
          className="text-xs font-semibold text-black/45 transition hover:text-app-text"
          type="button"
          onClick={() => handleOpenNote(log)}
        >
          {log.action_taken ? "Edit Note" : "+ Note"}
        </button>
      </div>
    ),
  }));

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-app-warning/30 bg-white/90 p-6 shadow-sm shadow-black/5">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-app-warning/60" />
        <p className="text-[10px] uppercase tracking-[0.3em] text-black/40">Technician</p>
        <h3 className="mt-2 text-xl font-semibold text-app-text">My Work Orders</h3>
        <p className="mt-1 text-sm text-black/55">
          {currentUserName ? (
            <>All jobs assigned to <span className="font-medium text-app-text">{currentUserName}</span>. Add a note documenting your work — required before you can <strong>Resolve</strong> or <strong>Can&apos;t Fix</strong>.</>
          ) : "Loading your work orders..."}
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-app-danger/15 bg-white/88 px-4 py-3 shadow-sm shadow-black/5">
          <p className="text-[10px] uppercase tracking-[0.25em] text-black/40">Open</p>
          <p className="mt-1 text-2xl font-semibold text-app-danger">{myStats.open}</p>
        </div>
        <div className="rounded-2xl border border-app-warning/20 bg-white/88 px-4 py-3 shadow-sm shadow-black/5">
          <p className="text-[10px] uppercase tracking-[0.25em] text-black/40">In Progress</p>
          <p className="mt-1 text-2xl font-semibold text-app-warning">{myStats.inProgress}</p>
        </div>
        <div className="rounded-2xl border border-app-success/20 bg-white/88 px-4 py-3 shadow-sm shadow-black/5">
          <p className="text-[10px] uppercase tracking-[0.25em] text-black/40">Resolved</p>
          <p className="mt-1 text-2xl font-semibold text-app-success">{myStats.resolved}</p>
        </div>
        <div className="rounded-2xl border border-app-danger/20 bg-white/88 px-4 py-3 shadow-sm shadow-black/5">
          <p className="text-[10px] uppercase tracking-[0.25em] text-black/40">Escalated</p>
          <p className="mt-1 text-2xl font-semibold text-app-danger">{myStats.escalated}</p>
        </div>
      </section>

      <div className={`grid gap-6 ${editingLog ? "xl:grid-cols-[1.4fr_1fr]" : ""}`}>
        <section className="space-y-4 rounded-3xl border border-black/8 bg-white/88 p-5 shadow-sm shadow-black/5">
          <div className="flex flex-wrap items-center gap-3">
            <input
              className="app-input rounded-xl px-3 py-2 text-sm"
              placeholder="Search jobs"
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select
              className="app-input rounded-xl px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Escalated">Escalated</option>
            </select>
          </div>
          {errorMessage ? (
            <p className="rounded-lg bg-app-danger/10 px-3 py-2 text-xs text-app-danger">{errorMessage}</p>
          ) : null}
          {isLoading ? (
            <div className="rounded-2xl border border-dashed border-black/10 bg-white/60 p-6 text-sm text-black/60">Loading...</div>
          ) : rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-black/10 bg-white/60 p-6 text-sm text-black/60">
              {logs.length === 0
                ? "No jobs assigned to you yet. The admin will assign work orders here."
                : "No jobs match the current filters."}
            </div>
          ) : null}
          <DataTable columns={columns} rows={rows} />
        </section>

        {editingLog ? (
          <aside className="space-y-4 rounded-3xl border border-black/8 bg-white/88 p-5 shadow-sm shadow-black/5 xl:sticky xl:top-6 xl:self-start">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-black/40">Add Note</p>
              <h3 className="text-lg font-semibold text-app-text">Action Taken</h3>
              <p className="mt-1 text-sm text-black/50">Document what you did for this job.</p>
            </div>
            <div className="space-y-2 rounded-xl border border-black/8 bg-white/80 px-4 py-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-black/40">Asset</p>
                <p className="mt-0.5 text-sm font-medium text-app-text">
                  {hardwareLookup.get(editingLog.hardware_id) ?? "Unknown"}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-black/40">Issue</p>
                <p className="mt-0.5 text-sm text-black/70">{editingLog.issue_description}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-black/40">Status</p>
                <div className="mt-0.5"><StatusBadge status={editingLog.maintenance_status} /></div>
              </div>
            </div>
            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-[0.2em] text-black/40">What did you do?</label>
              <textarea
                className="app-input min-h-[100px] rounded-xl px-3 py-2.5 text-sm"
                placeholder="Describe the action taken to resolve this issue..."
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <button
                className="rounded-xl bg-app-warning px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-app-warning/20 transition hover:opacity-90 disabled:opacity-70"
                type="button"
                disabled={isSaving}
                onClick={handleSaveNote}
              >
                {isSaving ? "Saving..." : "Save Note"}
              </button>
              <button
                className="rounded-xl border border-black/10 px-4 py-2 text-sm font-semibold text-black/60 transition hover:bg-black/[0.03]"
                type="button"
                onClick={() => setEditingLog(null)}
              >
                Cancel
              </button>
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
