"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CustomerWithRelations, Plan, Retailer } from "@/lib/types";
import DataTable, { Column } from "@/components/DataTable";
import RowActions from "@/components/RowActions";
import Modal from "@/components/Modal";
import CustomerForm, { CustomerFormValues } from "./CustomerForm";
import { generateWarrantyPDF } from "@/lib/pdf/warranty";

const fmtINR = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n || 0);

const fmtDate = (d: string | null | undefined) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function CustomersPage() {
  const supabase = createClient();
  const [customers, setCustomers] = useState<CustomerWithRelations[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerWithRelations | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CustomerWithRelations | null>(null);

  const load = async () => {
    setLoading(true);

    // Customers with joined plan + retailer
    const { data: cs } = await supabase
      .from("customers")
      .select("*, plan:plans(*), retailer:retailers(*)")
      .order("id", { ascending: false });

    const { data: ps } = await supabase
      .from("plans")
      .select("*")
      .eq("status", "enabled")
      .order("id");

    const { data: rs } = await supabase
      .from("retailers")
      .select("*")
      .eq("status", "enabled")
      .order("shop_name");

    setCustomers((cs as CustomerWithRelations[]) ?? []);
    setPlans((ps as Plan[]) ?? []);
    setRetailers((rs as Retailer[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async (values: CustomerFormValues) => {
    if (editing) {
      const { error } = await supabase
        .from("customers")
        .update(values)
        .eq("id", editing.id);
      if (error) throw error;
    } else {
      const { data: nextCode, error: codeErr } = await supabase.rpc(
        "next_customer_code"
      );
      if (codeErr) throw codeErr;
      const { error } = await supabase
        .from("customers")
        .insert({ ...values, customer_code: nextCode });
      if (error) throw error;
    }
    setFormOpen(false);
    setEditing(null);
    await load();
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const { error } = await supabase
      .from("customers")
      .delete()
      .eq("id", confirmDelete.id);
    if (error) {
      alert(`Failed to delete: ${error.message}`);
    } else {
      setConfirmDelete(null);
      await load();
    }
  };

  const handlePrint = async (c: CustomerWithRelations) => {
    try {
      await generateWarrantyPDF(c);
    } catch (err) {
      console.error(err);
      alert("Failed to generate PDF. Check the browser console for details.");
    }
  };

  const columns: Column<CustomerWithRelations>[] = [
    {
      key: "customer_code",
      label: "Customer ID",
      render: (r) => (
        <span className="font-mono text-[12px] text-gold-400">
          {r.customer_code}
        </span>
      ),
    },
    {
      key: "name",
      label: "Name",
      render: (r) => <span className="font-medium text-white">{r.name}</span>,
    },
    {
      key: "mobile",
      label: "Mobile",
      render: (r) => (
        <span className="font-mono text-[12px] text-white/75">{r.mobile}</span>
      ),
    },
    {
      key: "device",
      label: "Device",
      render: (r) => (
        <div className="leading-tight">
          <p className="text-white/90 text-[14px]">
            {[r.brand, r.model].filter(Boolean).join(" ") || "—"}
          </p>
          {r.imei_serial && (
            <p className="font-mono text-[11px] text-white/45 mt-1">
              IMEI 1: {r.imei_serial}
            </p>
          )}
          {r.imei2_serial && (
            <p className="font-mono text-[11px] text-white/45">
              IMEI 2: {r.imei2_serial}
            </p>
          )}
        </div>
      ),
      searchValue: (r) =>
        `${r.brand ?? ""} ${r.model ?? ""} ${r.imei_serial ?? ""} ${r.imei2_serial ?? ""}`,
    },
    {
      key: "plan",
      label: "Plan",
      render: (r) =>
        r.plan ? (
          <span className="text-[11px] tracking-wide uppercase text-gold-400/80 font-semibold">
            {r.plan.name}
          </span>
        ) : (
          "—"
        ),
      searchValue: (r) => r.plan?.name ?? "",
    },
    {
      key: "total",
      label: "Total",
      render: (r) => (
        <span className="font-medium text-white/90">
          {fmtINR(r.total_amount)}
        </span>
      ),
    },
    {
      key: "warranty_end",
      label: "Expires",
      render: (r) => (
        <span className="text-[12px] text-white/65">
          {fmtDate(r.warranty_end)}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (r) =>
        r.status === "enabled" ? (
          <span className="badge-enabled">Active</span>
        ) : (
          <span className="badge-disabled">Disabled</span>
        ),
    },
  ];

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-[15px] text-white/65 max-w-xl leading-relaxed">
            Customers enrolled in warranty plans. Use the{" "}
            <span className="text-emerald-400 font-semibold">P</span> button to
            download their warranty document.
          </p>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="btn-gold"
          >
            <Plus className="w-4 h-4" />
            Add Customer
          </motion.button>
        </div>

        {loading ? (
          <div className="glass rounded-2xl p-12 text-center text-white/45 text-sm">
            Loading customers...
          </div>
        ) : (
          <DataTable
            rows={customers}
            columns={columns}
            actions={(row) => (
              <RowActions
                onEdit={() => {
                  setEditing(row);
                  setFormOpen(true);
                }}
                onPrint={() => handlePrint(row)}
                onDelete={() => setConfirmDelete(row)}
              />
            )}
            emptyTitle="No customers yet"
            emptyDescription="Register your first customer to issue a warranty document."
            searchKeys={["customer_code", "mobile", "imei_serial", "imei2_serial", "city"]}
          />
        )}
      </div>

      <Modal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        title={editing ? "Edit Customer" : "Register Customer"}
        description={
          editing
            ? "Update customer details. The warranty PDF will reflect new values immediately."
            : "Enter customer + device details. GST and total are calculated automatically."
        }
        size="lg"
      >
        <CustomerForm
          initial={editing}
          plans={plans}
          retailers={retailers}
          onSubmit={handleSave}
          onCancel={() => {
            setFormOpen(false);
            setEditing(null);
          }}
        />
      </Modal>

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete customer?"
        description={`This will permanently remove "${confirmDelete?.name}" (${confirmDelete?.customer_code}) and their warranty record.`}
        size="sm"
      >
        <div className="flex items-center justify-end gap-2 pt-2">
          <button onClick={() => setConfirmDelete(null)} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={handleDelete}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-200 font-semibold text-sm transition-all"
          >
            Delete customer
          </button>
        </div>
      </Modal>
    </>
  );
}
