"use client";

import React, { useMemo, useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import DataTable, { type Column } from "@/components/ui/table/DataTable";
import { Avatar } from "@/components/ui/avatar/Avatar";
import Tabs from "@/components/ui/tabs/Tabs";
import StatCard from "@/components/club-core/StatCard";
import ToneBadge from "@/components/club-core/ToneBadge";
import MemberDetailDrawer from "@/components/club-core/MemberDetailDrawer";
import { formatIDR } from "@/components/club-core/format";
import {
  mockMembers,
  type Member,
  type MemberTier,
  memberTierMeta,
  memberStatusMeta,
} from "@/data/padel/club/members";

const tierTabs: { value: MemberTier | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "elite", label: "Elite" },
  { value: "pro", label: "Pro" },
  { value: "casual", label: "Casual" },
];

export default function MembersPage() {
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState<MemberTier | "all">("all");
  const [selected, setSelected] = useState<Member | null>(null);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return mockMembers.filter((m) => {
      if (tier !== "all" && m.tier !== tier) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.phone.includes(q) ||
        m.city.toLowerCase().includes(q)
      );
    });
  }, [query, tier]);

  const totals = useMemo(() => {
    const active = mockMembers.filter((m) => m.status === "active").length;
    const wallet = mockMembers.reduce((s, m) => s + m.walletBalance, 0);
    const elite = mockMembers.filter((m) => m.tier === "elite").length;
    return { total: mockMembers.length, active, wallet, elite };
  }, []);

  const openDrawer = (m: Member) => {
    setSelected(m);
    setOpen(true);
  };

  const columns: Column<Member>[] = [
    {
      key: "name",
      header: "Player",
      sortable: true,
      sortValue: (m) => m.name,
      accessor: (m) => (
        <div className="flex items-center gap-3">
          <Avatar name={m.name} size="md" status={m.status === "active" ? "online" : undefined} />
          <div className="min-w-0">
            <p className="truncate font-medium text-gray-800 dark:text-white/90">{m.name}</p>
            <p className="truncate text-xs text-gray-400 dark:text-gray-500">{m.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "tier",
      header: "Tier",
      sortable: true,
      sortValue: (m) => m.tier,
      accessor: (m) => {
        const t = memberTierMeta[m.tier];
        return (
          <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
            style={{ background: t.color }}
          >
            {t.label}
          </span>
        );
      },
    },
    {
      key: "rating",
      header: "Rating",
      sortable: true,
      align: "center",
      sortValue: (m) => m.rating,
      accessor: (m) => <span className="font-semibold text-gray-700 dark:text-gray-200">{m.rating}</span>,
    },
    {
      key: "wallet",
      header: "Wallet",
      sortable: true,
      align: "right",
      sortValue: (m) => m.walletBalance,
      accessor: (m) => (
        <span className={m.walletBalance > 0 ? "font-medium text-gray-800 dark:text-white/90" : "text-gray-400"}>
          {formatIDR(m.walletBalance)}
        </span>
      ),
    },
    {
      key: "bookings",
      header: "Bookings",
      sortable: true,
      align: "center",
      sortValue: (m) => m.totalBookings,
      accessor: (m) => m.totalBookings,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      align: "center",
      sortValue: (m) => m.status,
      accessor: (m) => {
        const s = memberStatusMeta[m.status];
        return <ToneBadge tone={s.tone}>{s.label}</ToneBadge>;
      },
    },
  ];

  return (
    <div>
      <PageBreadcrumb pageTitle="Members" />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total players" value={totals.total} accent="var(--color-primary)" />
        <StatCard label="Active" value={totals.active} accent="#14B8A6" />
        <StatCard label="Elite members" value={totals.elite} accent="#F59E0B" />
        <StatCard label="Wallet float" value={formatIDR(totals.wallet, true)} accent="#EC4899" />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Tabs
            items={tierTabs.map((t) => ({ value: t.value, label: t.label }))}
            value={tier}
            onChange={(v) => setTier(v as MemberTier | "all")}
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
              placeholder="Search name, email, phone…"
              className="h-10 w-full rounded-lg border border-gray-300 bg-transparent pl-9 pr-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={filtered}
          rowKey={(m) => m.id}
          onRowClick={openDrawer}
          defaultSort={{ key: "name", direction: "asc" }}
          emptyState={
            <span className="text-sm text-gray-400">No members match your filters.</span>
          }
        />
      </div>

      <MemberDetailDrawer member={selected} isOpen={open} onClose={() => setOpen(false)} />
    </div>
  );
}
