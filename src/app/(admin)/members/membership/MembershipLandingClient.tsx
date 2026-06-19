"use client";

// Staff ▸ Membership (landing). Searchable member list; each row opens the
// membership detail drawer where staff can Assign / Extend / Upgrade a plan.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import DataTable, { type Column } from "@/components/ui/table/DataTable";
import { Avatar } from "@/components/ui/avatar/Avatar";
import Badge from "@/components/ui/badge/Badge";
import {
  getMembershipMembersAction,
  type MembershipMemberRow,
} from "./actions";
import MembershipDetailDrawer from "./MembershipDetailDrawer";

export default function MembershipLandingClient() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<MembershipMemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMembershipMembersAction();
      setRows(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Deep-link from Data Member "Kelola Membership" (?member=<id>).
  useEffect(() => {
    const id = searchParams.get("member");
    if (id) {
      setSelectedId(id);
      setOpen(true);
    }
  }, [searchParams]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.memberNo.toLowerCase().includes(q) ||
        m.phone.includes(q) ||
        (m.planName ?? "").toLowerCase().includes(q),
    );
  }, [query, rows]);

  const openDetail = (m: MembershipMemberRow) => {
    setSelectedId(m.id);
    setOpen(true);
  };

  const columns: Column<MembershipMemberRow>[] = [
    {
      key: "name",
      header: "Member",
      sortable: true,
      sortValue: (m) => m.name,
      accessor: (m) => (
        <div className="flex items-center gap-3">
          <Avatar name={m.name} size="md" />
          <div className="min-w-0">
            <p className="truncate font-medium text-gray-800 dark:text-white/90">{m.name}</p>
            <p className="truncate font-mono text-xs text-gray-400 dark:text-gray-500">{m.memberNo}</p>
          </div>
        </div>
      ),
    },
    {
      key: "plan",
      header: "Plan",
      accessor: (m) =>
        m.planName ? (
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: m.planColor ?? "#6D5BFF" }} />
            <span className="text-sm font-medium text-[var(--text-heading)]">{m.planName}</span>
          </div>
        ) : (
          <Badge variant="light" color="neutral" size="sm">
            Daily / Walk-in
          </Badge>
        ),
    },
    {
      key: "quota",
      header: "Kuota",
      align: "center",
      accessor: (m) =>
        m.planName && m.quotaTotal > 0 ? (
          <span className="text-sm text-gray-700 dark:text-gray-200">
            {m.quotaRemaining}/{m.quotaTotal}
          </span>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        ),
    },
    {
      key: "phone",
      header: "Telepon",
      accessor: (m) => <span className="text-sm text-gray-700 dark:text-gray-200">{m.phone}</span>,
    },
  ];

  return (
    <div>
      <PageBreadcrumb pageTitle="Membership" />

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h4 className="font-semibold text-[var(--text-heading)]">Kelola membership member</h4>
          <div className="relative w-full sm:w-72">
            <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama, no. member, plan…"
              className="h-10 w-full rounded-lg border border-gray-300 bg-transparent pl-9 pr-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            />
          </div>
        </div>

        {loading ? (
          <div className="space-y-2 py-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 w-full animate-pulse rounded-lg bg-gray-100 dark:bg-white/[0.04]" />
            ))}
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filtered}
            rowKey={(m) => m.id}
            onRowClick={openDetail}
            emptyState={<span className="text-sm text-gray-400">Belum ada member.</span>}
          />
        )}
      </div>

      <MembershipDetailDrawer
        memberId={selectedId}
        isOpen={open}
        onClose={() => setOpen(false)}
        onChanged={() => void load()}
      />
    </div>
  );
}
