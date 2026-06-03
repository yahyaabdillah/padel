"use client";

import React, { ReactNode, useMemo, useState } from "react";

export type SortDirection = "asc" | "desc" | null;

export type Column<T> = {
  key: string;
  header: string;
  /** ambil nilai untuk render & sorting */
  accessor?: (row: T) => ReactNode;
  /** nilai khusus untuk sorting (jika beda dari accessor) */
  sortValue?: (row: T) => string | number;
  sortable?: boolean;
  align?: "left" | "center" | "right";
  width?: string;
  className?: string;
};

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T, index: number) => string | number;
  onRowClick?: (row: T) => void;
  emptyState?: ReactNode;
  /** sort awal */
  defaultSort?: { key: string; direction: SortDirection };
  striped?: boolean;
  className?: string;
}

function SortIcon({ direction }: { direction: SortDirection }) {
  return (
    <span className="inline-flex flex-col -space-y-1">
      <svg className={`h-3 w-3 ${direction === "asc" ? "text-[var(--color-primary)]" : "text-[var(--text-muted)]"}`} fill="currentColor" viewBox="0 0 20 20"><path d="M10 5l4 5H6l4-5z" /></svg>
      <svg className={`h-3 w-3 ${direction === "desc" ? "text-[var(--color-primary)]" : "text-[var(--text-muted)]"}`} fill="currentColor" viewBox="0 0 20 20"><path d="M10 15l-4-5h8l-4 5z" /></svg>
    </span>
  );
}

function DataTable<T>({
  columns,
  data,
  rowKey,
  onRowClick,
  emptyState,
  defaultSort,
  striped = false,
  className = "",
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(defaultSort?.key ?? null);
  const [sortDir, setSortDir] = useState<SortDirection>(defaultSort?.direction ?? null);

  const handleSort = (col: Column<T>) => {
    if (!col.sortable) return;
    if (sortKey !== col.key) {
      setSortKey(col.key);
      setSortDir("asc");
    } else {
      // cycle: asc -> desc -> null
      setSortDir((prev) => (prev === "asc" ? "desc" : prev === "desc" ? null : "asc"));
      if (sortDir === "desc") setSortKey(null);
    }
  };

  const sortedData = useMemo(() => {
    if (!sortKey || !sortDir) return data;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return data;
    const getVal = (row: T): string | number => {
      if (col.sortValue) return col.sortValue(row);
      const v = col.accessor?.(row);
      return typeof v === "number" ? v : String(v ?? "");
    };
    return [...data].sort((a, b) => {
      const va = getVal(a);
      const vb = getVal(b);
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [data, sortKey, sortDir, columns]);

  const alignCls = (a?: "left" | "center" | "right") =>
    a === "center" ? "text-center" : a === "right" ? "text-right" : "text-left";

  return (
    <div className={`overflow-x-auto custom-scrollbar rounded-xl border border-[var(--border-default)] ${className}`}>
      <table className="w-full min-w-full border-collapse">
        <thead>
          <tr className="border-b border-[var(--border-default)] bg-[var(--surface-muted)]">
            {columns.map((col) => {
              const active = sortKey === col.key;
              return (
                <th
                  key={col.key}
                  style={{ width: col.width }}
                  className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-caption)] ${alignCls(col.align)}`}
                >
                  {col.sortable ? (
                    <button
                      type="button"
                      onClick={() => handleSort(col)}
                      className={`inline-flex items-center gap-1.5 transition-colors hover:text-[var(--text-heading)] ${active ? "text-[var(--text-heading)]" : ""} ${col.align === "right" ? "flex-row-reverse" : ""}`}
                    >
                      {col.header}
                      <SortIcon direction={active ? sortDir : null} />
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedData.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center">
                {emptyState || <span className="text-sm text-[var(--text-muted)]">Tidak ada data</span>}
              </td>
            </tr>
          ) : (
            sortedData.map((row, i) => (
              <tr
                key={rowKey(row, i)}
                onClick={() => onRowClick?.(row)}
                className={[
                  "border-b border-[var(--border-light)] transition-colors last:border-0",
                  onRowClick ? "cursor-pointer hover:bg-[var(--surface-muted)]" : "",
                  striped && i % 2 === 1 ? "bg-[var(--surface-muted)]/40" : "",
                ].join(" ")}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3 text-sm text-[var(--text-body)] ${alignCls(col.align)} ${col.className ?? ""}`}>
                    {col.accessor ? col.accessor(row) : null}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
