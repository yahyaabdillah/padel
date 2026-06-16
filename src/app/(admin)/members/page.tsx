"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import DataTable, { type Column } from "@/components/ui/table/DataTable";
import { Avatar } from "@/components/ui/avatar/Avatar";
import Tabs from "@/components/ui/tabs/Tabs";
import StatCard from "@/components/club-core/StatCard";
import ToneBadge from "@/components/club-core/ToneBadge";
import { useToast } from "@/components/ui/toast/ToastContext";
import { useAccess } from "@/context/AccessContext";
import {
  getMembersAction,
  type MemberRecord,
} from "@/app/(admin)/members/actions";
import MemberDetailDrawer from "@/components/club-core/MemberDetailDrawer";

type StatusFilter = "all" | "active" | "inactive" | "frozen";

const statusTabs: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "active", label: "Aktif" },
  { value: "inactive", label: "Nonaktif" },
  { value: "frozen", label: "Frozen" },
];

const statusMeta: Record<
  string,
  { label: string; tone: "success" | "neutral" | "warning" }
> = {
  active: { label: "Aktif", tone: "success" },
  inactive: { label: "Nonaktif", tone: "neutral" },
  frozen: { label: "Frozen", tone: "warning" },
};

export default function MembersPage() {
  const toast = useToast();
  const { can } = useAccess();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MemberRecord | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await getMembersAction();
      setMembers(rows);
    } catch {
      toast.error("Gagal memuat data member.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((m) => {
      if (status !== "all" && m.status !== status) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.username.toLowerCase().includes(q) ||
        m.memberNo.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.phone.includes(q) ||
        (m.city ?? "").toLowerCase().includes(q)
      );
    });
  }, [query, status, members]);

  const totals = useMemo(() => {
    const active = members.filter((m) => m.status === "active").length;
    const inactive = members.filter((m) => m.status !== "active").length;
    return { total: members.length, active, inactive };
  }, [members]);

  const openDrawer = (m: MemberRecord) => {
    setSelected(m);
    setOpen(true);
  };

  const columns: Column<MemberRecord>[] = [
    {
      key: "name",
      header: "Member",
      sortable: true,
      sortValue: (m) => m.name,
      accessor: (m) => (
        <div className="flex items-center gap-3">
          <Avatar name={m.name} size="md" status={m.status === "active" ? "online" : undefined} />
          <div className="min-w-0">
            <p className="truncate font-medium text-gray-800 dark:text-white/90">{m.name}</p>
            <p className="truncate text-xs text-gray-400 dark:text-gray-500">
              @{m.username}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "memberNo",
      header: "No. Member",
      sortable: true,
      sortValue: (m) => m.memberNo,
      accessor: (m) => (
        <span className="font-mono text-xs text-gray-600 dark:text-gray-300">
          {m.memberNo}
        </span>
      ),
    },
    {
      key: "phone",
      header: "Kontak",
      accessor: (m) => (
        <div className="min-w-0">
          <p className="truncate text-sm text-gray-700 dark:text-gray-200">{m.phone}</p>
          {m.email && (
            <p className="truncate text-xs text-gray-400 dark:text-gray-500">{m.email}</p>
          )}
        </div>
      ),
    },
    {
      key: "createdAt",
      header: "Terdaftar",
      sortable: true,
      sortValue: (m) => m.createdAt,
      accessor: (m) => (
        <span className="text-sm text-gray-600 dark:text-gray-300">
          {m.createdAt.slice(0, 10)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      align: "center",
      sortValue: (m) => m.status,
      accessor: (m) => {
        const s = statusMeta[m.status] ?? statusMeta.active;
        return <ToneBadge tone={s.tone}>{s.label}</ToneBadge>;
      },
    },
  ];

  return (
    <div>
      <PageBreadcrumb pageTitle="Data Member" />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total member" value={totals.total} accent="var(--color-primary)" />
        <StatCard label="Aktif" value={totals.active} accent="#14B8A6" />
        <StatCard label="Nonaktif / Frozen" value={totals.inactive} accent="#F59E0B" />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Tabs
            items={statusTabs.map((t) => ({ value: t.value, label: t.label }))}
            value={status}
            onChange={(v) => setStatus(v as StatusFilter)}
            variant="pill"
            size="sm"
          />
          <div className="relative w-full sm:w-72">
            <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama, username, no. member…"
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
            onRowClick={openDrawer}
            defaultSort={{ key: "createdAt", direction: "desc" }}
            emptyState={
              <span className="text-sm text-gray-400">
                Belum ada member yang cocok dengan filter.
              </span>
            }
          />
        )}
      </div>

      <MemberDetailDrawer
        member={selected}
        isOpen={open}
        onClose={() => setOpen(false)}
        canUpdate={can("members.data", "update")}
        canDelete={can("members.data", "delete")}
        onChanged={() => {
          setOpen(false);
          void load();
        }}
      />
    </div>
  );
}
