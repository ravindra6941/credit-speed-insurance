"use client";
import { useState } from "react";
import { Plan } from "@/lib/types";

export type PlanFormValues = {
  name: string;
  type: Plan["type"];
  gst_percentage: number;
  plan_amount: number;
  duration_months: number;
  coverage_notes: string | null;
  status: "enabled" | "disabled";
};

const PLAN_TYPES: { value: Plan["type"]; label: string }[] = [
  { value: "extended_warranty", label: "Extended Warranty" },
  { value: "screen_damage", label: "Screen Damage" },
  { value: "standard_protection", label: "Standard Protection" },
  { value: "iphone_protection", label: "iPhone Protection" },
  { value: "custom", label: "Custom" },
];

export default function PlanForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial: Plan | null;
  onSubmit: (v: PlanFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<PlanFormValues>({
    name: initial?.name ?? "",
    type: initial?.type ?? "extended_warranty",
    gst_percentage: initial?.gst_percentage ?? 18,
    plan_amount: initial?.plan_amount ?? 0,
    duration_months: initial?.duration_months ?? 12,
    coverage_notes: initial?.coverage_notes ?? "",
    status: initial?.status ?? "enabled",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof PlanFormValues>(k: K, v: PlanFormValues[K]) =>
    setValues((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save plan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-[11px] font-semibold tracking-[0.18em] uppercase text-white/45 mb-2">
          Plan Name *
        </label>
        <input
          type="text"
          required
          value={values.name}
          onChange={(e) => set("name", e.target.value.toUpperCase())}
          placeholder="EXTENDED WARRANTY"
          className="input-field"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] font-semibold tracking-[0.18em] uppercase text-white/45 mb-2">
            Type *
          </label>
          <select
            required
            value={values.type}
            onChange={(e) => set("type", e.target.value as Plan["type"])}
            className="input-field"
          >
            {PLAN_TYPES.map((t) => (
              <option key={t.value} value={t.value} className="bg-[#0A1628]">
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold tracking-[0.18em] uppercase text-white/45 mb-2">
            Status
          </label>
          <select
            value={values.status}
            onChange={(e) => set("status", e.target.value as "enabled" | "disabled")}
            className="input-field"
          >
            <option value="enabled" className="bg-[#0A1628]">Enabled</option>
            <option value="disabled" className="bg-[#0A1628]">Disabled</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-[11px] font-semibold tracking-[0.18em] uppercase text-white/45 mb-2">
            GST %
          </label>
          <input
            type="number"
            min={0}
            max={100}
            step={0.01}
            value={values.gst_percentage}
            onChange={(e) => set("gst_percentage", Number(e.target.value))}
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold tracking-[0.18em] uppercase text-white/45 mb-2">
            Plan Amount (₹)
          </label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={values.plan_amount}
            onChange={(e) => set("plan_amount", Number(e.target.value))}
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold tracking-[0.18em] uppercase text-white/45 mb-2">
            Duration (months)
          </label>
          <input
            type="number"
            min={1}
            value={values.duration_months}
            onChange={(e) => set("duration_months", Number(e.target.value))}
            className="input-field"
          />
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-semibold tracking-[0.18em] uppercase text-white/45 mb-2">
          Coverage Notes
        </label>
        <textarea
          rows={3}
          value={values.coverage_notes ?? ""}
          onChange={(e) => set("coverage_notes", e.target.value)}
          placeholder="What does this plan cover? (shown on warranty PDF)"
          className="input-field resize-none"
        />
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-3">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="btn-gold disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving ? "Saving..." : initial ? "Save changes" : "Create plan"}
        </button>
      </div>
    </form>
  );
}
