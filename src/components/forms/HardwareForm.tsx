"use client";

import { useState } from "react";

type HardwareFormValues = {
  asset_id: string;
  device_name: string;
  device_type: string;
  serial_number: string;
  lifecycle_status: string;
  purchase_date: string;
  warranty_expiry: string;
  assigned_to: string;
};

type HardwareFormProps = {
  onSubmit: (values: HardwareFormValues) => Promise<void>;
  isLoading?: boolean;
  errorMessage?: string | null;
  initialValues?: Partial<HardwareFormValues>;
  submitLabel?: string;
  onCancel?: () => void;
};

const defaultValues: HardwareFormValues = {
  asset_id: "",
  device_name: "",
  device_type: "",
  serial_number: "",
  lifecycle_status: "Active",
  purchase_date: "",
  warranty_expiry: "",
  assigned_to: "",
};

const buildInitialValues = (
  initialValues?: Partial<HardwareFormValues>,
): HardwareFormValues => ({
  ...defaultValues,
  ...initialValues,
});

export default function HardwareForm({
  onSubmit,
  isLoading = false,
  errorMessage,
  initialValues,
  submitLabel = "Save Hardware",
  onCancel,
}: HardwareFormProps) {
  const [values, setValues] = useState<HardwareFormValues>(() =>
    buildInitialValues(initialValues),
  );

  const handleChange = (
    key: keyof HardwareFormValues,
    value: string,
  ) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit(values);
    setValues(defaultValues);
  };

  return (
    <form
      className="grid gap-4 rounded-2xl border border-black/8 bg-white/92 p-6 shadow-sm shadow-black/8 md:grid-cols-2"
      onSubmit={handleSubmit}
    >
      <div className="grid gap-2">
        <label className="text-xs uppercase tracking-[0.2em] text-black/40">
          Asset ID
        </label>
        <input
          className="app-input rounded-xl px-3 py-2.5 text-sm"
          placeholder="AST-0001"
          type="text"
          value={values.asset_id}
          onChange={(event) => handleChange("asset_id", event.target.value)}
          required
        />
      </div>
      <div className="grid gap-2 md:col-span-2">
        <label className="text-xs uppercase tracking-[0.2em] text-black/40">
          Device Name
        </label>
        <input
          className="app-input rounded-xl px-3 py-2.5 text-sm"
          placeholder="Lenovo ThinkPad T14"
          type="text"
          value={values.device_name}
          onChange={(event) => handleChange("device_name", event.target.value)}
          required
        />
      </div>
      <div className="grid gap-2">
        <label className="text-xs uppercase tracking-[0.2em] text-black/40">
          Device Type
        </label>
        <input
          className="app-input rounded-xl px-3 py-2.5 text-sm"
          placeholder="Laptop"
          type="text"
          value={values.device_type}
          onChange={(event) => handleChange("device_type", event.target.value)}
          required
        />
      </div>
      <div className="grid gap-2">
        <label className="text-xs uppercase tracking-[0.2em] text-black/40">
          Assigned To
        </label>
        <input
          className="app-input rounded-xl px-3 py-2.5 text-sm"
          placeholder="Alex Rivera"
          type="text"
          value={values.assigned_to}
          onChange={(event) => handleChange("assigned_to", event.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <label className="text-xs uppercase tracking-[0.2em] text-black/40">
          Purchase Date
        </label>
        <input
          className="app-input rounded-xl px-3 py-2.5 text-sm"
          type="date"
          value={values.purchase_date}
          onChange={(event) => handleChange("purchase_date", event.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <label className="text-xs uppercase tracking-[0.2em] text-black/40">
          Warranty Expiry
        </label>
        <input
          className="app-input rounded-xl px-3 py-2.5 text-sm"
          type="date"
          value={values.warranty_expiry}
          onChange={(event) => handleChange("warranty_expiry", event.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <label className="text-xs uppercase tracking-[0.2em] text-black/40">
          Lifecycle Status
        </label>
        <select
          className="app-input rounded-xl px-3 py-2.5 text-sm"
          value={values.lifecycle_status}
          onChange={(event) =>
            handleChange("lifecycle_status", event.target.value)
          }
          required
        >
          <option value="New">New</option>
          <option value="Active">Active</option>
          <option value="Under Maintenance">Under Maintenance</option>
          <option value="Retired">Retired</option>
          <option value="Disposed">Disposed</option>
        </select>
      </div>
      <div className="grid gap-2">
        <label className="text-xs uppercase tracking-[0.2em] text-black/40">
          Serial Number
        </label>
        <input
          className="app-input rounded-xl px-3 py-2.5 text-sm"
          placeholder="SN-123456"
          type="text"
          value={values.serial_number}
          onChange={(event) =>
            handleChange("serial_number", event.target.value)
          }
        />
      </div>
      {errorMessage ? (
        <p className="rounded-lg bg-app-danger/10 px-3 py-2 text-xs text-app-danger md:col-span-2">
          {errorMessage}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3 md:col-span-2">
        <button
          className="app-btn-primary rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? "Saving..." : submitLabel}
        </button>
        {onCancel ? (
          <button
            className="rounded-xl border border-black/12 bg-white px-4 py-2.5 text-sm font-semibold text-black/60"
            type="button"
            onClick={onCancel}
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}
