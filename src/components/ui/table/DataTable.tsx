"use client";

import React, { ReactNode, useMemo, useState } from "react";
import Pagination from "@/components/ui/pagination/Pagination";

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
  searchable?: boolean;
  searchPlaceholder?: string;
  getSearchText?: (row: T) => string;
  showRowNumber?: boolean;
  rowNumberHeader?: string;
  paginated?: boolean;
  defaultPageSize?: number;
  pageSizeOptions?: number[];
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
  searchable = false,
  searchPlaceholder = "Cari data...",
  getSearchText,
  showRowNumber = false,
  rowNumberHeader = "No",
  paginated = false,
  defaultPageSize = 10,
  pageSizeOptions = [10, 25, 50],
  className = "",
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(defaultSort?.key ?? null);
  const [sortDir, setSortDir] = useState<SortDirection>(defaultSort?.direction ?? null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

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

  const filteredData = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return data;

    return data.filter((row) => {
      const text = getSearchText
        ? getSearchText(row)
        : columns
            .map((col) => col.sortValue?.(row) ?? col.accessor?.(row) ?? "")
            .join(" ");

      return String(text).toLowerCase().includes(query);
    });
  }, [columns, data, getSearchText, searchTerm]);

  const sortedData = useMemo(() => {
    if (!sortKey || !sortDir) return filteredData;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return filteredData;
    const getVal = (row: T): string | number => {
      if (col.sortValue) return col.sortValue(row);
      const v = col.accessor?.(row);
      return typeof v === "number" ? v : String(v ?? "");
    };
    return [...filteredData].sort((a, b) => {
      const va = getVal(a);
      const vb = getVal(b);
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortKey, sortDir, columns]);

  const alignCls = (a?: "left" | "center" | "right") =>
    a === "center" ? "text-center" : a === "right" ? "text-right" : "text-left";

  const totalPages = paginated ? Math.max(1, Math.ceil(sortedData.length / pageSize)) : 1;
  const clampedPage = Math.min(currentPage, totalPages);
  const visibleData = paginated
    ? sortedData.slice((clampedPage - 1) * pageSize, clampedPage * pageSize)
    : sortedData;
  const rowNumberOffset = paginated ? (clampedPage - 1) * pageSize : 0;

  return (
    <div className={className}>
      {searchable && (
        <div className="mb-3">
          <div className="relative max-w-sm">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setCurrentPage(1);
              }}
              placeholder={searchPlaceholder}
              className="h-10 w-full rounded-lg border border-[var(--border-default)] bg-transparent py-2 pl-9 pr-3 text-sm text-[var(--text-heading)] shadow-theme-xs outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--color-primary)] focus:ring-3 focus:ring-[rgba(37,99,235,0.12)]"
            />
          </div>
        </div>
      )}
      <div className="overflow-x-auto custom-scrollbar rounded-xl border border-[var(--border-default)]">
        <table className="w-full min-w-full border-collapse">
          <thead>
            <tr className="border-b border-[var(--border-default)] bg-[var(--surface-muted)]">
              {showRowNumber && (
                <th className="w-16 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-caption)]">
                  {rowNumberHeader}
                </th>
              )}
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
            {visibleData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (showRowNumber ? 1 : 0)} className="px-4 py-10 text-center">
                  {emptyState || <span className="text-sm text-[var(--text-muted)]">Tidak ada data</span>}
                </td>
              </tr>
            ) : (
              visibleData.map((row, i) => (
                <tr
                  key={rowKey(row, rowNumberOffset + i)}
                  onClick={() => onRowClick?.(row)}
                  className={[
                    "border-b border-[var(--border-light)] transition-colors last:border-0",
                    onRowClick ? "cursor-pointer hover:bg-[var(--surface-muted)]" : "",
                    striped && i % 2 === 1 ? "bg-[var(--surface-muted)]/40" : "",
                  ].join(" ")}
                >
                  {showRowNumber && (
                    <td className="px-4 py-3 text-sm font-medium tabular-nums text-[var(--text-muted)]">
                      {rowNumberOffset + i + 1}
                    </td>
                  )}
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
      {paginated && (
        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-sm text-[var(--text-caption)]">
            <span>Tampilkan</span>
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setCurrentPage(1);
              }}
              className="h-9 rounded-lg border border-[var(--border-default)] bg-transparent px-2.5 text-sm font-medium text-[var(--text-body)] outline-none transition focus:border-[var(--color-primary)] focus:ring-3 focus:ring-[rgba(37,99,235,0.12)]"
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <span>per halaman</span>
          </div>
          <Pagination currentPage={clampedPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      )}
    </div>
  );
}

export default DataTable;
