"use client";

import React, { useMemo, useState } from "react";
import PageScaffold from "@/components/club-engage/PageScaffold";
import StatCard from "@/components/club-engage/StatCard";
import { formatIDR, formatDateShort, formatNumber } from "@/components/club-engage/format";
import Card from "@/components/ui/card/Card";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import Tabs from "@/components/ui/tabs/Tabs";
import DataTable, { type Column } from "@/components/ui/table/DataTable";
import { ModalDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast/ToastContext";
import PromoEngineSection from "@/components/marketing/PromoEngineSection";
import {
  promos as seedPromos,
  promoStatusMeta,
  promoTypeLabels,
  type Promo,
  type PromoStatus,
} from "@/data/padel/engage/marketing";

export default function MarketingPage() {
  const toast = useToast();
  const [promos, setPromos] = useState<Promo[]>(seedPromos);
  const [filter, setFilter] = useState<"all" | PromoStatus>("all");
  const [detail, setDetail] = useState<Promo | null>(null);

  const filtered = useMemo(
    () => (filter === "all" ? promos : promos.filter((p) => p.status === filter)),
    [promos, filter],
  );

  const stats = useMemo(() => {
    const active = promos.filter((p) => p.status === "active").length;
    const redeemed = promos.reduce((s, p) => s + p.redeemed, 0);
    const revenue = promos.reduce((s, p) => s + p.revenue, 0);
    return { active, redeemed, revenue, total: promos.length };
  }, [promos]);

  const toggleStatus = (promo: Promo) => {
    const next: PromoStatus = promo.status === "active" ? "draft" : "active";
    setPromos((prev) => prev.map((p) => (p.id === promo.id ? { ...p, status: next } : p)));
    toast.success(`"${promo.title}" is now ${next}.`);
  };

  const columns: Column<Promo>[] = [
    {
      key: "title",
      header: "Promotion",
      accessor: (p) => (
        <div>
          <p className="font-medium text-[var(--text-heading)]">{p.title}</p>
          <code className="rounded bg-[var(--surface-muted)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--color-primary)]">{p.code}</code>
        </div>
      ),
    },
    { key: "type", header: "Type", accessor: (p) => <Badge size="sm" color="secondary" variant="light">{promoTypeLabels[p.type]}</Badge> },
    { key: "audience", header: "Audience", accessor: (p) => <span className="text-[var(--text-caption)]">{p.audience}</span> },
    {
      key: "redeemed",
      header: "Redeemed",
      align: "center",
      sortable: true,
      sortValue: (p) => p.redeemed,
      accessor: (p) => (
        <div className="flex flex-col items-center">
          <span className="text-sm font-semibold text-[var(--text-heading)]">{formatNumber(p.redeemed)}/{formatNumber(p.cap)}</span>
          <div className="mt-1 h-1.5 w-16 overflow-hidden rounded-full bg-[var(--surface-muted)]">
            <div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${Math.min(100, (p.redeemed / p.cap) * 100)}%` }} />
          </div>
        </div>
      ),
    },
    { key: "revenue", header: "Revenue", align: "right", sortable: true, sortValue: (p) => p.revenue, accessor: (p) => <span className="font-semibold text-[var(--text-heading)]">{formatIDR(p.revenue, true)}</span> },
    { key: "period", header: "Period", accessor: (p) => <span className="text-xs text-[var(--text-caption)]">{formatDateShort(p.startDate)} – {formatDateShort(p.endDate)}</span> },
    { key: "status", header: "Status", align: "center", accessor: (p) => <Badge size="sm" color={promoStatusMeta[p.status].tone === "neutral" ? "neutral" : promoStatusMeta[p.status].tone} variant="light" dot>{promoStatusMeta[p.status].label}</Badge> },
    {
      key: "actions",
      header: "",
      align: "right",
      accessor: (p) => (
        <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          {(p.status === "active" || p.status === "draft") && (
            <Button size="sm" variant="ghost" onClick={() => toggleStatus(p)}>
              {p.status === "active" ? "Pause" : "Activate"}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setDetail(p)}>View</Button>
        </div>
      ),
    },
  ];

  return (
    <PageScaffold
      title="Promotions"
      subtitle="Create and track marketing campaigns, discount codes and bundle offers."
      requireAny={["marketing.view"]}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Active Promos" value={stats.active} accent="primary" />
          <StatCard label="Total Campaigns" value={stats.total} accent="secondary" />
          <StatCard label="Total Redemptions" value={formatNumber(stats.redeemed)} accent="accent" delta="+18%" hint="vs last month" />
          <StatCard label="Attributed Revenue" value={formatIDR(stats.revenue, true)} accent="amber" delta="+22%" hint="vs last month" />
        </div>

        <PromoEngineSection />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-base font-semibold text-[var(--text-heading)]">Campaigns</h3>
          <Tabs
            variant="segment"
            size="sm"
            value={filter}
            onChange={(v) => setFilter(v as typeof filter)}
            items={[
              { value: "all", label: "All" },
              { value: "active", label: "Active" },
              { value: "scheduled", label: "Scheduled" },
              { value: "draft", label: "Draft" },
              { value: "expired", label: "Expired" },
            ]}
          />
        </div>

        <DataTable columns={columns} data={filtered} rowKey={(p) => p.id} onRowClick={(p) => setDetail(p)} />
      </div>

      <ModalDialog
        isOpen={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.title}
        description={detail ? `Code: ${detail.code} · ${promoTypeLabels[detail.type]}` : ""}
        size="md"
        footer={<div className="flex justify-end"><Button variant="primary" onClick={() => setDetail(null)}>Done</Button></div>}
      >
        {detail && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge color={promoStatusMeta[detail.status].tone === "neutral" ? "neutral" : promoStatusMeta[detail.status].tone} variant="light" dot>{promoStatusMeta[detail.status].label}</Badge>
              <Badge color="secondary" variant="light">{detail.audience}</Badge>
              {detail.type === "percentage" && <Badge color="primary" variant="light">{detail.value}% off</Badge>}
              {detail.type === "fixed" && <Badge color="primary" variant="light">{formatIDR(detail.value)} off</Badge>}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                { l: "Redeemed", v: `${formatNumber(detail.redeemed)} / ${formatNumber(detail.cap)}` },
                { l: "Revenue", v: formatIDR(detail.revenue, true) },
                { l: "Conversion", v: `${((detail.redeemed / detail.cap) * 100).toFixed(0)}%` },
                { l: "Start", v: formatDateShort(detail.startDate) },
                { l: "End", v: formatDateShort(detail.endDate) },
                { l: "Channels", v: detail.channel.length || "—" },
              ].map((m) => (
                <div key={m.l} className="rounded-xl border border-[var(--border-light)] p-3 text-center">
                  <p className="text-base font-bold text-[var(--text-heading)]">{m.v}</p>
                  <p className="text-[11px] text-[var(--text-muted)]">{m.l}</p>
                </div>
              ))}
            </div>
            {detail.channel.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Distribution channels</p>
                <div className="flex flex-wrap gap-1.5">
                  {detail.channel.map((c) => <Badge key={c} color="info" variant="light">{c}</Badge>)}
                </div>
              </div>
            )}
          </div>
        )}
      </ModalDialog>
    </PageScaffold>
  );
}
