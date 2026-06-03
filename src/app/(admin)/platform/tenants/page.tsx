"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import PlatformHeader from "@/components/platform/PlatformHeader";
import StatCard from "@/components/platform/StatCard";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import DataTable, { type Column } from "@/components/ui/table/DataTable";
import Drawer from "@/components/ui/drawer/Drawer";
import TextInput from "@/components/ui/input/TextInput";
import Tabs from "@/components/ui/tabs/Tabs";
import EmptyState from "@/components/ui/feedback/EmptyState";
import { useToast } from "@/components/ui/toast/ToastContext";
import { useRole } from "@/context/RoleContext";
import {
  mockTenants, tenantStatusMeta, planById,
  type Tenant, type TenantStatus,
} from "@/data/padel/tenant";
import { fmtIDR } from "@/data/padel/platform/metrics";
import { IconClub, IconUsers, IconImpersonate, IconCheck, IconChurn } from "@/components/platform/icons";

const planTone: Record<string, "primary" | "success" | "info"> = {
  starter: "info", pro: "primary", enterprise: "success",
};

export default function TenantsPage() {
  const toast = useToast();
  const router = useRouter();
  const { loginAsRole } = useRole();

  const [tenants, setTenants] = useState<Tenant[]>(mockTenants);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TenantStatus | "all">("all");
  const [selected, setSelected] = useState<Tenant | null>(null);

  const filtered = useMemo(() => {
    return tenants.filter((t) => {
      const matchQ =
        !query ||
        t.name.toLowerCase().includes(query.toLowerCase()) ||
        t.city.toLowerCase().includes(query.toLowerCase()) ||
        t.ownerName.toLowerCase().includes(query.toLowerCase());
      const matchS = statusFilter === "all" || t.status === statusFilter;
      return matchQ && matchS;
    });
  }, [tenants, query, statusFilter]);

  const toggleStatus = (t: Tenant) => {
    const nextStatus: TenantStatus = t.status === "suspended" ? "active" : "suspended";
    setTenants((prev) => prev.map((x) => (x.id === t.id ? { ...x, status: nextStatus } : x)));
    setSelected((s) => (s && s.id === t.id ? { ...s, status: nextStatus } : s));
    if (nextStatus === "suspended") toast.warning(`${t.name} has been suspended.`, "Tenant suspended");
    else toast.success(`${t.name} is active again.`, "Tenant reactivated");
  };

  const impersonate = (t: Tenant) => {
    loginAsRole("owner");
    toast.info(`Impersonating owner of ${t.name}. Redirecting…`, "Impersonation");
    setSelected(null);
    setTimeout(() => router.push("/"), 600);
  };

  const counts = {
    all: tenants.length,
    active: tenants.filter((t) => t.status === "active").length,
    trial: tenants.filter((t) => t.status === "trial").length,
    past_due: tenants.filter((t) => t.status === "past_due").length,
    suspended: tenants.filter((t) => t.status === "suspended").length,
  };
  const totalMrr = tenants.reduce((s, t) => s + t.mrr, 0);
  const totalMembers = tenants.reduce((s, t) => s + t.membersCount, 0);

  const columns: Column<Tenant>[] = [
    {
      key: "name", header: "Club", sortable: true, sortValue: (t) => t.name,
      accessor: (t) => (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-xs font-bold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
            {t.name.slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-gray-800 dark:text-gray-100">{t.name}</p>
            <p className="truncate text-xs text-gray-400">{t.city}, {t.country}</p>
          </div>
        </div>
      ),
    },
    {
      key: "plan", header: "Plan", sortable: true, sortValue: (t) => t.plan,
      accessor: (t) => <Badge variant="light" color={planTone[t.plan]} size="sm">{planById(t.plan).name}</Badge>,
    },
    {
      key: "status", header: "Status", sortable: true, sortValue: (t) => t.status,
      accessor: (t) => {
        const m = tenantStatusMeta[t.status];
        return <Badge variant="light" color={m.tone} size="sm" dot>{m.label}</Badge>;
      },
    },
    { key: "courts", header: "Courts", align: "center", sortable: true, sortValue: (t) => t.courts, accessor: (t) => t.courts },
    { key: "members", header: "Members", align: "right", sortable: true, sortValue: (t) => t.membersCount, accessor: (t) => t.membersCount.toLocaleString("id-ID") },
    { key: "mrr", header: "MRR", align: "right", sortable: true, sortValue: (t) => t.mrr, accessor: (t) => <span className="font-medium text-gray-800 dark:text-gray-100">{t.mrr ? fmtIDR(t.mrr, true) : "—"}</span> },
    {
      key: "actions", header: "", align: "right",
      accessor: (t) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="ghost" onClick={() => impersonate(t)} startIcon={<IconImpersonate />}>Impersonate</Button>
          <Button size="sm" variant="outline" onClick={() => setSelected(t)}>Detail</Button>
        </div>
      ),
    },
  ];

  const statusTabs = [
    { value: "all", label: "All", badge: counts.all },
    { value: "active", label: "Active", badge: counts.active },
    { value: "trial", label: "Trial", badge: counts.trial },
    { value: "past_due", label: "Past Due", badge: counts.past_due },
    { value: "suspended", label: "Suspended", badge: counts.suspended },
  ];

  return (
    <div>
      <PageBreadcrumb pageTitle="Tenants" />
      <PlatformHeader
        eyebrow="Platform · Tenants"
        title="Clubs & Subscriptions"
        description="Every padel club on PadelHub — manage plans, suspend access, or jump in to support."
        actions={<Button size="sm" variant="primary" sheen onClick={() => router.push("/onboarding")}>Onboard club</Button>}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Clubs" value={String(counts.all)} tone="primary" icon={<IconClub />} delta={12.5} />
        <StatCard label="Active" value={String(counts.active)} tone="success" icon={<IconCheck className="h-5 w-5" />} delta={8.3} />
        <StatCard label="At Risk (Past Due)" value={String(counts.past_due)} tone="warning" icon={<IconChurn />} delta={-1.2} />
        <StatCard label="Players Managed" value={totalMembers.toLocaleString("id-ID")} tone="info" icon={<IconUsers />} delta={9.1} hint={fmtIDR(totalMrr, true) + " MRR"} />
      </div>

      <ComponentCard title="All Tenants" desc={`${filtered.length} of ${tenants.length} clubs`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:max-w-xs">
            <TextInput
              type="search"
              placeholder="Search club, city or owner…"
              value={query}
              onChange={setQuery}
              startIcon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" /></svg>}
            />
          </div>
          <Tabs variant="segment" size="sm" items={statusTabs} value={statusFilter} onChange={(v) => setStatusFilter(v as TenantStatus | "all")} />
        </div>

        <div className="mt-4">
          <DataTable
            columns={columns}
            data={filtered}
            rowKey={(t) => t.id}
            onRowClick={(t) => setSelected(t)}
            defaultSort={{ key: "mrr", direction: "desc" }}
            emptyState={<EmptyState title="No clubs found" description="Try a different search or status filter." />}
          />
        </div>
      </ComponentCard>

      {/* Detail Drawer */}
      <Drawer
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name}
        size="w-full max-w-lg"
        footer={
          selected && (
            <div className="flex items-center justify-between gap-2">
              <Button
                variant={selected.status === "suspended" ? "primary" : "outline"}
                onClick={() => toggleStatus(selected)}
              >
                {selected.status === "suspended" ? "Reactivate club" : "Suspend club"}
              </Button>
              <Button variant="soft" startIcon={<IconImpersonate />} onClick={() => impersonate(selected)}>Impersonate owner</Button>
            </div>
          )
        }
      >
        {selected && <TenantDetail tenant={selected} />}
      </Drawer>
    </div>
  );
}

