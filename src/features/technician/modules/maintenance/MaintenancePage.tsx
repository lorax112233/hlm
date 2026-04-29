"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DataTable from "@/components/ui/DataTable";
import { supabase } from "@/lib/supabaseClient";
import { toCsv } from "@/lib/csv";

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
  technician_name: string | null;
  maintenance_status: string;
};

const columns = [
  { key: "asset", label: "Asset" },
  { key: "issue", label: "Issue" },
  { key: "technician", label: "Technician" },
  { key: "status", label: "Status" },
  { key: "actions", label: "Actions" },
];

const emptyForm = {
  hardware_id: "",
  maintenance_date: "",
  issue_description: "",
  action_taken: "",
  technician_name: "",
  maintenance_status: "Open",
};

export default function MaintenancePage() {
  const [hardwareOptions, setHardwareOptions] = useState<HardwareOption[]>([]);
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [ownerFilter, setOwnerFilter] = useState<"mine" | "all">("mine");
  const [editingLog, setEditingLog] = useState<MaintenanceLog | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState("");
  const [formValues, setFormValues] = useState(emptyForm);

  const fetchLogs = () =>
    supabase
      .from("maintenance_logs")
      .select(
        "id, hardware_id, maintenance_date, issue_description, action_taken, technician_name, maintenance_status",
      )
      .order("maintenance_date", { ascending: false });

  const loadLogs = async () => {
    const { data, error } = await fetchLogs();
    if (error) { setErrorMessage(error.message); return; }
    setLogs(data ?? []);
  };

  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      const [hardwareResult, logsResult, userResult] = await Promise.all([
        supabase
          .from("hardware_assets")
          .select("id, asset_id, device_name")
          .order("asset_id", { ascending: true }),
        fetchLogs(),
        supabase.auth.getUser(),
      ]);

      if (!isMounted) return;

      if (hardwareResult.data) setHardwareOptions(hardwareResult.data);
      if (!logsResult.error) setLogs(logsResult.data ?? []);

      const metadata = userResult.data.user?.user_metadata ?? {};
      const name =
        metadata.full_name || userResult.data.user?.email || "";
      setCurrentUserName(name);
      setFormValues((prev) => ({ ...prev, technician_name: name }));
    };

    void loadInitialData();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleChange = (key: keyof typeof formValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setFormValues({ ...emptyForm, technician_name: currentUserName });
    setEditingLog(null);
  };

  const handleSubmit = async (event: { preventDefault(): void }) => {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const payload = {
      hardware_id: formValues.hardware_id,
      maintenance_date: formValues.maintenance_date,
      issue_description: formValues.issue_description,
      action_taken: formValues.action_taken || null,
      technician_name: formValues.technician_name || null,
      maintenance_status: formValues.maintenance_status,
    };

    const { error } = editingLog
      ? await supabase
          .from("maintenance_logs")
          .update(payload)
          .eq("id", editingLog.id)
      : await supabase.from("maintenance_logs").insert(payload);

    if (error) {
      setErrorMessage(error.message);
      setIsLoading(false);
      return;
    }

    resetForm();
    await loadLogs();
    setIsLoading(false);
  };

  const handleEdit = (log: MaintenanceLog) => {
    setEditingLog(log);
    setFormValues({
      hardware_id: log.hardware_id,
      maintenance_date: log.maintenance_date,
      issue_description: log.issue_description,
      action_taken: log.action_taken ?? "",
      technician_name: log.technician_name ?? currentUserName,
      maintenance_status: log.maintenance_status,
    });
  };

  const handleQuickStatus = async (logId: string, newStatus: string) => {
    setUpdatingId(logId);
    await supabase
      .from("maintenance_logs")
      .update({ maintenance_status: newStatus })
      .eq("id", logId);
    await loadLogs();
    setUpdatingId(null);
  };

  const hardwareLookup = useMemo(
    () =>
      new Map(
        hardwareOptions.map((item) => [
          item.id,
          `${item.asset_id} - ${item.device_name}`,
        ]),
      ),
    [hardwareOptions],
  );

  const hardwareLabel = useCallback(
    (hardwareId: string) => hardwareLookup.get(hardwareId) ?? "Unknown",
    [hardwareLookup],
  );

  const handleExport = () => {
    const headers = [
      "hardware_id",
      "asset_id",
      "maintenance_date",
      "issue_description",
      "action_taken",
      "technician_name",
      "maintenance_status",
    ];
    const rowsToExport = logs.map((log) => {
      const option = hardwareOptions.find((item) => item.id === log.hardware_id);
      return {
        hardware_id: log.hardware_id,
        asset_id: option?.asset_id ?? "",
        maintenance_date: log.maintenance_date,
        issue_description: log.issue_description,
        action_taken: log.action_taken ?? "",
        technician_name: log.technician_name ?? "",
        maintenance_status: log.maintenance_status,
      };
    });
    const csv = toCsv(headers, rowsToExport);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "maintenance_logs.csv";
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const maintenanceStats = useMemo(
    () => ({
      total: logs.length,
      open: logs.filter((l) => l.maintenance_status === "Open").length,
      inProgress: logs.filter((l) => l.maintenance_status === "In Progress")
        .length,
      resolved: logs.filter((l) => l.maintenance_status === "Resolved").length,
    }),
    [logs],
  );

  const filteredLogs = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    return logs.filter((log) => {
      const matchesOwner =
        ownerFilter === "all" ||
        log.technician_name?.toLowerCase() === currentUserName.toLowerCase();
      const matchesStatus =
        statusFilter === "All" || log.maintenance_status === statusFilter;
      if (!normalized) return matchesOwner && matchesStatus;
      const label = hardwareLabel(log.hardware_id);
      const haystack = [
        label,
        log.issue_description,
        log.technician_name ?? "",
        log.maintenance_status,
      ]
        .join(" ")
        .toLowerCase();
      return matchesOwner && matchesStatus && haystack.includes(normalized);
    });
  }, [hardwareLabel, logs, searchTerm, statusFilter, ownerFilter, currentUserName]);

  const rows = filteredLogs.map((log) => ({
    asset: hardwareLabel(log.hardware_id),
    issue: log.issue_description,
    technician: log.technician_name ?? "-",
    status: log.maintenance_status,
    actions: (
      <div className="flex flex-wrap items-center gap-2">
        <button
          className="text-xs font-semibold text-app-primary hover:underline"
          type="button"
          onClick={() => handleEdit(log)}
        >
          Edit
        </button>
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
          <button
            className="rounded border border-app-success/30 bg-app-success/10 px-2 py-0.5 text-xs font-semibold text-app-success transition hover:bg-app-success/20 disabled:opacity-50"
            type="button"
            disabled={updatingId === log.id}
            onClick={() => handleQuickStatus(log.id, "Resolved")}
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
          Technician
        </p>
        <h3 className="mt-2 text-xl font-semibold text-app-text">
          Work Orders
        </h3>
        <p className="mt-1 text-sm text-black/55">
          Log jobs, update status, and track your maintenance work.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-black/8 bg-white/88 px-4 py-3 shadow-sm shadow-black/5">
          <p className="text-[10px] uppercase tracking-[0.25em] text-black/40">
            Total
          </p>
          <p className="mt-1 text-2xl font-semibold text-app-text">
            {maintenanceStats.total}
          </p>
        </div>
        <div className="rounded-2xl border border-black/8 bg-white/88 px-4 py-3 shadow-sm shadow-black/5">
          <p className="text-[10px] uppercase tracking-[0.25em] text-black/40">
            Open
          </p>
          <p className="mt-1 text-2xl font-semibold text-app-danger">
            {maintenanceStats.open}
          </p>
        </div>
        <div className="rounded-2xl border border-black/8 bg-white/88 px-4 py-3 shadow-sm shadow-black/5">
          <p className="text-[10px] uppercase tracking-[0.25em] text-black/40">
            In Progress
          </p>
          <p className="mt-1 text-2xl font-semibold text-app-warning">
            {maintenanceStats.inProgress}
          </p>
        </div>
        <div className="rounded-2xl border border-black/8 bg-white/88 px-4 py-3 shadow-sm shadow-black/5">
          <p className="text-[10px] uppercase tracking-[0.25em] text-black/40">
            Resolved
          </p>
          <p className="mt-1 text-2xl font-semibold text-app-primary">
            {maintenanceStats.resolved}
          </p>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="space-y-4 rounded-3xl border border-black/8 bg-white/88 p-5 shadow-sm shadow-black/5">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-black/40">
              Maintenance
            </p>
            <h3 className="text-lg font-semibold text-app-text">Work Orders</h3>
            <p className="mt-1 text-sm text-black/50">
              Use Start / Resolve to update job status inline.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex overflow-hidden rounded-xl border border-black/10 bg-white text-sm">
              <button
                className={`px-3 py-2 font-medium transition ${ownerFilter === "mine" ? "bg-app-warning/10 text-app-warning" : "text-black/50 hover:bg-black/[0.03]"}`}
                type="button"
                onClick={() => setOwnerFilter("mine")}
              >
                My Work
              </button>
              <button
                className={`px-3 py-2 font-medium transition ${ownerFilter === "all" ? "bg-black/[0.04] text-app-text" : "text-black/50 hover:bg-black/[0.03]"}`}
                type="button"
                onClick={() => setOwnerFilter("all")}
              >
                All
              </button>
            </div>
            <input
              className="app-input rounded-xl px-3 py-2 text-sm"
              placeholder="Search logs"
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
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
            <button
              className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-black/60 transition hover:bg-black/[0.03]"
              type="button"
              onClick={handleExport}
            >
              Export CSV
            </button>
          </div>
          {errorMessage ? (
            <p className="rounded-lg bg-app-danger/10 px-3 py-2 text-xs text-app-danger">
              {errorMessage}
            </p>
          ) : null}
          {rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-black/10 bg-white/60 p-6 text-sm text-black/60">
              {logs.length === 0
                ? "No maintenance logs yet. Log your first job using the form."
                : "No logs match the current filters."}
            </div>
          ) : null}
          <DataTable columns={columns} rows={rows} />
        </section>

        <aside className="space-y-4 rounded-3xl border border-black/8 bg-white/88 p-5 shadow-sm shadow-black/5 xl:sticky xl:top-6 xl:self-start">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-black/40">
              {editingLog ? "Edit log" : "New log"}
            </p>
            <h3 className="text-lg font-semibold text-app-text">
              {editingLog ? "Update Work Order" : "Log a Job"}
            </h3>
            <p className="mt-1 text-sm text-black/50">
              {editingLog
                ? "Update the details for this maintenance record."
                : "Record a new issue or completed job."}
            </p>
          </div>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-[0.2em] text-black/40">
                Hardware Asset
              </label>
              <select
                className="app-input rounded-xl px-3 py-2 text-sm"
                value={formValues.hardware_id}
                onChange={(e) => handleChange("hardware_id", e.target.value)}
                required
              >
                <option value="">Select hardware</option>
                {hardwareOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.asset_id} - {option.device_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-[0.2em] text-black/40">
                Date
              </label>
              <input
                className="app-input rounded-xl px-3 py-2 text-sm"
                type="date"
                value={formValues.maintenance_date}
                onChange={(e) =>
                  handleChange("maintenance_date", e.target.value)
                }
                required
              />
            </div>
            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-[0.2em] text-black/40">
                Issue
              </label>
              <input
                className="app-input rounded-xl px-3 py-2 text-sm"
                type="text"
                placeholder="Describe the problem"
                value={formValues.issue_description}
                onChange={(e) =>
                  handleChange("issue_description", e.target.value)
                }
                required
              />
            </div>
            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-[0.2em] text-black/40">
                Action Taken
              </label>
              <input
                className="app-input rounded-xl px-3 py-2 text-sm"
                type="text"
                placeholder="What was done?"
                value={formValues.action_taken}
                onChange={(e) => handleChange("action_taken", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-[0.2em] text-black/40">
                Technician
              </label>
              <input
                className="app-input rounded-xl px-3 py-2 text-sm"
                type="text"
                value={formValues.technician_name}
                onChange={(e) =>
                  handleChange("technician_name", e.target.value)
                }
              />
            </div>
            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-[0.2em] text-black/40">
                Status
              </label>
              <select
                className="app-input rounded-xl px-3 py-2 text-sm"
                value={formValues.maintenance_status}
                onChange={(e) =>
                  handleChange("maintenance_status", e.target.value)
                }
              >
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                className="rounded-xl bg-app-warning px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-app-warning/20 transition hover:opacity-90 disabled:opacity-70"
                type="submit"
                disabled={isLoading}
              >
                {isLoading
                  ? "Saving..."
                  : editingLog
                    ? "Update Log"
                    : "Log Job"}
              </button>
              {editingLog ? (
                <button
                  className="rounded-xl border border-black/10 px-4 py-2 text-sm font-semibold text-black/60 transition hover:bg-black/[0.03]"
                  type="button"
                  onClick={resetForm}
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        </aside>
      </div>
    </div>
  );
}
