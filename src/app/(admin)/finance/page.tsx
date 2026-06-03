"use client";

import React, { useMemo, useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import DataTable, { type Column } from "@/components/ui/table/DataTable";
import Tabs from "@/components/ui/tabs/Tabs";
import StatCard from "@/components/club-core/StatCard";
import ToneBadge from "@/components/club-core/ToneBadge";
import FinanceNav from "@/components/club-core/FinanceNav";
import ExportButton from "@/components/club-core/ExportButton";
import { formatIDR } from "@/components/club-core/format";
import {
  mockTransactions,
  financeSummary,
  type Transaction,
  type TxnCategory,
  txnCategoryMeta,
  txnMethodMeta,
  txnStatusMeta,
} from "@/data/padel/club/finance";

const catTabs: { value: TxnCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "court_booking", label: "Bookings" },
  { value: "coaching", label: "Coaching" },
  { value: "membership", label: "Membership" },
  { value: "pos", label: "Pro Shop" },
  { value: "event", label: "Events" },
];

export default function FinancePage() {
  const [cat, setCat] = useState<TxnCategory | "all">("all");
  const [query, setQuery] = useState("");

  const summary = useMemo(() => financeSummary(), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return mockTransactions.filter((t) => {
      if (cat !== "all" && t.category !== cat) return false;
      if (!q) return true;
      return (
        t.description.toLowerCase().includes(q) ||
        t.customer.toLowerCase().includes(q) ||
        t.ref.toLowerCase().includes(q)
      );
    });
  }, [cat, query]);

  const columns: Column<Transaction>[] = [
    {
      key: "ref",
      header: "Receipt",
      sortable: true,
      sortValue: (t) => t.ref,
      accessor: (t) => <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{t.ref}</span>,
    },
    {
      key: "date",
      header: "Date",
      sortable: true,
      sortValue: (t) => t.date,
      accessor: (t) => (
        <span className="whitespace-nowrap text-gray-600 dark:text-gray-300">
          {t.date.slice(0, 10)} · {t.date.slice(11, 16)}
        </span>
      ),
    },
    {
      key: "description",
      header: "Description",
      accessor: (t) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-gray-800 dark:text-white/90">{t.description}</p>
          <p className="truncate text-xs text-gray-400 dark:text-gray-500">{t.customer}</p>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      sortable: true,
      sortValue: (t) => t.category,
      accessor: (t) => {
        const m = txnCategoryMeta[t.category];
        return <ToneBadge tone={m.tone}>{m.label}</ToneBadge>;
      },
    },
    {
      key: "method",
      header: "Method",
      align: "center",
      accessor: (t) => <span className="text-gray-500 dark:text-gray-400">{txnMethodMeta[t.method].label}</span>,
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      sortable: true,
      sortValue: (t) => t.status,
      accessor: (t) => {
        const m = txnStatusMeta[t.status];
        return <ToneBadge tone={m.tone}>{m.label}</ToneBadge>;
      },
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      sortable: true,
      sortValue: (t) => t.amount,
      accessor: (t) => (
        <span className={`font-semibold ${t.amount < 0 ? "text-red-500" : "text-gray-800 dark:text-white/90"}`}>
          {t.amount < 0 ? "−" : ""}
          {formatIDR(Math.abs(t.amount))}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageBreadcrumb pageTitle="Finance" />
      <FinanceNav />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Today" value={formatIDR(summary.today, true)} accent="var(--color-primary)" delta="+11.8%" deltaTone="up" hint="vs yesterday" />
        <StatCard label="This month" value={formatIDR(summary.monthTotal, true)} accent="#14B8A6" delta="+8.4%" deltaTone="up" hint="30-day net" />
        <StatCard label="Avg ticket" value={formatIDR(summary.avgTicket, true)} accent="#F59E0B" hint={`${summary.paidCount} paid txns`} />
        <StatCard label="Refunds" value={formatIDR(summary.refunds, true)} accent="#EF4444" delta="-2.1%" deltaTone="down" hint="this month" />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Tabs
            items={catTabs.map((t) => ({ value: t.value, label: t.label }))}
            value={cat}
            onChange={(v) => setCat(v as TxnCategory | "all")}
            variant="pill"
            size="sm"
          />
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search transactions…"
              className="h-9 w-48 rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 sm:w-60"
            />
            <ExportButton filename="transactions.csv" />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={filtered}
          rowKey={(t) => t.id}
          defaultSort={{ key: "date", direction: "desc" }}
          emptyState={<span className="text-sm text-gray-400">No transactions match your filters.</span>}
        />
      </div>
    </div>
  );
}
