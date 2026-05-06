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
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold tracking-[0.18em] uppercase text-white/40">
            Show
          </span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-gold-400/50"
          >
            {pageSizes.map((s) => (
              <option key={s} value={s} className="bg-[#0A1628]">
                {s}
              </option>
            ))}
          </select>
          <span className="text-[11px] text-white/40">per page</span>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="input-field !py-2 pl-10 text-xs"
          />
        </div>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                {columns.map((c) => (
                  <th
                    key={c.key}
                    className={`px-4 py-3.5 text-left text-[10px] font-semibold tracking-[0.18em] uppercase text-white/45 whitespace-nowrap ${
                      c.width ?? ""
                    } ${c.className ?? ""}`}
                  >
                    {c.label}
                  </th>
                ))}
                {actions && (
                  <th className="px-4 py-3.5 text-right text-[10px] font-semibold tracking-[0.18em] uppercase text-white/45">
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
                    className="px-4 py-16 text-center"
                  >
                    <Inbox className="w-8 h-8 mx-auto text-white/20 mb-3" />
                    <p className="font-display text-base text-white/70 mb-1">
                      {filtered.length === 0 && search
                        ? "No results match your search."
                        : emptyTitle}
                    </p>
                    <p className="text-xs text-white/40">
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
                        className={`px-4 py-3.5 text-white/85 ${c.className ?? ""}`}
                      >
                        {c.render
                          ? c.render(row)
                          : String((row as Record<string, unknown>)[c.key] ?? "—")}
                      </td>
                    ))}
                    {actions && (
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1.5">
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-t border-white/[0.06]">
            <p className="text-xs text-white/45">
              Showing{" "}
              <span className="text-white/80 font-semibold">
                {startIdx + 1}
              </span>{" "}
              to{" "}
              <span className="text-white/80 font-semibold">
                {Math.min(startIdx + pageSize, filtered.length)}
              </span>{" "}
              of{" "}
              <span className="text-white/80 font-semibold">
                {filtered.length}
              </span>{" "}
              entries
            </p>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="px-3 py-1.5 rounded-lg text-xs text-white/65 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Prev
              </button>

              <div className="flex items-center gap-0.5">
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
                      className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
                        isActive
                          ? "bg-gradient-to-b from-gold-300 to-gold-500 text-navy-500"
                          : "text-white/65 hover:text-white hover:bg-white/[0.06]"
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
                className="px-3 py-1.5 rounded-lg text-xs text-white/65 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all flex items-center gap-1"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
