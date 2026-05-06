"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Retailer } from "@/lib/types";
import DataTable, { Column } from "@/components/DataTable";
import RowActions from "@/components/RowActions";
import Modal from "@/components/Modal";
import RetailerForm, { RetailerFormValues } from "./RetailerForm";

export default function RetailersPage() {
  const supabase = createClient();
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Retailer | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Retailer | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("retailers")
      .select("*")
      .order("id", { ascending: false });
    setRetailers((data as Retailer[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async (values: RetailerFormValues) => {
    if (editing) {
      const { error } = await supabase
        .from("retailers")
        .update(values)
        .eq("id", editing.id);
      if (error) throw error;
    } else {
      // Auto-generate retailer code via RPC
      const { data: nextCode, error: codeErr } = await supabase.rpc(
        "next_retailer_code"
      );
      if (codeErr) throw codeErr;
      const { error } = await supabase
        .from("retailers")
        .insert({ ...values, retailer_code: nextCode });
      if (error) throw error;
    }
    setFormOpen(false);
    setEditing(null);
    await load();
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const { error } = await supabase
      .from("retailers")
      .delete()
      .eq("id", confirmDelete.id);
    if (error) {
      alert(`Failed to delete: ${error.message}`);
    } else {
      setConfirmDelete(null);
      await load();
    }
  };

  const columns: Column<Retailer>[] = [
    {
      key: "retailer_code",
      label: "Retailer ID",
      render: (r) => (
        <span className="font-mono text-[12px] text-gold-400">
          {r.retailer_code}
        </span>
      ),
    },
    {
      key: "shop_name",
      label: "Shop Name",
      render: (r) => <span className="font-medium text-white">{r.shop_name}</span>,
    },
    {
      key: "owner_name",
      label: "Owner",
      render: (r) => r.owner_name || "—",
    },
    {
      key: "phone",
      label: "Phone",
      render: (r) => (
        <span className="font-mono text-[12px] text-white/75">
          {r.phone || "—"}
        </span>
      ),
    },
    {
      key: "gst_number",
      label: "GST Number",
      render: (r) => (
        <span className="font-mono text-[11px] text-white/65">
          {r.gst_number || "—"}
        </span>
      ),
    },
    {
      key: "city",
      label: "City",
      render: (r) =>
        r.city || r.state ? (
          <span className="text-white/75 text-[13px]">
            {[r.city, r.state].filter(Boolean).join(", ")}
          </span>
        ) : (
          "—"
        ),
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
          <p className="text-[15px] text-white/65 leading-relaxed">
            Partner mobile shops authorised to sell warranty plans.
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
            Add Retailer
          </motion.button>
        </div>

        {loading ? (
          <div className="glass rounded-2xl p-12 text-center text-white/45 text-sm">
            Loading retailers...
          </div>
        ) : (
          <DataTable
            rows={retailers}
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
            emptyTitle="No retailers yet"
            emptyDescription="Onboard your first partner shop to start issuing warranty documents."
            searchKeys={["shop_name", "phone", "owner_name", "retailer_code", "city"]}
          />
        )}
      </div>

      <Modal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        title={editing ? "Edit Retailer" : "Add Retailer"}
        description={
          editing
            ? "Update retailer details."
            : "Onboard a new partner shop. A retailer ID will be auto-generated."
        }
        size="lg"
      >
        <RetailerForm
          initial={editing}
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
        title="Delete retailer?"
        description={`This will permanently remove "${confirmDelete?.shop_name}". Customers linked to this retailer will be detached but their warranty records remain.`}
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
            Delete retailer
          </button>
        </div>
      </Modal>
    </>
  );
}
