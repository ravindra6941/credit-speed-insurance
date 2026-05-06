"use client";
import { useMemo, useState, ReactNode } from "react";
import { Search, ChevronLeft, ChevronRight, Inbox } from "lucide-react";

export type Column<T> = {
  key: string;
  label: string;
  /** Render the cell. If omitted, falls back to row[key]. */
  render?: (row: T) => ReactNode;
  /** Make the value searchable. If omitted, falls back to row[key]. */
  searchValue?: (row: T) => string;
  className?: string;
  width?: string; // tailwind width class
};

type DataTableProps<T> = {
  rows: T[];
  columns: Column<T>[];
  /** Render the action buttons for each row (E / P / D pills). */
  actions?: (row: T) => ReactNode;
  /** Page-size options. */
  pageSizes?: number[];
  /** Initial page size. */
  defaultPageSize?: number;
  /** Empty-state message. */
  emptyTitle?: string;
  emptyDescription?: string;
  /** Optional extra search keys (e.g. nested fields). */
  searchKeys?: (keyof T)[];
};

export default function DataTable<T extends { id: number | string }>({
  rows,
  columns,
  actions,
  pageSizes = [10, 25, 50, 100],
  defaultPageSize = 25,
  emptyTitle = "No records yet",
  emptyDescription = "Once you add data, it will show up here.",
  searchKeys = [],
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      // Check column-level searchValue first
      const colMatch = columns.some((c) => {
        const v = c.searchValue
          ? c.searchValue(row)
          : String((row as Record<string, unknown>)[c.key] ?? "");
        return v.toLowerCase().includes(q);
      });
      if (colMatch) return true;
      // Fall back to extra search keys
      return searchKeys.some((k) =>
        String((row as Record<string, unknown>)[k as string] ?? "")
          .toLowerCase()
          .includes(q)
      );
    });
  }, [rows, search, columns, searchKeys]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const visible = filtered.slice(startIdx, startIdx + pageSize);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-[12px] font-semibold tracking-[0.18em] uppercase text-white/45">
            Show
          </span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="px-3.5 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-gold-400/50"
          >
            {pageSizes.map((s) => (
              <option key={s} value={s} className="bg-[#0A1628]">
                {s}
              </option>
            ))}
          </select>
          <span className="text-[12px] text-white/45">per page</span>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="input-field has-icon-left !py-2.5 !text-[14px]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                {columns.map((c) => (
                  <th
                    key={c.key}
                    className={`px-5 py-4 text-left text-[11px] font-semibold tracking-[0.18em] uppercase text-white/55 whitespace-nowrap ${
                      c.width ?? ""
                    } ${c.className ?? ""}`}
                  >
                    {c.label}
                  </th>
                ))}
                {actions && (
                  <th className="px-5 py-4 text-right text-[11px] font-semibold tracking-[0.18em] uppercase text-white/55">
                    Action
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + (actions ? 1 : 0)}
                    className="px-4 py-20 text-center"
                  >
                    <Inbox className="w-10 h-10 mx-auto text-white/20 mb-4" />
                    <p className="font-display text-lg text-white/75 mb-1.5">
                      {filtered.length === 0 && search
                        ? "No results match your search."
                        : emptyTitle}
                    </p>
                    <p className="text-[13px] text-white/45">
                      {filtered.length === 0 && search
                        ? "Try a different search term."
                        : emptyDescription}
                    </p>
                  </td>
                </tr>
              ) : (
                visible.map((row, i) => (
                  <tr
                    key={String(row.id) + i}
                    className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                  >
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className={`px-5 py-4 text-white/90 ${c.className ?? ""}`}
                      >
                        {c.render
                          ? c.render(row)
                          : String((row as Record<string, unknown>)[c.key] ?? "—")}
                      </td>
                    ))}
                    {actions && (
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {actions(row)}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer: pagination */}
        {filtered.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 border-t border-white/[0.06]">
            <p className="text-[13px] text-white/55">
              Showing{" "}
              <span className="text-white/90 font-semibold">
                {startIdx + 1}
              </span>{" "}
              to{" "}
              <span className="text-white/90 font-semibold">
                {Math.min(startIdx + pageSize, filtered.length)}
              </span>{" "}
              of{" "}
              <span className="text-white/90 font-semibold">
                {filtered.length}
              </span>{" "}
              entries
            </p>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="px-3.5 py-2 rounded-lg text-[13px] font-medium text-white/70 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Prev
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }).slice(
                  Math.max(0, safePage - 3),
                  Math.max(0, safePage - 3) + 5
                ).map((_, i) => {
                  const pageNum = Math.max(0, safePage - 3) + i + 1;
                  if (pageNum > totalPages) return null;
                  const isActive = pageNum === safePage;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-9 h-9 rounded-lg text-[13px] font-semibold transition-all ${
                        isActive
                          ? "bg-gradient-to-b from-gold-300 to-gold-500 text-navy-500"
                          : "text-white/70 hover:text-white hover:bg-white/[0.06]"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="px-3.5 py-2 rounded-lg text-[13px] font-medium text-white/70 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all flex items-center gap-1"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
