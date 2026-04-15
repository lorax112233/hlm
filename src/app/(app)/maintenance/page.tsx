"use client";

import { useEffect, useMemo, useState } from "react";
import DataTable from "@/components/DataTable";
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

export default function MaintenancePage() {
  const [hardwareOptions, setHardwareOptions] = useState<HardwareOption[]>([]);
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
    action_taken: "",
    technician_name: "",
    maintenance_status: "Open",
  });

  const loadHardwareOptions = async () => {
    const { data, error } = await supabase
      .from("hardware_assets")
      .select("id, asset_id, device_name")
      .order("asset_id", { ascending: true });

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setHardwareOptions(data ?? []);
  };

  const loadLogs = async () => {
    const { data, error } = await supabase
      .from("maintenance_logs")
      .select(
        "id, hardware_id, maintenance_date, issue_description, action_taken, technician_name, maintenance_status",
      )
      .order("maintenance_date", { ascending: false });

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setLogs(data ?? []);
  };

  useEffect(() => {
    loadHardwareOptions();
    loadLogs();
  }, []);

  const handleChange = (key: keyof typeof formValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setFormValues({
      hardware_id: "",
      maintenance_date: "",
      issue_description: "",
      action_taken: "",
      technician_name: "",
      maintenance_status: "Open",
    });
    setEditingLog(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
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
      technician_name: log.technician_name ?? "",
      maintenance_status: log.maintenance_status,
    });
  };

  const handleDelete = async (id: string) => {
    setErrorMessage(null);
    const { error } = await supabase
      .from("maintenance_logs")
      .delete()
      .eq("id", id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setLogs((prev) => prev.filter((log) => log.id !== id));
  };

  const hardwareLabel = (hardwareId: string) => {
    const match = hardwareOptions.find((item) => item.id === hardwareId);
    return match ? `${match.asset_id} - ${match.device_name}` : "Unknown";
  };

  const maintenanceHeaders = [
    "hardware_id",
    "asset_id",
    "maintenance_date",
    "issue_description",
    "action_taken",
    "technician_name",
    "maintenance_status",
  ];

  const resolveHardwareId = (hardwareId: string, assetId: string) => {
    if (hardwareId) {
      return hardwareId;
    }

    if (!assetId) {
      return "";
    }

    const match = hardwareOptions.find(
      (option) => option.asset_id.toLowerCase() === assetId.toLowerCase(),
    );
    return match?.id ?? "";
  };

  const handleExport = () => {
    const rowsToExport = logs.map((log) => {
      const label = hardwareOptions.find((item) => item.id === log.hardware_id);

      return {
        hardware_id: log.hardware_id,
        asset_id: label?.asset_id ?? "",
        maintenance_date: log.maintenance_date,
        issue_description: log.issue_description,
        action_taken: log.action_taken ?? "",
        technician_name: log.technician_name ?? "",
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
    if (!file) {
      return;
    }

    setIsImporting(true);
    setImportMessage(null);

    const text = await file.text();
    const rows = parseCsv(text);

    if (rows.length < 2) {
      setImportMessage("No data rows found in CSV.");
      setIsImporting(false);
      return;
    }

    const headers = rows[0].map((header) => header.trim().toLowerCase());
    const getValue = (row: string[], key: string) => {
      const index = headers.indexOf(key);
      if (index === -1) {
        return "";
      }
      return (row[index] ?? "").trim();
    };

    const payload = rows.slice(1).reduce<Array<Record<string, string | null>>>(
      (acc, row) => {
        const hardwareId = getValue(row, "hardware_id");
        const assetId = getValue(row, "asset_id");
        const resolvedHardwareId = resolveHardwareId(hardwareId, assetId);
        const maintenanceDate = getValue(row, "maintenance_date");
        const issue = getValue(row, "issue_description");

        if (!resolvedHardwareId || !maintenanceDate || !issue) {
          return acc;
        }

        acc.push({
          hardware_id: resolvedHardwareId,
          maintenance_date: maintenanceDate,
          issue_description: issue,
          action_taken: getValue(row, "action_taken") || null,
          technician_name: getValue(row, "technician_name") || null,
          maintenance_status: getValue(row, "maintenance_status") || "Open",
        });

        return acc;
      },
      [],
    );

    if (payload.length === 0) {
      setImportMessage("No valid rows found. Check hardware IDs or asset IDs.");
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
      const matchesStatus =
        statusFilter === "All" || log.maintenance_status === statusFilter;

      if (!normalized) {
        return matchesStatus;
      }

      const label = hardwareLabel(log.hardware_id);
      const haystack = [
        label,
        log.issue_description,
        log.technician_name ?? "",
        log.maintenance_status,
      ]
        .join(" ")
        .toLowerCase();

      return matchesStatus && haystack.includes(normalized);
    });
  }, [hardwareOptions, logs, searchTerm, statusFilter]);

  const rows = filteredLogs.map((log) => ({
    asset: hardwareLabel(log.hardware_id),
    issue: log.issue_description,
    technician: log.technician_name ?? "-",
    status: log.maintenance_status,
    actions: (
      <div className="flex items-center gap-3">
        <button
          className="text-xs font-semibold text-app-primary"
          type="button"
          onClick={() => handleEdit(log)}
        >
          Edit
        </button>
        <button
          className="text-xs font-semibold text-app-danger"
          type="button"
          onClick={() => handleDelete(log.id)}
        >
          Delete
        </button>
      </div>
    ),
  }));

  const emptyMessage =
    logs.length === 0
      ? "No maintenance logs yet. Create a work order to get started."
      : "No maintenance logs match the current filters.";

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-black/40">Maintenance</p>
        <h3 className="text-lg font-semibold text-app-text">Work Orders</h3>
        <p className="mt-1 text-sm text-black/50">
          Log service work, assign technicians, and track status.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <input
          className="rounded-lg border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-app-primary/15"
          placeholder="Search logs"
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
          <option value="Open">Open</option>
          <option value="In Progress">In Progress</option>
          <option value="Resolved">Resolved</option>
        </select>
        <button
          className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-black/60"
          type="button"
          onClick={handleExport}
        >
          Export CSV
        </button>
        <label className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-black/60">
          <input
            accept=".csv"
            className="hidden"
            type="file"
            onChange={handleImport}
          />
          {isImporting ? "Importing..." : "Import CSV"}
        </label>
      </div>
      {importMessage ? (
        <p className="rounded-lg bg-app-primary/10 px-3 py-2 text-xs text-app-primary">
          {importMessage}
        </p>
      ) : null}
      {errorMessage ? (
        <p className="rounded-lg bg-app-danger/10 px-3 py-2 text-xs text-app-danger">
          {errorMessage}
        </p>
      ) : null}
      <form
        className="grid gap-4 rounded-2xl border border-black/5 bg-white p-6 shadow-sm md:grid-cols-2"
        onSubmit={handleSubmit}
      >
        <div className="grid gap-2">
          <label className="text-xs uppercase tracking-[0.2em] text-black/40">
            Hardware Asset
          </label>
          <select
            className="rounded-lg border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-app-primary/15"
            value={formValues.hardware_id}
            onChange={(event) => handleChange("hardware_id", event.target.value)}
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
            Maintenance Date
          </label>
          <input
            className="rounded-lg border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-app-primary/15"
            type="date"
            value={formValues.maintenance_date}
            onChange={(event) =>
              handleChange("maintenance_date", event.target.value)
            }
            required
          />
        </div>
        <div className="grid gap-2 md:col-span-2">
          <label className="text-xs uppercase tracking-[0.2em] text-black/40">
            Issue Description
          </label>
          <input
            className="rounded-lg border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-app-primary/15"
            type="text"
            value={formValues.issue_description}
            onChange={(event) =>
              handleChange("issue_description", event.target.value)
            }
            required
          />
        </div>
        <div className="grid gap-2">
          <label className="text-xs uppercase tracking-[0.2em] text-black/40">
            Action Taken
          </label>
          <input
            className="rounded-lg border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-app-primary/15"
            type="text"
            value={formValues.action_taken}
            onChange={(event) =>
              handleChange("action_taken", event.target.value)
            }
          />
        </div>
        <div className="grid gap-2">
          <label className="text-xs uppercase tracking-[0.2em] text-black/40">
            Technician Name
          </label>
          <input
            className="rounded-lg border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-app-primary/15"
            type="text"
            value={formValues.technician_name}
            onChange={(event) =>
              handleChange("technician_name", event.target.value)
            }
          />
        </div>
        <div className="grid gap-2">
          <label className="text-xs uppercase tracking-[0.2em] text-black/40">
            Status
          </label>
          <select
            className="rounded-lg border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-app-primary/15"
            value={formValues.maintenance_status}
            onChange={(event) =>
              handleChange("maintenance_status", event.target.value)
            }
          >
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
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
              {isLoading
                ? "Saving..."
                : editingLog
                  ? "Update Log"
                  : "Add Maintenance Log"}
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
    </div>
  );
}
