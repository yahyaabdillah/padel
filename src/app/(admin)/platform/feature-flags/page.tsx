"use client";

import React, { useMemo, useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import PlatformHeader from "@/components/platform/PlatformHeader";
import Badge from "@/components/ui/badge/Badge";
import Switch from "@/components/ui/switch/Switch";
import Tabs from "@/components/ui/tabs/Tabs";
import Select from "@/components/ui/select/Select";
import { useToast } from "@/components/ui/toast/ToastContext";
import { featureModules, moduleCategoryMeta } from "@/data/padel/platform/flags";
import { subscriptionPlans, mockTenants, planById, type PlanTier } from "@/data/padel/tenant";

type Scope = "plan" | "tenant";

// flag override key: `${scope}:${id}:${moduleKey}` → boolean
type FlagState = Record<string, boolean>;

export default function FeatureFlagsPage() {
  const toast = useToast();
  const [scope, setScope] = useState<Scope>("plan");
  const [planId, setPlanId] = useState<PlanTier>("pro");
  const [tenantId, setTenantId] = useState<string>(mockTenants[0].id);
  const [overrides, setOverrides] = useState<FlagState>({});

  const tenant = mockTenants.find((t) => t.id === tenantId)!;
  const targetPlan = scope === "plan" ? planId : tenant.plan;

  // base inclusion from plan
  const baseOn = (moduleKey: string) =>
    featureModules.find((m) => m.key === moduleKey)?.includedIn.includes(targetPlan) ?? false;

  const flagKey = (mk: string) =>
    scope === "plan" ? `plan:${planId}:${mk}` : `tenant:${tenantId}:${mk}`;

  const isOn = (mk: string) => {
    const k = flagKey(mk);
    return k in overrides ? overrides[k] : baseOn(mk);
  };

  const toggle = (mk: string, label: string) => {
    const k = flagKey(mk);
    const next = !isOn(mk);
    setOverrides((prev) => ({ ...prev, [k]: next }));
    toast[next ? "success" : "warning"](
      `${label} ${next ? "enabled" : "disabled"} for ${scope === "plan" ? planById(planId).name : tenant.name}.`,
      "Feature flag updated",
    );
  };

  const grouped = useMemo(() => {
    const order: (keyof typeof moduleCategoryMeta)[] = ["Core", "Growth", "Enterprise", "Beta"];
    return order.map((cat) => ({ cat, modules: featureModules.filter((m) => m.category === cat) }));
  }, []);

  const enabledCount = featureModules.filter((m) => isOn(m.key)).length;

  return (
    <div>
      <PageBreadcrumb pageTitle="Feature Flags" />
      <PlatformHeader
        eyebrow="Platform · Config"
        title="Feature Flags"
        description="Enable or disable product modules per plan tier, with per-tenant overrides for pilots and custom deals."
      />

      <ComponentCard
        title="Module Toggles"
        desc={`${enabledCount} of ${featureModules.length} modules enabled for the current target`}
      >
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Tabs
            variant="segment"
            items={[{ value: "plan", label: "By Plan" }, { value: "tenant", label: "By Tenant" }]}
            value={scope}
            onChange={(v) => setScope(v as Scope)}
          />
          <div className="w-full sm:max-w-xs">
            {scope === "plan" ? (
              <Select
                options={subscriptionPlans.map((p) => ({ value: p.id, label: p.name }))}
                value={planId}
                searchable
                onChange={(v) => setPlanId(v as PlanTier)}
              />
            ) : (
              <Select
                options={mockTenants.map((t) => ({ value: t.id, label: `${t.name} (${planById(t.plan).name})` }))}
                value={tenantId}
                searchable
                onChange={(v) => setTenantId(v as string)}
              />
            )}
          </div>
        </div>

        {scope === "tenant" && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-xs font-bold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">{tenant.name.slice(0, 2).toUpperCase()}</span>
            <span className="text-gray-600 dark:text-gray-300">
              Overrides inherit the <strong>{planById(tenant.plan).name}</strong> baseline. Toggling here creates a tenant-specific exception.
            </span>
          </div>
        )}

        <div className="space-y-6">
          {grouped.map(({ cat, modules }) => (
            <div key={cat}>
              <div className="mb-3 flex items-center gap-2">
                <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{cat}</h4>
                <Badge variant="light" color={moduleCategoryMeta[cat].tone} size="sm">{modules.length}</Badge>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {modules.map((m) => {
                  const on = isOn(m.key);
                  const overridden = flagKey(m.key) in overrides && overrides[flagKey(m.key)] !== baseOn(m.key);
                  return (
                    <div
                      key={m.key}
                      className={`flex items-start justify-between gap-3 rounded-xl border p-4 transition-colors ${
                        on ? "border-brand-200 bg-brand-50/40 dark:border-brand-500/30 dark:bg-brand-500/[0.06]" : "border-gray-200 dark:border-gray-800"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">{m.name}</p>
                          {m.beta && <Badge variant="light" color="warning" size="sm">beta</Badge>}
                          {overridden && <Badge variant="light" color="info" size="sm">override</Badge>}
                        </div>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{m.description}</p>
                        <code className="mt-1 inline-block text-[11px] text-gray-400">{m.key}</code>
                      </div>
                      <Switch checked={on} onChange={() => toggle(m.key, m.name)} />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ComponentCard>
    </div>
  );
}
