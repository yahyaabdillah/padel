"use client";

import React, { useMemo, useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import PlatformHeader from "@/components/platform/PlatformHeader";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { ModalDialog } from "@/components/ui/modal";
import TextInput from "@/components/ui/input/TextInput";
import Textarea from "@/components/ui/input/Textarea";
import { useToast } from "@/components/ui/toast/ToastContext";
import { IconCheck, IconEdit } from "@/components/platform/icons";
import {
  subscriptionPlans, type SubscriptionPlan, type PlanTier,
} from "@/data/padel/tenant";
import { featureModules } from "@/data/padel/platform/flags";
import { fmtIDR } from "@/data/padel/platform/metrics";

const tierAccent: Record<PlanTier, "info" | "primary" | "success"> = {
  starter: "info", pro: "primary", enterprise: "success",
};

export default function PlansPage() {
  const toast = useToast();
  const [plans, setPlans] = useState<SubscriptionPlan[]>(subscriptionPlans);
  const [editing, setEditing] = useState<SubscriptionPlan | null>(null);
  const [draft, setDraft] = useState<{ name: string; priceMonthly: string; blurb: string; courts: string; staff: string }>({
    name: "", priceMonthly: "", blurb: "", courts: "", staff: "",
  });

  const openEdit = (p: SubscriptionPlan) => {
    setEditing(p);
    setDraft({
      name: p.name,
      priceMonthly: String(p.priceMonthly),
      blurb: p.blurb,
      courts: String(p.limits.courts),
      staff: String(p.limits.staff),
    });
  };

  const save = () => {
    if (!editing) return;
    setPlans((prev) =>
      prev.map((p) =>
        p.id === editing.id
          ? {
              ...p,
              name: draft.name || p.name,
              priceMonthly: Number(draft.priceMonthly) || p.priceMonthly,
              blurb: draft.blurb,
              limits: { ...p.limits, courts: Number(draft.courts), staff: Number(draft.staff) },
            }
          : p,
      ),
    );
    toast.success(`${draft.name} plan updated.`, "Plan saved");
    setEditing(null);
  };

  const limitLabel = (n: number) => (n === -1 ? "Unlimited" : String(n));

  const matrix = useMemo(() => featureModules.filter((m) => !m.beta), []);

  return (
    <div>
      <PageBreadcrumb pageTitle="Plans & Pricing" />
      <PlatformHeader
        eyebrow="Platform · Billing"
        title="Plans & Pricing"
        description="Define the subscription tiers, limits and module entitlements offered to clubs."
        actions={
          <Button
            size="sm"
            variant="primary"
            sheen
            onClick={() => toast.info("New plan builder coming soon — clone an existing tier to start.", "New plan")}
          >
            New plan
          </Button>
        }
      />

      {/* Plan cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {plans.map((p) => (
          <div
            key={p.id}
            className={`relative flex flex-col overflow-hidden rounded-2xl border bg-white p-6 transition-all hover:-translate-y-1 hover:shadow-theme-lg dark:bg-white/[0.03] ${
              p.highlighted
                ? "border-brand-400 ring-2 ring-brand-200 dark:border-brand-500/50 dark:ring-brand-500/20"
                : "border-gray-200 dark:border-gray-800"
            }`}
          >
            {p.highlighted && (
              <span className="absolute right-4 top-4 rounded-full bg-accent-300 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-gray-900">
                Most popular
              </span>
            )}
            <div className="flex items-center gap-2">
              <Badge variant="light" color={tierAccent[p.id]} size="sm">{p.name}</Badge>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-bold text-gray-900 dark:text-white">{fmtIDR(p.priceMonthly)}</span>
              <span className="text-sm text-gray-400"> /month</span>
            </div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{p.blurb}</p>

            <div className="my-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-gray-50 p-3 text-center dark:bg-white/[0.04]">
                <p className="text-lg font-bold text-gray-900 dark:text-white">{limitLabel(p.limits.courts)}</p>
                <p className="text-[11px] text-gray-400">Courts</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-3 text-center dark:bg-white/[0.04]">
                <p className="text-lg font-bold text-gray-900 dark:text-white">{limitLabel(p.limits.staff)}</p>
                <p className="text-[11px] text-gray-400">Staff seats</p>
              </div>
            </div>

            <ul className="flex-1 space-y-2.5">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-600 dark:bg-teal-500/15 dark:text-teal-400">
                    <IconCheck className="h-3 w-3" />
                  </span>
                  {f}
                </li>
              ))}
            </ul>

            <Button className="mt-6" fullWidth variant={p.highlighted ? "primary" : "outline"} startIcon={<IconEdit />} onClick={() => openEdit(p)}>
              Edit plan
            </Button>
          </div>
        ))}
      </div>

      {/* Feature limits matrix */}
      <div className="mt-8">
        <ComponentCard title="Module Entitlements" desc="Which modules are bundled into each plan tier">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Module</th>
                  {plans.map((p) => (
                    <th key={p.id} className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-400">{p.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.map((m) => (
                  <tr key={m.key} className="border-b border-gray-100 last:border-0 dark:border-gray-800/60">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{m.name}</p>
                      <p className="text-xs text-gray-400">{m.description}</p>
                    </td>
                    {plans.map((p) => {
                      const included = m.includedIn.includes(p.id);
                      return (
                        <td key={p.id} className="px-4 py-3 text-center">
                          {included ? (
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-teal-50 text-teal-600 dark:bg-teal-500/15 dark:text-teal-400">
                              <IconCheck />
                            </span>
                          ) : (
                            <span className="text-gray-300 dark:text-gray-600">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ComponentCard>
      </div>

      {/* Edit modal */}
      <ModalDialog
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        title={`Edit ${editing?.name} plan`}
        description="Pricing & limits are dummy-only — changes persist in this session."
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button variant="primary" onClick={save}>Save changes</Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextInput label="Plan name" value={draft.name} onChange={(v) => setDraft((d) => ({ ...d, name: v }))} />
          <TextInput label="Price / month (IDR)" type="number" value={draft.priceMonthly} onChange={(v) => setDraft((d) => ({ ...d, priceMonthly: v }))} />
          <TextInput label="Court limit (-1 = unlimited)" type="number" value={draft.courts} onChange={(v) => setDraft((d) => ({ ...d, courts: v }))} />
          <TextInput label="Staff seat limit (-1 = unlimited)" type="number" value={draft.staff} onChange={(v) => setDraft((d) => ({ ...d, staff: v }))} />
          <div className="sm:col-span-2">
            <Textarea label="Blurb" rows={2} value={draft.blurb} onChange={(v) => setDraft((d) => ({ ...d, blurb: v }))} />
          </div>
        </div>
      </ModalDialog>
    </div>
  );
}
