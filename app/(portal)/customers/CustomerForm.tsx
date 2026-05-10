"use client";
import { useEffect, useMemo, useState } from "react";
import { Customer, Plan, Retailer } from "@/lib/types";
import { INDIA_STATES } from "@/lib/states";
import Field from "@/components/Field";
import { Calculator } from "lucide-react";

export type CustomerFormValues = {
  name: string;
  mobile: string;
  email: string | null;
  city: string | null;
  state: string | null;
  pin_code: string | null;
  address: string | null;

  brand: string | null;
  model: string | null;
  imei_serial: string;        // required — primary IMEI
  imei2_serial: string | null; // optional — dual-SIM
  product_value: number;

  plan_id: number | null;
  retailer_id: number | null;

  gst_amount: number;
  plan_amount: number;
  total_amount: number;

  warranty_start: string;
  warranty_end: string | null;

  status: "enabled" | "disabled";
};

const fmtINR = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n || 0);

const today = () => new Date().toISOString().slice(0, 10);

const addMonths = (iso: string, months: number) => {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
};

export default function CustomerForm({
  initial,
  plans,
  retailers,
  onSubmit,
  onCancel,
}: {
  initial: Customer | null;
  plans: Plan[];
  retailers: Retailer[];
  onSubmit: (v: CustomerFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<CustomerFormValues>({
    name: initial?.name ?? "",
    mobile: initial?.mobile ?? "",
    email: initial?.email ?? "",
    city: initial?.city ?? "",
    state: initial?.state ?? "Uttar Pradesh",
    pin_code: initial?.pin_code ?? "",
    address: initial?.address ?? "",
    brand: initial?.brand ?? "",
    model: initial?.model ?? "",
    imei_serial: initial?.imei_serial ?? "",
    imei2_serial: initial?.imei2_serial ?? "",
    product_value: initial?.product_value ?? 0,
    plan_id: initial?.plan_id ?? plans[0]?.id ?? null,
    retailer_id: initial?.retailer_id ?? null,
    gst_amount: initial?.gst_amount ?? 0,
    plan_amount: initial?.plan_amount ?? 0,
    total_amount: initial?.total_amount ?? 0,
    warranty_start: initial?.warranty_start ?? today(),
    warranty_end: initial?.warranty_end ?? null,
    status: initial?.status ?? "enabled",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof CustomerFormValues>(k: K, v: CustomerFormValues[K]) =>
    setValues((p) => ({ ...p, [k]: v }));

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === values.plan_id) ?? null,
    [plans, values.plan_id]
  );

  // ──────────────────────────────────────────────────────────────────
  //  AUTO-CALC: every time plan or product_value changes, recalculate
  //  plan_amount, gst_amount, total_amount, and warranty_end.
  //
  //  Formula (matches Credit Kuber's pricing model):
  //    plan_amount = product_value * (plan.plan_amount / 100)
  //                  → "AMS Amount" is treated as percentage of product value
  //    gst_amount  = plan_amount * (plan.gst_percentage / 100)
  //    total       = plan_amount + gst_amount
  //    warranty_end = warranty_start + plan.duration_months
  // ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedPlan) return;
    const planAmount =
      Number(values.product_value || 0) * (Number(selectedPlan.plan_amount) / 100);
    const gstAmount = planAmount * (Number(selectedPlan.gst_percentage) / 100);
    const total = planAmount + gstAmount;
    const end = addMonths(values.warranty_start, selectedPlan.duration_months);

    setValues((p) => ({
      ...p,
      plan_amount: Number(planAmount.toFixed(2)),
      gst_amount: Number(gstAmount.toFixed(2)),
      total_amount: Number(total.toFixed(2)),
      warranty_end: end,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.plan_id, values.product_value, values.warranty_start, selectedPlan?.plan_amount, selectedPlan?.gst_percentage, selectedPlan?.duration_months]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!values.plan_id) {
      setError("Please select a plan.");
      return;
    }
    if (!values.retailer_id) {
      setError("Please select a retailer (merchant).");
      return;
    }
    if (!/^\d{10}$/.test(values.mobile)) {
      setError("Mobile must be exactly 10 digits.");
      return;
    }
    if (!/^\d{15}$/.test(values.imei_serial)) {
      setError("IMEI 1 must be exactly 15 digits.");
      return;
    }
    if (values.imei2_serial && !/^\d{15}$/.test(values.imei2_serial)) {
      setError("IMEI 2 must be exactly 15 digits (or leave empty).");
      return;
    }
    if (values.pin_code && !/^\d{6}$/.test(values.pin_code)) {
      setError("PIN code must be exactly 6 digits.");
      return;
    }
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
    <form onSubmit={handleSubmit} className="space-y-7">
      {/* ── CUSTOMER DETAILS ─────────────────────────────────────────── */}
      <section>
        <h3 className="text-[12px] font-semibold tracking-[0.22em] uppercase text-gold-400/90 mb-4">
          Customer Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Full Name" required>
            <input
              type="text"
              required
              value={values.name}
              onChange={(e) => set("name", e.target.value.toUpperCase())}
              placeholder="Customer full name"
              className="input-field"
            />
          </Field>

          <Field label="Mobile" required>
            <input
              type="tel"
              required
              inputMode="numeric"
              pattern="[0-9]{10}"
              maxLength={10}
              value={values.mobile}
              onChange={(e) => set("mobile", e.target.value.replace(/\D/g, ""))}
              placeholder="10-digit mobile number"
              className="input-field font-mono"
            />
          </Field>

          <Field label="Email">
            <input
              type="email"
              value={values.email ?? ""}
              onChange={(e) => set("email", e.target.value)}
              placeholder="customer@example.com"
              className="input-field"
            />
          </Field>

          <Field label="Status">
            <select
              value={values.status}
              onChange={(e) => set("status", e.target.value as "enabled" | "disabled")}
              className="input-field"
            >
              <option value="enabled" className="bg-[#0A1628]">Active</option>
              <option value="disabled" className="bg-[#0A1628]">Disabled</option>
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <Field label="City" required>
            <input
              type="text"
              required
              value={values.city ?? ""}
              onChange={(e) => set("city", e.target.value)}
              placeholder="e.g. Kanpur"
              className="input-field"
            />
          </Field>

          <Field label="State" required>
            <select
              required
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

          <Field label="PIN Code" required hint="6-digit Indian PIN">
            <input
              type="text"
              required
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              minLength={6}
              value={values.pin_code ?? ""}
              onChange={(e) => set("pin_code", e.target.value.replace(/\D/g, ""))}
              placeholder="208001"
              className="input-field font-mono"
            />
          </Field>
        </div>

        <div className="mt-4">
          <Field label="Address" required>
            <textarea
              rows={2}
              required
              value={values.address ?? ""}
              onChange={(e) => set("address", e.target.value)}
              placeholder="Full residential address"
              className="input-field resize-none"
            />
          </Field>
        </div>
      </section>

      {/* ── PRODUCT DETAILS ──────────────────────────────────────────── */}
      <section>
        <h3 className="text-[12px] font-semibold tracking-[0.22em] uppercase text-gold-400/90 mb-4">
          Product Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Brand" required>
            <input
              type="text"
              required
              value={values.brand ?? ""}
              onChange={(e) => set("brand", e.target.value)}
              placeholder="e.g. Vivo, Samsung, Realme"
              className="input-field"
            />
          </Field>

          <Field label="Model" required>
            <input
              type="text"
              required
              value={values.model ?? ""}
              onChange={(e) => set("model", e.target.value)}
              placeholder="e.g. T5X 5G 8/256GB"
              className="input-field"
            />
          </Field>

          <Field
            label="IMEI 1"
            required
            hint="15 digits — printed on the device or shown via *#06# dial"
          >
            <input
              type="text"
              required
              inputMode="numeric"
              pattern="[0-9]{15}"
              minLength={15}
              maxLength={15}
              value={values.imei_serial}
              onChange={(e) => set("imei_serial", e.target.value.replace(/\D/g, ""))}
              placeholder="15-digit IMEI"
              className="input-field font-mono"
            />
          </Field>

          <Field label="IMEI 2" hint="15 digits — optional, for dual-SIM devices">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{15}"
              maxLength={15}
              value={values.imei2_serial ?? ""}
              onChange={(e) => set("imei2_serial", e.target.value.replace(/\D/g, ""))}
              placeholder="15-digit IMEI (optional)"
              className="input-field font-mono"
            />
          </Field>

          <Field
            label="Product Value (₹)"
            required
            hint="Used to compute plan + GST"
            className="md:col-span-2"
          >
            <input
              type="number"
              required
              min={1}
              step={0.01}
              // Display empty when 0 (so the field doesn't pre-fill with "0")
              value={values.product_value || ""}
              onChange={(e) => set("product_value", Number(e.target.value) || 0)}
              placeholder="e.g. 15000"
              className="input-field"
            />
          </Field>
        </div>
      </section>

      {/* ── PLAN SELECTION ───────────────────────────────────────────── */}
      <section>
        <h3 className="text-[12px] font-semibold tracking-[0.22em] uppercase text-gold-400/90 mb-4">
          Plan & Retailer
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Plan" required>
            <select
              required
              value={values.plan_id ?? ""}
              onChange={(e) =>
                set("plan_id", e.target.value ? Number(e.target.value) : null)
              }
              className="input-field"
            >
              <option value="" className="bg-[#0A1628]">-- Select plan --</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#0A1628]">
                  {p.name} — {p.plan_amount}% / {p.duration_months}mo
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Retailer (Merchant)"
            required
            hint={
              retailers.length === 0
                ? "Add a retailer first in the Retailers section."
                : undefined
            }
          >
            <select
              required
              value={values.retailer_id ?? ""}
              onChange={(e) =>
                set("retailer_id", e.target.value ? Number(e.target.value) : null)
              }
              className="input-field"
            >
              <option value="" className="bg-[#0A1628]">-- Select retailer --</option>
              {retailers.map((r) => (
                <option key={r.id} value={r.id} className="bg-[#0A1628]">
                  {r.shop_name} ({r.retailer_code})
                </option>
              ))}
            </select>
          </Field>

          <Field label="Warranty Start" required>
            <input
              type="date"
              required
              value={values.warranty_start}
              onChange={(e) => set("warranty_start", e.target.value)}
              className="input-field"
            />
          </Field>

          <Field label="Warranty End" hint="Auto-calculated from plan duration">
            <input
              type="date"
              value={values.warranty_end ?? ""}
              readOnly
              className="input-field opacity-70 cursor-not-allowed"
            />
          </Field>
        </div>

        {/* Auto-calc summary */}
        {selectedPlan && values.product_value > 0 && (
          <div className="mt-4 glass-strong rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Calculator className="w-4 h-4 text-gold-400" />
              <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-gold-400/80">
                Auto-calculated
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-[10px] tracking-wide uppercase text-white/40 mb-1">
                  Plan Amount
                </p>
                <p className="font-display text-lg text-white">
                  ₹{fmtINR(values.plan_amount)}
                </p>
              </div>
              <div>
                <p className="text-[10px] tracking-wide uppercase text-white/40 mb-1">
                  GST ({selectedPlan.gst_percentage}%)
                </p>
                <p className="font-display text-lg text-white">
                  ₹{fmtINR(values.gst_amount)}
                </p>
              </div>
              <div>
                <p className="text-[10px] tracking-wide uppercase text-gold-400/80 mb-1 font-semibold">
                  Total
                </p>
                <p className="font-display text-lg text-gold-400">
                  ₹{fmtINR(values.total_amount)}
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.06]">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="btn-gold disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving ? "Saving..." : initial ? "Save changes" : "Register customer"}
        </button>
      </div>
    </form>
  );
}
