"use client";

import React, { useMemo, useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import PlatformHeader from "@/components/platform/PlatformHeader";
import StatCard from "@/components/platform/StatCard";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import DataTable, { type Column } from "@/components/ui/table/DataTable";
import Tabs from "@/components/ui/tabs/Tabs";
import TextInput from "@/components/ui/input/TextInput";
import EmptyState from "@/components/ui/feedback/EmptyState";
import BarChart from "@/components/ui/chart/BarChart";
import DonutChart from "@/components/ui/chart/DonutChart";
import { useToast } from "@/components/ui/toast/ToastContext";
import {
  platformInvoices, invoiceStatusMeta, billingSummary, invoiceMethodLabel,
  type PlatformInvoice, type InvoiceStatus,
} from "@/data/padel/platform/invoices";
import { mrrByPlan, MONTHS_12, mrrTrend, fmtIDR } from "@/data/padel/platform/metrics";
import { IconWallet, IconMrr, IconChurn, IconCheck } from "@/components/platform/icons";

const BRAND = ["#6D5BFF", "#14B8A6", "#C6FF3D"];

export default function BillingPage() {
  const toast = useToast();
  const [filter, setFilter] = useState<InvoiceStatus | "all">("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return platformInvoices.filter((i) => {
      const matchS = filter === "all" || i.status === filter;
      const matchQ = !query || i.tenantName.toLowerCase().includes(query.toLowerCase()) || i.id.toLowerCase().includes(query.toLowerCase());
      return matchS && matchQ;
    });
  }, [filter, query]);

  const tabs = [
    { value: "all", label: "All", badge: platformInvoices.length },
    { value: "paid", label: "Paid", badge: platformInvoices.filter((i) => i.status === "paid").length },
    { value: "open", label: "Open", badge: platformInvoices.filter((i) => i.status === "open").length },
    { value: "past_due", label: "Past Due", badge: platformInvoices.filter((i) => i.status === "past_due").length },
    { value: "refunded", label: "Refunded", badge: platformInvoices.filter((i) => i.status === "refunded").length },
  ];

  const columns: Column<PlatformInvoice>[] = [
    { key: "id", header: "Invoice", sortable: true, sortValue: (i) => i.id, accessor: (i) => <span className="font-mono text-xs font-medium text-gray-700 dark:text-gray-200">{i.id}</span> },
    {
      key: "tenant", header: "Club", sortable: true, sortValue: (i) => i.tenantName,
      accessor: (i) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-gray-800 dark:text-gray-100">{i.tenantName}</p>
          <p className="truncate text-xs text-gray-400 capitalize">{i.plan} · {i.period}</p>
        </div>
      ),
    },
    { key: "method", header: "Method", accessor: (i) => <span className="text-sm text-gray-500 dark:text-gray-400">{invoiceMethodLabel[i.method]}</span> },
    { key: "due", header: "Due", sortable: true, sortValue: (i) => i.dueAt, accessor: (i) => <span className="text-sm text-gray-500 dark:text-gray-400">{new Date(i.dueAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</span> },
    { key: "amount", header: "Amount", align: "right", sortable: true, sortValue: (i) => i.amount, accessor: (i) => <span className="font-medium text-gray-800 dark:text-gray-100">{fmtIDR(i.amount)}</span> },
    {
      key: "status", header: "Status", align: "center", sortable: true, sortValue: (i) => i.status,
      accessor: (i) => { const m = invoiceStatusMeta[i.status]; return <Badge variant="light" color={m.tone === "neutral" ? "neutral" : m.tone} size="sm" dot>{m.label}</Badge>; },
    },
    {
      key: "act", header: "", align: "right",
      accessor: (i) => (
        <div onClick={(e) => e.stopPropagation()}>
          {i.status === "past_due" ? (
            <Button size="sm" variant="soft" onClick={() => toast.success(`Retry charge queued for ${i.tenantName}.`, "Payment retry")}>Retry</Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => toast.info(`Invoice ${i.id} PDF generated (dummy).`, "Download")}>PDF</Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageBreadcrumb pageTitle="Billing & Invoices" />
      <PlatformHeader
        eyebrow="Platform · Finance"
        title="Billing & Invoices"
        description="Subscription invoices, collection health and recurring revenue breakdown."
        actions={<Button size="sm" variant="primary" sheen onClick={() => toast.info("Exporting all invoices to CSV (dummy).", "Export")}>Export CSV</Button>}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Collected (YTD)" value={fmtIDR(billingSummary.collected, true)} tone="success" icon={<IconCheck className="h-5 w-5" />} delta={6.4} />
        <StatCard label="Outstanding" value={fmtIDR(billingSummary.outstanding, true)} tone="warning" icon={<IconWallet />} delta={-2.1} />
        <StatCard label="Past Due" value={fmtIDR(billingSummary.pastDue, true)} tone="error" icon={<IconChurn />} delta={1.0} />
        <StatCard label="Refunded" value={fmtIDR(billingSummary.refunded, true)} tone="info" icon={<IconMrr />} delta={0} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ComponentCard title="MRR Trend" desc="Recurring revenue over the last 12 months">
            <BarChart colors={["#6D5BFF"]} categories={MONTHS_12} series={[{ name: "MRR", data: mrrTrend }]} height={280} />
          </ComponentCard>
        </div>
        <ComponentCard title="Revenue by Plan" desc="MRR contribution split">
          <DonutChart colors={BRAND} labels={mrrByPlan.map((p) => p.label)} series={mrrByPlan.map((p) => Math.round(p.amount / 1000))} height={280} />
        </ComponentCard>
      </div>

      <ComponentCard title="Invoices" desc={`${filtered.length} of ${platformInvoices.length} invoices`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:max-w-xs">
            <TextInput type="search" placeholder="Search invoice or club…" value={query} onChange={setQuery} />
          </div>
          <Tabs variant="segment" size="sm" items={tabs} value={filter} onChange={(v) => setFilter(v as InvoiceStatus | "all")} />
        </div>
        <div className="mt-4">
          <DataTable
            columns={columns}
            data={filtered}
            rowKey={(i) => i.id}
            defaultSort={{ key: "due", direction: "desc" }}
            emptyState={<EmptyState title="No invoices" description="No invoices match the current filter." />}
          />
        </div>
      </ComponentCard>
    </div>
  );
}
