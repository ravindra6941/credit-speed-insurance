"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Plan } from "@/lib/types";
import DataTable, { Column } from "@/components/DataTable";
import RowActions from "@/components/RowActions";
import Modal from "@/components/Modal";
import PlanForm, { PlanFormValues } from "./PlanForm";

const fmtINR = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n || 0);

export default function PlansPage() {
  const supabase = createClient();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Plan | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("plans")
      .select("*")
      .order("id", { ascending: true });
    if (error) {
      console.error("Failed to load plans:", error);
    } else {
      setPlans(data as Plan[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async (values: PlanFormValues) => {
    if (editing) {
      const { error } = await supabase
        .from("plans")
        .update(values)
        .eq("id", editing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("plans").insert(values);
      if (error) throw error;
    }
    setFormOpen(false);
    setEditing(null);
    await load();
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const { error } = await supabase
      .from("plans")
      .delete()
      .eq("id", confirmDelete.id);
    if (error) {
      alert(`Failed to delete: ${error.message}`);
    } else {
      setConfirmDelete(null);
      await load();
    }
  };

  const columns: Column<Plan>[] = [
    { key: "id", label: "ID", width: "w-16" },
    { key: "name", label: "Name", render: (r) => <span className="font-medium text-white">{r.name}</span> },
    {
      key: "type",
      label: "Type",
      render: (r) => (
        <span className="text-[11px] tracking-wide uppercase text-white/55">
          {r.type.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      key: "gst",
      label: "GST %",
      render: (r) => <span className="text-white/85">{r.gst_percentage}%</span>,
    },
    {
      key: "amount",
      label: "Plan Amount",
      render: (r) => <span className="text-white/85">{fmtINR(r.plan_amount)}</span>,
    },
    {
      key: "duration",
      label: "Duration",
      render: (r) => <span className="text-white/85">{r.duration_months} mo</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (r) =>
        r.status === "enabled" ? (
          <span className="badge-enabled">Enabled</span>
        ) : (
          <span className="badge-disabled">Disabled</span>
        ),
    },
  ];

  return (
    <>
      <div className="space-y-6 max-w-[1400px]">
        <div className="flex items-center justify-between">
          <p className="text-[15px] text-white/65 max-w-xl leading-relaxed">
            Manage warranty and protection plan types. These are used when
            adding new customers.
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
            Add Plan
          </motion.button>
        </div>

        {loading ? (
          <div className="glass rounded-2xl p-12 text-center text-white/45 text-sm">
            Loading plans...
          </div>
        ) : (
          <DataTable
            rows={plans}
            columns={columns}
            actions={(row) => (
              <RowActions
                onEdit={() => {
                  setEditing(row);
                  setFormOpen(true);
                }}
                onDelete={() => setConfirmDelete(row)}
              />
            )}
            emptyTitle="No plans yet"
            emptyDescription="Add your first warranty plan to get started."
          />
        )}
      </div>

      {/* Add/Edit modal */}
      <Modal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        title={editing ? "Edit Plan" : "Add Plan"}
        description={
          editing
            ? "Update plan details. Changes will not affect existing customer records."
            : "Define a new warranty plan customers can be enrolled in."
        }
      >
        <PlanForm
          initial={editing}
          onSubmit={handleSave}
          onCancel={() => {
            setFormOpen(false);
            setEditing(null);
          }}
        />
      </Modal>

      {/* Delete confirmation */}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete plan?"
        description={`This will permanently delete "${confirmDelete?.name}". Customers already linked to it will keep their historical record.`}
        size="sm"
      >
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={() => setConfirmDelete(null)}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-200 font-semibold text-sm transition-all"
          >
            Delete plan
          </button>
        </div>
      </Modal>
    </>
  );
}
