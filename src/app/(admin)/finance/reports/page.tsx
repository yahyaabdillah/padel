"use client";

import React, { useMemo } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import LineChart from "@/components/ui/chart/LineChart";
import BarChart from "@/components/ui/chart/BarChart";
import DonutChart from "@/components/ui/chart/DonutChart";
import StatCard from "@/components/club-core/StatCard";
import FinanceNav from "@/components/club-core/FinanceNav";
import ExportButton from "@/components/club-core/ExportButton";
import { formatIDR } from "@/components/club-core/format";
import {
  financeSummary,
  txnCategoryMeta,
  type TxnCategory,
} from "@/data/padel/club/finance";

const REVENUE_CATS: TxnCategory[] = [
  "court_booking",
  "coaching",
  "membership",
  "pos",
  "event",
];

const catColors: Record<TxnCategory, string> = {
  court_booking: "#6D5BFF",
  coaching: "#14B8A6",
  membership: "#22C55E",
  pos: "#F59E0B",
  event: "#C6FF3D",
  refund: "#EF4444",
};

export default function FinanceReportsPage() {
  const summary = useMemo(() => financeSummary(), []);

  // 30-day revenue trend
  const trend = useMemo(() => {
    const series = summary.series;
    return {
      categories: series.map((r) => r.label),
      data: series.map((r) => r.total),
    };
  }, [summary]);

  // weekly revenue (group last ~4 weeks)
  const weekly = useMemo(() => {
    const series = summary.series;
    const buckets: number[] = [];
    for (let i = 0; i < series.length; i += 7) {
      buckets.push(series.slice(i, i + 7).reduce((s, r) => s + r.total, 0));
    }
    return buckets;
  }, [summary]);

  // category mix
  const mix = useMemo(() => {
    const cats = REVENUE_CATS.filter((c) => summary.byCategory[c] > 0);
    return {
      labels: cats.map((c) => txnCategoryMeta[c].label),
      series: cats.map((c) => summary.byCategory[c]),
      colors: cats.map((c) => catColors[c]),
    };
  }, [summary]);

  const bestDay = useMemo(
    () => summary.series.reduce((best, r) => (r.total > best.total ? r : best), summary.series[0]),
    [summary],
  );

  return (
    <div>
      <PageBreadcrumb pageTitle="Reports" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FinanceNav />
        <div className="mb-5">
          <ExportButton label="Export report (PDF)" filename="revenue-report.pdf" variant="primary" />
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="30-day revenue" value={formatIDR(summary.monthTotal, true)} accent="var(--color-primary)" delta="+8.4%" deltaTone="up" />
        <StatCard label="Daily average" value={formatIDR(Math.round(summary.monthTotal / Math.max(1, summary.series.length)), true)} accent="#14B8A6" />
        <StatCard label="Best day" value={formatIDR(bestDay?.total ?? 0, true)} accent="#F59E0B" hint={bestDay?.label} />
        <StatCard label="Transactions" value={summary.paidCount} accent="#EC4899" hint="paid this month" />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <ComponentCard title="Revenue trend" desc="Net daily revenue over the last 30 days">
          <LineChart
            series={[{ name: "Revenue", data: trend.data }]}
            categories={trend.categories}
            colors={["#6D5BFF"]}
            area
            height={320}
          />
        </ComponentCard>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ComponentCard title="Revenue by category" desc="Where the money comes from">
            <DonutChart
              series={mix.series}
              labels={mix.labels}
              colors={mix.colors}
              height={320}
            />
          </ComponentCard>

          <ComponentCard title="Weekly revenue" desc="Grouped by week">
            <BarChart
              series={[{ name: "Revenue", data: weekly }]}
              categories={weekly.map((_, i) => `Week ${i + 1}`)}
              colors={["#14B8A6"]}
              height={320}
            />
          </ComponentCard>
        </div>

        <ComponentCard title="Category breakdown" desc="Monthly revenue split by stream">
          <div className="space-y-3">
            {REVENUE_CATS.map((c) => {
              const value = summary.byCategory[c];
              const pct = summary.monthTotal ? Math.round((value / summary.monthTotal) * 100) : 0;
              return (
                <div key={c}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 font-medium text-gray-700 dark:text-gray-200">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: catColors[c] }} />
                      {txnCategoryMeta[c].label}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      {formatIDR(value, true)} · {pct}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: catColors[c] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </ComponentCard>
      </div>
    </div>
  );
}
