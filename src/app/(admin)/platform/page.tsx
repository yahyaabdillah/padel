"use client";

import React, { useEffect, useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import PlatformHeader from "@/components/platform/PlatformHeader";
import StatCard from "@/components/platform/StatCard";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import Skeleton from "@/components/ui/feedback/Skeleton";
import LineChart from "@/components/ui/chart/LineChart";
import BarChart from "@/components/ui/chart/BarChart";
import DonutChart from "@/components/ui/chart/DonutChart";
import { useToast } from "@/components/ui/toast/ToastContext";
import {
  IconMrr, IconClub, IconTrial, IconChurn, IconWallet, IconUsers,
} from "@/components/platform/icons";
import {
  platformKpis, mrrTrend, MONTHS_12, tenantFlow, conversionTrend,
  planMix, mrrByPlan, platformActivity, activityMeta, fmtIDR,
} from "@/data/padel/platform/metrics";
import { mockTenants, tenantStatusMeta } from "@/data/padel/tenant";

const BRAND = ["#6D5BFF", "#14B8A6", "#C6FF3D", "#F59E0B", "#06B6D4"];
const kpiIcon: Record<string, React.ReactNode> = {
  mrr: <IconMrr />, active: <IconClub />, trial: <IconTrial />,
  churn: <IconChurn />, arpa: <IconWallet />, players: <IconUsers />,
};

export default function PlatformDashboardPage() {
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div>
      <PageBreadcrumb pageTitle="Platform Dashboard" />
      <PlatformHeader
        title="SaaS Command Center"
        description="Revenue, growth and health across every padel club running on PadelHub."
        actions={
          <>
            <Badge variant="light" color="success" dot>All systems operational</Badge>
            <Button
              size="sm"
              variant="primary"
              sheen
              onClick={() => toast.success("Platform report exported (platform-report.pdf).", "Export")}
            >
              Export report
            </Button>
          </>
        }
      />

      {/* KPI grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} height={140} className="rounded-2xl" />
            ))
          : platformKpis.map((k) => (
              <StatCard
                key={k.key}
                label={k.label}
                value={k.value}
                delta={k.delta}
                trend={k.trend}
                tone={k.tone}
                icon={kpiIcon[k.key]}
              />
            ))}
      </div>

      {/* MRR + plan mix */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ComponentCard title="Recurring Revenue" desc="Trailing 12 months MRR (IDR)">
            {loading ? (
              <Skeleton height={300} />
            ) : (
              <LineChart
                area
                colors={["#6D5BFF"]}
                categories={MONTHS_12}
                series={[{ name: "MRR", data: mrrTrend }]}
                height={300}
              />
            )}
          </ComponentCard>
        </div>
        <ComponentCard title="Plan Mix" desc="Active clubs by tier">
          {loading ? (
            <Skeleton height={300} />
          ) : (
            <DonutChart
              colors={BRAND}
              labels={planMix.map((p) => p.label)}
              series={planMix.map((p) => p.count)}
              height={300}
            />
          )}
        </ComponentCard>
      </div>

      {/* Growth + conversion */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ComponentCard title="Net Growth" desc="New vs churned clubs / month">
          {loading ? (
            <Skeleton height={280} />
          ) : (
            <BarChart
              colors={["#14B8A6", "#EF4444"]}
              categories={MONTHS_12}
              series={[
                { name: "New", data: tenantFlow.added },
                { name: "Churned", data: tenantFlow.churned },
              ]}
              height={280}
            />
          )}
        </ComponentCard>
        <ComponentCard title="Trial → Paid Conversion" desc="Monthly conversion rate (%)">
          {loading ? (
            <Skeleton height={280} />
          ) : (
            <LineChart
              area
              colors={["#C6FF3D"]}
              categories={MONTHS_12}
              series={[{ name: "Conversion", data: conversionTrend }]}
              height={280}
            />
          )}
        </ComponentCard>
      </div>

      {/* MRR by plan + activity */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ComponentCard title="MRR by Plan" desc="Revenue contribution" className="lg:col-span-1">
          <div className="space-y-4">
            {mrrByPlan.map((p, i) => {
              const total = mrrByPlan.reduce((s, x) => s + x.amount, 0) || 1;
              const pct = Math.round((p.amount / total) * 100);
              return (
                <div key={p.tier}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700 dark:text-gray-200">{p.label}</span>
                    <span className="text-gray-500 dark:text-gray-400">{fmtIDR(p.amount, true)}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: BRAND[i] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </ComponentCard>

        <div className="lg:col-span-2">
          <ComponentCard title="Recent Activity" desc="Latest events across tenants">
            <ul className="space-y-1">
              {platformActivity.map((e) => {
                const meta = activityMeta[e.type];
                return (
                  <li key={e.id} className="flex items-start gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                    <Badge variant="light" color={meta.tone === "primary" ? "primary" : meta.tone} size="sm">{meta.label}</Badge>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">{e.tenant}</p>
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">{e.message}</p>
                    </div>
                    <span className="shrink-0 text-xs text-gray-400">{e.at}</span>
                  </li>
                );
              })}
            </ul>
          </ComponentCard>
        </div>
      </div>

      {/* Tenant snapshot */}
      <div className="mt-6">
        <ComponentCard title="Tenant Snapshot" desc="At-a-glance club health">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {mockTenants.map((t) => {
              const meta = tenantStatusMeta[t.status];
              return (
                <div key={t.id} className="rounded-xl border border-gray-200 p-4 transition-colors hover:border-brand-300 dark:border-gray-800 dark:hover:border-brand-500/40">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-sm font-bold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                        {t.name.slice(0, 2).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-800 dark:text-gray-100">{t.name}</p>
                        <p className="truncate text-xs text-gray-500 dark:text-gray-400">{t.city}</p>
                      </div>
                    </div>
                    <Badge variant="light" color={meta.tone} size="sm">{meta.label}</Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div><p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{t.courts}</p><p className="text-[11px] text-gray-400">Courts</p></div>
                    <div><p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{t.membersCount}</p><p className="text-[11px] text-gray-400">Members</p></div>
                    <div><p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{fmtIDR(t.mrr, true)}</p><p className="text-[11px] text-gray-400">MRR</p></div>
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
