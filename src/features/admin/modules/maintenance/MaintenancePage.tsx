"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import { supabase } from "@/lib/supabaseClient";
import { parseCsv, toCsv } from "@/lib/csv";

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

type TechnicianProfile = {
  id: string;
  full_name: string;
};

type ActiveLog = {
  technician_id: string | null;
  maintenance_status: string;
};

const columns = [
  { key: "asset", label: "Asset" },
  { key: "issue", label: "Issue" },
  { key: "technician", label: "Technician" },
  { key: "status", label: "Status" },
  { key: "action_taken", label: "Action Taken" },
  { key: "actions", label: "Actions" },
];

export default function MaintenancePage() {
  const [hardwareOptions, setHardwareOptions] = useState<HardwareOption[]>([]);
  const [technicianOptions, setTechnicianOptions] = useState<TechnicianProfile[]>([]);
  const [activeLogCounts, setActiveLogCounts] = useState<Record<string, number>>({});
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [editingLog, setEditingLog] = useState<MaintenanceLog | null>(null);
  const [formValues, setFormValues] = useState({
    hardware_id: "",
    maintenance_date: "",
    issue_description: "",
    technician_id: "",
    maintenance_status: "Open",
  });

  const fetchLogs = async () =>
    supabase
      .from("maintenance_logs")
      .select("id, hardware_id, maintenance_date, issue_description, action_taken, technician_id, maintenance_status")
      .order("maintenance_date", { ascending: false });

  const loadLogs = async () => {
    const { data, error } = await fetchLogs();
    if (error) { setErrorMessage(error.message); return; }
    setLogs(data ?? []);
  };

  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      const [hardwareResult, logsResult, techResult, activeLogsResult] = await Promise.all([
        supabase.from("hardware_assets").select("id, asset_id, device_name").order("asset_id"),
        fetchLogs(),
        supabase.from("profiles").select("id, full_name").eq("role", "technician").order("full_name"),
        supabase.from("maintenance_logs").select("technician_id, maintenance_status").in("maintenance_status", ["Open", "In Progress"]),
      ]);

      if (!isMounted) return;

      if (hardwareResult.error) setErrorMessage(hardwareResult.error.message);
      else setHardwareOptions(hardwareResult.data ?? []);

      if (logsResult.error) setErrorMessage(logsResult.error.message);
      else setLogs(logsResult.data ?? []);

      if (techResult.data) setTechnicianOptions(techResult.data);

      if (activeLogsResult.data) {
        const counts: Record<string, number> = {};
        (activeLogsResult.data as ActiveLog[]).forEach((log) => {
          if (log.technician_id) {
            counts[log.technician_id] = (counts[log.technician_id] ?? 0) + 1;
          }
        });
        setActiveLogCounts(counts);
      }
    };

    void loadInitialData();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("maintenance-admin-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "maintenance_logs" }, () => {
        void loadLogs();
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (key: keyof typeof formValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setFormValues({
      hardware_id: "",
      maintenance_date: "",
      issue_description: "",
      technician_id: "",
      maintenance_status: "Open",
    });
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
      technician_id: formValues.technician_id || null,
      maintenance_status: formValues.maintenance_status,
    };

    const { error } = editingLog
      ? await supabase.from("maintenance_logs").update(payload).eq("id", editingLog.id)
      : await supabase.from("maintenance_logs").insert(payload);

    if (error) {
      setErrorMessage(error.message);
      setIsLoading(false);
      return;
    }

    if (payload.maintenance_status !== "Resolved") {
      await supabase.from("hardware_assets").update({ lifecycle_status: "Under Maintenance" }).eq("id", payload.hardware_id);
    } else {
      const { count } = await supabase
        .from("maintenance_logs")
        .select("id", { count: "exact", head: true })
        .eq("hardware_id", payload.hardware_id)
        .in("maintenance_status", ["Open", "In Progress", "Escalated"]);
      if ((count ?? 0) === 0) {
        await supabase.from("hardware_assets").update({ lifecycle_status: "Active" }).eq("id", payload.hardware_id);
      }
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
      technician_id: log.technician_id ?? "",
      maintenance_status: log.maintenance_status,
    });
  };

  const handleDelete = async (id: string) => {
    setErrorMessage(null);
    const logToDelete = logs.find((l) => l.id === id);
    const { error } = await supabase.from("maintenance_logs").delete().eq("id", id);

    if (error) { setErrorMessage(error.message); return; }

    setLogs((prev) => prev.filter((log) => log.id !== id));

    if (logToDelete) {
      const { count } = await supabase
        .from("maintenance_logs")
        .select("id", { count: "exact", head: true })
        .eq("hardware_id", logToDelete.hardware_id)
        .in("maintenance_status", ["Open", "In Progress", "Escalated"]);
      if ((count ?? 0) === 0) {
        await supabase.from("hardware_assets").update({ lifecycle_status: "Active" }).eq("id", logToDelete.hardware_id);
      }
    }
  };

  const hardwareLookup = useMemo(
    () => new Map(hardwareOptions.map((item) => [item.id, `${item.asset_id} - ${item.device_name}`])),
    [hardwareOptions],
  );

  const profileLookup = useMemo(
    () => new Map(technicianOptions.map((p) => [p.id, p.full_name])),
    [technicianOptions],
  );

  const hardwareLabel = useCallback(
    (hardwareId: string) => hardwareLookup.get(hardwareId) ?? "Unknown",
    [hardwareLookup],
  );

  const maintenanceHeaders = [
    "hardware_id", "asset_id", "maintenance_date",
    "issue_description", "action_taken", "technician_id", "maintenance_status",
  ];

  const resolveHardwareId = (hardwareId: string, assetId: string) => {
    if (hardwareId) return hardwareId;
    if (!assetId) return "";
    return hardwareOptions.find((o) => o.asset_id.toLowerCase() === assetId.toLowerCase())?.id ?? "";
  };

  const handleExport = () => {
    const rowsToExport = logs.map((log) => {
      const hw = hardwareOptions.find((item) => item.id === log.hardware_id);
      return {
        hardware_id: log.hardware_id,
        asset_id: hw?.asset_id ?? "",
        maintenance_date: log.maintenance_date,
        issue_description: log.issue_description,
        action_taken: log.action_taken ?? "",
        technician_id: log.technician_id ?? "",
        maintenance_status: log.maintenance_status,
      };
    });

    const csv = toCsv(maintenanceHeaders, rowsToExport);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "maintenance_logs.csv";
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportMessage(null);

    const text = await file.text();
    const rows = parseCsv(text);

    if (rows.length < 2) {
      setImportMessage("No data rows found in CSV.");
      setIsImporting(false);
      return;
    }

    const headers = rows[0].map((h) => h.trim().toLowerCase());
    const getValue = (row: string[], key: string) => {
      const index = headers.indexOf(key);
      return index === -1 ? "" : (row[index] ?? "").trim();
    };

    const payload = rows.slice(1).reduce<Array<Record<string, string | null>>>((acc, row) => {
      const resolvedHardwareId = resolveHardwareId(getValue(row, "hardware_id"), getValue(row, "asset_id"));
      const maintenanceDate = getValue(row, "maintenance_date");
      const issue = getValue(row, "issue_description");

      if (!resolvedHardwareId || !maintenanceDate || !issue) return acc;

      acc.push({
        hardware_id: resolvedHardwareId,
        maintenance_date: maintenanceDate,
        issue_description: issue,
        action_taken: getValue(row, "action_taken") || null,
        technician_id: getValue(row, "technician_id") || null,
        maintenance_status: getValue(row, "maintenance_status") || "Open",
      });
      return acc;
    }, []);

    if (payload.length === 0) {
      setImportMessage("No valid rows found. Check hardware IDs.");
      setIsImporting(false);
      return;
    }

    const { error } = await supabase.from("maintenance_logs").insert(payload);

    if (error) {
      setImportMessage(error.message);
      setIsImporting(false);
      return;
    }

    setImportMessage(`Imported ${payload.length} maintenance logs.`);
    setIsImporting(false);
    await loadLogs();
  };

  const filteredLogs = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    return logs.filter((log) => {
      const matchesStatus = statusFilter === "All" || log.maintenance_status === statusFilter;
      if (!normalized) return matchesStatus;
      const techName = profileLookup.get(log.technician_id ?? "") ?? "";
      const haystack = [hardwareLabel(log.hardware_id), log.issue_description, techName, log.maintenance_status]
        .join(" ").toLowerCase();
      return matchesStatus && haystack.includes(normalized);
    });
  }, [hardwareLabel, logs, profileLookup, searchTerm, statusFilter]);

  const maintenanceStats = useMemo(() => ({
    total: logs.length,
    open: logs.filter((l) => l.maintenance_status === "Open").length,
    inProgress: logs.filter((l) => l.maintenance_status === "In Progress").length,
    resolved: logs.filter((l) => l.maintenance_status === "Resolved").length,
  }), [logs]);

  const rows = filteredLogs.map((log) => ({
    asset: hardwareLabel(log.hardware_id),
    issue: log.issue_description,
    technician: profileLookup.get(log.technician_id ?? "") ?? "-",
    status: <StatusBadge status={log.maintenance_status} />,
    action_taken: log.action_taken ? (
      <span className="block max-w-[180px] truncate text-xs text-black/60" title={log.action_taken}>
        {log.action_taken}
      </span>
    ) : (
      <span className="text-xs italic text-black/30">—</span>
    ),
    actions: (
      <div className="flex items-center gap-3">
        <button className="text-xs font-semibold text-app-primary" type="button" onClick={() => handleEdit(log)}>
          Edit
        </button>
        <button className="text-xs font-semibold text-app-danger" type="button" onClick={() => handleDelete(log.id)}>
          Delete
        </button>
      </div>
    ),
  }));

  const emptyMessage = logs.length === 0
    ? "No maintenance logs yet. Create a work order to get started."
    : "No maintenance logs match the current filters.";

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-black/5 bg-white/90 p-6 shadow-sm shadow-black/5">
        <p className="text-[10px] uppercase tracking-[0.3em] text-black/40">Maintenance</p>
        <div className="mt-3">
          <h3 className="text-xl font-semibold text-app-text">Work Orders</h3>
          <p className="mt-1 text-sm text-black/50">Create, update, and resolve service tickets.</p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-black/5 bg-white px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.25em] text-black/40">Total</p>
            <p className="mt-1 text-2xl font-semibold text-app-text">{maintenanceStats.total}</p>
          </div>
          <div className="rounded-2xl border border-black/5 bg-white px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.25em] text-black/40">Open</p>
            <p className="mt-1 text-2xl font-semibold text-app-danger">{maintenanceStats.open}</p>
          </div>
          <div className="rounded-2xl border border-black/5 bg-white px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.25em] text-black/40">In Progress</p>
            <p className="mt-1 text-2xl font-semibold text-app-warning">{maintenanceStats.inProgress}</p>
          </div>
          <div className="rounded-2xl border border-black/5 bg-white px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.25em] text-black/40">Resolved</p>
            <p className="mt-1 text-2xl font-semibold text-app-primary">{maintenanceStats.resolved}</p>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-3xl border border-black/5 bg-white/80 p-5 shadow-sm shadow-black/5">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-black/40">Maintenance</p>
          <h3 className="text-lg font-semibold text-app-text">Work Orders</h3>
          <p className="mt-1 text-sm text-black/50">Filter and manage maintenance logs.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            className="rounded-lg border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-app-primary/15"
            placeholder="Search logs"
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="rounded-lg border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-app-primary/15"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All statuses</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Escalated">Escalated</option>
            <option value="Resolved">Resolved</option>
          </select>
          <button
            className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-black/60"
            type="button"
            onClick={handleExport}
          >
            Export CSV
          </button>
          <label className="cursor-pointer rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-black/60">
            <input accept=".csv" className="hidden" type="file" onChange={handleImport} />
            {isImporting ? "Importing..." : "Import CSV"}
          </label>
        </div>
        {importMessage ? (
          <p className="rounded-lg bg-app-primary/10 px-3 py-2 text-xs text-app-primary">{importMessage}</p>
        ) : null}
        {errorMessage ? (
          <p className="rounded-lg bg-app-danger/10 px-3 py-2 text-xs text-app-danger">{errorMessage}</p>
        ) : null}
        {logs.filter((l) => l.maintenance_status === "Escalated").length > 0 ? (
          <div className="rounded-xl border border-app-danger/30 bg-app-danger/8 px-4 py-3">
            <p className="text-xs font-semibold text-app-danger">
              {logs.filter((l) => l.maintenance_status === "Escalated").length} escalated job{logs.filter((l) => l.maintenance_status === "Escalated").length > 1 ? "s" : ""} need your attention
            </p>
            <p className="mt-0.5 text-xs text-app-danger/70">
              The assigned technician could not resolve these units. Reassign to another technician by editing the job and setting the status back to Open, or update the hardware lifecycle status if the unit needs to be retired.
            </p>
          </div>
        ) : null}
        <form
          className="grid gap-4 rounded-2xl border border-black/5 bg-white p-6 shadow-sm md:grid-cols-2"
          onSubmit={handleSubmit}
        >
          <div className="grid gap-2">
            <label className="text-xs uppercase tracking-[0.2em] text-black/40">Hardware Asset</label>
            <select
              className="rounded-lg border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-app-primary/15"
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
            <label className="text-xs uppercase tracking-[0.2em] text-black/40">Maintenance Date</label>
            <input
              className="rounded-lg border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-app-primary/15"
              type="date"
              value={formValues.maintenance_date}
              onChange={(e) => handleChange("maintenance_date", e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2 md:col-span-2">
            <label className="text-xs uppercase tracking-[0.2em] text-black/40">Issue Description</label>
            <input
              className="rounded-lg border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-app-primary/15"
              type="text"
              value={formValues.issue_description}
              onChange={(e) => handleChange("issue_description", e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <label className="text-xs uppercase tracking-[0.2em] text-black/40">Assign Technician</label>
            <select
              className="rounded-lg border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-app-primary/15"
              value={formValues.technician_id}
              onChange={(e) => handleChange("technician_id", e.target.value)}
            >
              <option value="">Unassigned</option>
              {technicianOptions.map((tech) => {
                const jobs = activeLogCounts[tech.id] ?? 0;
                return (
                  <option key={tech.id} value={tech.id}>
                    {tech.full_name}{jobs > 0 ? ` (${jobs} active job${jobs > 1 ? "s" : ""})` : " · Available"}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="grid gap-2">
            <label className="text-xs uppercase tracking-[0.2em] text-black/40">Status</label>
            <select
              className="rounded-lg border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-app-primary/15"
              value={formValues.maintenance_status}
              onChange={(e) => handleChange("maintenance_status", e.target.value)}
            >
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Escalated">Escalated</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <div className="flex flex-wrap items-center gap-3">
              <button
                className="rounded-lg bg-app-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? "Saving..." : editingLog ? "Update Log" : "Add Maintenance Log"}
              </button>
              {editingLog ? (
                <button
                  className="rounded-lg border border-black/10 px-4 py-2 text-sm font-semibold text-black/60"
                  type="button"
                  onClick={resetForm}
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </div>
        </form>
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/10 bg-white/60 p-6 text-sm text-black/60">
            {emptyMessage}
          </div>
        ) : null}
        <DataTable columns={columns} rows={rows} />
      </section>
    </div>
  );
}
