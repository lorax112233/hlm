"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import DataTable from "@/components/DataTable";
import HardwareForm from "@/components/HardwareForm";
import { supabase } from "@/lib/supabaseClient";
import { parseCsv, toCsv } from "@/lib/csv";

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

const columns = [
  { key: "asset", label: "Asset" },
  { key: "name", label: "Device" },
  { key: "type", label: "Type" },
  { key: "status", label: "Status" },
  { key: "owner", label: "Assigned" },
  { key: "actions", label: "Actions" },
];

export default function HardwarePage() {
  const [assets, setAssets] = useState<HardwareAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editingAsset, setEditingAsset] = useState<HardwareAsset | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const loadAssets = async () => {
    const { data, error } = await supabase
      .from("hardware_assets")
      .select(
        "id, asset_id, device_name, device_type, lifecycle_status, serial_number, purchase_date, warranty_expiry, assigned_to",
      )
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setAssets(data ?? []);
  };

  useEffect(() => {
    loadAssets();
  }, []);

  const recordLifecycleChange = async (
    assetId: string,
    oldStatus: string | null,
    newStatus: string,
  ) => {
    const { data } = await supabase.auth.getUser();
    const changedBy = data.user?.email ?? "system";

    await supabase.from("lifecycle_history").insert({
      hardware_id: assetId,
      old_status: oldStatus,
      new_status: newStatus,
      changed_by: changedBy,
      changed_at: new Date().toISOString(),
    });
  };

  const handleCreate = async (values: {
    asset_id: string;
    device_name: string;
    device_type: string;
    serial_number: string;
    lifecycle_status: string;
    purchase_date: string;
    warranty_expiry: string;
    assigned_to: string;
  }) => {
    setIsLoading(true);
    setErrorMessage(null);

    const { data, error } = await supabase
      .from("hardware_assets")
      .insert({
      asset_id: values.asset_id,
      device_name: values.device_name,
      device_type: values.device_type,
      serial_number: values.serial_number || null,
      lifecycle_status: values.lifecycle_status,
        purchase_date: values.purchase_date || null,
        warranty_expiry: values.warranty_expiry || null,
        assigned_to: values.assigned_to || null,
      })
      .select("id, lifecycle_status")
      .single();

    if (error) {
      setErrorMessage(error.message);
      setIsLoading(false);
      return;
    }

    if (data) {
      await recordLifecycleChange(data.id, null, data.lifecycle_status);
    }

    await loadAssets();
    setIsLoading(false);
  };

  const handleUpdate = async (values: {
    asset_id: string;
    device_name: string;
    device_type: string;
    serial_number: string;
    lifecycle_status: string;
    purchase_date: string;
    warranty_expiry: string;
    assigned_to: string;
  }) => {
    if (!editingAsset) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const { error } = await supabase
      .from("hardware_assets")
      .update({
        asset_id: values.asset_id,
        device_name: values.device_name,
        device_type: values.device_type,
        serial_number: values.serial_number || null,
        lifecycle_status: values.lifecycle_status,
        purchase_date: values.purchase_date || null,
        warranty_expiry: values.warranty_expiry || null,
        assigned_to: values.assigned_to || null,
      })
      .eq("id", editingAsset.id);

    if (error) {
      setErrorMessage(error.message);
      setIsLoading(false);
      return;
    }

    if (editingAsset.lifecycle_status !== values.lifecycle_status) {
      await recordLifecycleChange(
        editingAsset.id,
        editingAsset.lifecycle_status,
        values.lifecycle_status,
      );
    }

    await loadAssets();
    setEditingAsset(null);
    setIsLoading(false);
  };

  const handleDelete = async (id: string) => {
    setErrorMessage(null);
    const { error } = await supabase
      .from("hardware_assets")
      .delete()
      .eq("id", id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setAssets((prev) => prev.filter((asset) => asset.id !== id));
  };

  const hardwareHeaders = [
    "asset_id",
    "device_name",
    "device_type",
    "lifecycle_status",
    "serial_number",
    "purchase_date",
    "warranty_expiry",
    "assigned_to",
  ];

  const handleExport = () => {
    const rowsToExport = assets.map((asset) => ({
      asset_id: asset.asset_id,
      device_name: asset.device_name,
      device_type: asset.device_type,
      lifecycle_status: asset.lifecycle_status,
      serial_number: asset.serial_number ?? "",
      purchase_date: asset.purchase_date ?? "",
      warranty_expiry: asset.warranty_expiry ?? "",
      assigned_to: asset.assigned_to ?? "",
    }));

    const csv = toCsv(hardwareHeaders, rowsToExport);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "hardware_assets.csv";
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
        const assetId = getValue(row, "asset_id");
        const deviceName = getValue(row, "device_name");
        const deviceType = getValue(row, "device_type");

        if (!assetId || !deviceName || !deviceType) {
          return acc;
        }

        acc.push({
          asset_id: assetId,
          device_name: deviceName,
          device_type: deviceType,
          lifecycle_status: getValue(row, "lifecycle_status") || "Active",
          serial_number: getValue(row, "serial_number") || null,
          purchase_date: getValue(row, "purchase_date") || null,
          warranty_expiry: getValue(row, "warranty_expiry") || null,
          assigned_to: getValue(row, "assigned_to") || null,
        });

        return acc;
      },
      [],
    );

    if (payload.length === 0) {
      setImportMessage("No valid rows found. Ensure required columns exist.");
      setIsImporting(false);
      return;
    }

    const { error } = await supabase.from("hardware_assets").insert(payload);

    if (error) {
      setImportMessage(error.message);
      setIsImporting(false);
      return;
    }

    setImportMessage(`Imported ${payload.length} assets.`);
    setIsImporting(false);
    await loadAssets();
  };

  const filteredAssets = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();

    return assets.filter((asset) => {
      const matchesStatus =
        statusFilter === "All" || asset.lifecycle_status === statusFilter;

      if (!normalized) {
        return matchesStatus;
      }

      const haystack = [
        asset.asset_id,
        asset.device_name,
        asset.device_type,
        asset.lifecycle_status,
        asset.assigned_to ?? "",
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
    status: asset.lifecycle_status,
    owner: asset.assigned_to ?? "-",
    actions: (
      <div className="flex items-center gap-3">
        <Link
          className="text-xs font-semibold text-app-text"
          href={`/hardware/${asset.id}`}
        >
          View
        </Link>
        <button
          className="text-xs font-semibold text-app-primary"
          type="button"
          onClick={() => setEditingAsset(asset)}
        >
          Edit
        </button>
        <button
          className="text-xs font-semibold text-app-danger"
          type="button"
          onClick={() => handleDelete(asset.id)}
        >
          Delete
        </button>
      </div>
    ),
  }));

  const emptyMessage =
    assets.length === 0
      ? "No hardware assets yet. Add your first device using the form."
      : "No assets match the current filters.";

  return (
    <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
      <div className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-black/40">Hardware</p>
          <h3 className="text-lg font-semibold text-app-text">Asset List</h3>
          <p className="mt-1 text-sm text-black/50">
            View, update, and manage all registered devices.
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
            <option value="New">New</option>
            <option value="Active">Active</option>
            <option value="Under Maintenance">Under Maintenance</option>
            <option value="Retired">Retired</option>
            <option value="Disposed">Disposed</option>
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
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/10 bg-white/60 p-6 text-sm text-black/60">
            {emptyMessage}
          </div>
        ) : null}
        <DataTable columns={columns} rows={rows} />
      </div>
      <div className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-black/40">Add asset</p>
          <h3 className="text-lg font-semibold text-app-text">New Hardware</h3>
          <p className="mt-1 text-sm text-black/50">
            Capture asset details for tracking and warranty monitoring.
          </p>
        </div>
        <HardwareForm
          onSubmit={editingAsset ? handleUpdate : handleCreate}
          isLoading={isLoading}
          errorMessage={errorMessage}
          initialValues={
            editingAsset
              ? {
                  asset_id: editingAsset.asset_id,
                  device_name: editingAsset.device_name,
                  device_type: editingAsset.device_type,
                  serial_number: editingAsset.serial_number ?? "",
                  lifecycle_status: editingAsset.lifecycle_status,
                  purchase_date: editingAsset.purchase_date ?? "",
                  warranty_expiry: editingAsset.warranty_expiry ?? "",
                  assigned_to: editingAsset.assigned_to ?? "",
                }
              : undefined
          }
          submitLabel={editingAsset ? "Update Hardware" : "Save Hardware"}
          onCancel={editingAsset ? () => setEditingAsset(null) : undefined}
        />
      </div>
    </div>
  );
}
