"use client";
import { Pencil, Printer, Trash2 } from "lucide-react";

type RowActionsProps = {
  onEdit?: () => void;
  onPrint?: () => void;
  onDelete?: () => void;
};

/**
 * Standard row action cluster used across all CRUD tables.
 * E (edit, amber) — P (print PDF, emerald) — D (delete, red)
 * Mirrors the Credit Kuber pattern but in the dark cinematic palette.
 */
export default function RowActions({ onEdit, onPrint, onDelete }: RowActionsProps) {
  return (
    <>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          title="Edit"
          aria-label="Edit"
          className="action-pill action-pill-edit"
        >
          <Pencil className="w-4 h-4" />
        </button>
      )}
      {onPrint && (
        <button
          type="button"
          onClick={onPrint}
          title="Print warranty PDF"
          aria-label="Print warranty PDF"
          className="action-pill action-pill-print"
        >
          <Printer className="w-4 h-4" />
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          title="Delete"
          aria-label="Delete"
          className="action-pill action-pill-delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </>
  );
}
