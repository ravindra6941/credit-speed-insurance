"use client";
import { useState } from "react";
import { Retailer } from "@/lib/types";
import { INDIA_STATES } from "@/lib/states";
import Field from "@/components/Field";

export type RetailerFormValues = {
  shop_name: string;
  owner_name: string | null;
  gst_number: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  pin_code: string | null;
  address: string | null;
  status: "enabled" | "disabled";
};

export default function RetailerForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial: Retailer | null;
  onSubmit: (v: RetailerFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<RetailerFormValues>({
    shop_name: initial?.shop_name ?? "",
    owner_name: initial?.owner_name ?? "",
    gst_number: initial?.gst_number ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    city: initial?.city ?? "",
    state: initial?.state ?? "Uttar Pradesh",
    pin_code: initial?.pin_code ?? "",
    address: initial?.address ?? "",
    status: initial?.status ?? "enabled",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof RetailerFormValues>(k: K, v: RetailerFormValues[K]) =>
    setValues((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Shop Name" required>
          <input
            type="text"
            required
            value={values.shop_name}
            onChange={(e) => set("shop_name", e.target.value)}
            placeholder="e.g. Jagdamba Mobile"
            className="input-field"
          />
        </Field>

        <Field label="Owner Name">
          <input
            type="text"
            value={values.owner_name ?? ""}
            onChange={(e) => set("owner_name", e.target.value)}
            placeholder="Shop owner full name"
            className="input-field"
          />
        </Field>

        <Field label="Phone">
          <input
            type="tel"
            value={values.phone ?? ""}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="+91 98XXX XXXXX"
            className="input-field"
          />
        </Field>

        <Field label="Email">
          <input
            type="email"
            value={values.email ?? ""}
            onChange={(e) => set("email", e.target.value)}
            placeholder="shop@example.com"
            className="input-field"
          />
        </Field>

        <Field label="GST Number" hint="15-character GSTIN if available">
          <input
            type="text"
            value={values.gst_number ?? ""}
            onChange={(e) => set("gst_number", e.target.value.toUpperCase())}
            placeholder="08XXXXXXXXXXXXX"
            maxLength={15}
            className="input-field font-mono"
          />
        </Field>

        <Field label="Status">
          <select
            value={values.status}
            onChange={(e) => set("status", e.target.value as "enabled" | "disabled")}
            className="input-field"
          >
            <option value="enabled" className="bg-[#0A1628]">Enabled</option>
            <option value="disabled" className="bg-[#0A1628]">Disabled</option>
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="City">
          <input
            type="text"
            value={values.city ?? ""}
            onChange={(e) => set("city", e.target.value)}
            placeholder="e.g. Kanpur"
            className="input-field"
          />
        </Field>

        <Field label="State">
          <select
            value={values.state ?? ""}
            onChange={(e) => set("state", e.target.value)}
            className="input-field"
          >
            {INDIA_STATES.map((s) => (
              <option key={s} value={s} className="bg-[#0A1628]">
                {s}
              </option>
            ))}
          </select>
        </Field>

        <Field label="PIN Code">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            value={values.pin_code ?? ""}
            onChange={(e) => set("pin_code", e.target.value.replace(/\D/g, ""))}
            placeholder="208001"
            className="input-field font-mono"
          />
        </Field>
      </div>

      <Field label="Address">
        <textarea
          rows={2}
          value={values.address ?? ""}
          onChange={(e) => set("address", e.target.value)}
          placeholder="Full shop address"
          className="input-field resize-none"
        />
      </Field>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="btn-gold disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving ? "Saving..." : initial ? "Save changes" : "Add retailer"}
        </button>
      </div>
    </form>
  );
}