function TenantDetail({ tenant }: { tenant: Tenant }) {
  const plan = planById(tenant.plan);
  const meta = tenantStatusMeta[tenant.status];
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-lg font-bold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
          {tenant.name.slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold text-gray-900 dark:text-white">{tenant.name}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{tenant.city}, {tenant.country}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <Badge variant="light" color={meta.tone} size="sm" dot>{meta.label}</Badge>
            <Badge variant="light" color={planTone[tenant.plan]} size="sm">{plan.name}</Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Courts", value: String(tenant.courts) },
          { label: "Staff Seats", value: String(tenant.staffSeats) },
          { label: "Members", value: tenant.membersCount.toLocaleString("id-ID") },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-200 p-3 text-center dark:border-gray-800">
            <p className="text-lg font-bold text-gray-900 dark:text-white">{s.value}</p>
            <p className="text-[11px] text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
        <h4 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">Subscription</h4>
        <dl className="space-y-2 text-sm">
          <Row label="Plan" value={plan.name} />
          <Row label="MRR" value={tenant.mrr ? fmtIDR(tenant.mrr) : "Trial — Rp 0"} />
          <Row label="Member since" value={new Date(tenant.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })} />
          {tenant.trialEndsAt && <Row label="Trial ends" value={new Date(tenant.trialEndsAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })} />}
        </dl>
      </div>

      <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
        <h4 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">Owner</h4>
        <dl className="space-y-2 text-sm">
          <Row label="Name" value={tenant.ownerName} />
          <Row label="Email" value={tenant.ownerEmail} />
        </dl>
      </div>

      <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
        <h4 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">Included modules</h4>
        <div className="flex flex-wrap gap-2">
          {plan.limits.modules.map((m) => (
            <Badge key={m} variant="light" color="secondary" size="sm">{m.replace(/_/g, " ")}</Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="text-right font-medium text-gray-800 dark:text-gray-100">{value}</dd>
    </div>
  );
}
