"use client";

// Staff ▸ Membership detail drawer. Shows a member's current plan + quota +
// history and lets staff Assign / Extend / Upgrade a plan. Cash is allowed at
// the desk (cash received must be ≥ join fee → change shown); non-cash (QRIS /
// Transfer) also accepted. All writes route through the staff membership
// actions (RBAC-guarded server-side).

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Drawer from "@/components/ui/drawer/Drawer";
import { Avatar } from "@/components/ui/avatar/Avatar";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import UiSelect from "@/components/ui/select/Select";
import CurrencyInput from "@/components/ui/input/CurrencyInput";
import { ModalDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast/ToastContext";
import { useAccess } from "@/context/AccessContext";
import {
  getMembershipOverviewAction,
  assignPlanStaffAction,
  extendPlanStaffAction,
  upgradePlanStaffAction,
  type MembershipOverview,
  type MembershipPlanOption,
} from "./actions";
import type { PayMethod } from "@/lib/checkout-core";

const idr = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

const prettyDateTime = (iso: string) =>
  new Date(iso).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const ACTION_META: Record<string, { label: string; color: "primary" | "success" | "warning" }> = {
  assign: { label: "Assign", color: "primary" },
  extend: { label: "Perpanjang", color: "success" },
  upgrade: { label: "Upgrade", color: "warning" },
};

const PAY_METHODS: PayMethod[] = ["Cash", "QRIS", "Transfer"];

interface Props {
  memberId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onChanged?: () => void;
}

type ActionKind = "assign" | "extend" | "upgrade";

const MembershipDetailDrawer: React.FC<Props> = ({ memberId, isOpen, onClose, onChanged }) => {
  const toast = useToast();
  const { can, isSuper } = useAccess();
  const canCreate = isSuper || can("members.membership", "create");
  const canUpdate = isSuper || can("members.membership", "update");

  const [overview, setOverview] = useState<MembershipOverview | null>(null);
  const [loading, setLoading] = useState(false);

  // action modal state
  const [action, setAction] = useState<ActionKind | null>(null);
  const [targetPlanId, setTargetPlanId] = useState<string>("");
  const [method, setMethod] = useState<PayMethod>("Cash");
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!memberId) return;
    setLoading(true);
    try {
      const data = await getMembershipOverviewAction(memberId);
      setOverview(data);
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    if (isOpen && memberId) void load();
  }, [isOpen, memberId, load]);

  const status = overview?.status;
  const hasPlan = !!status?.planId;

  const targetPlan: MembershipPlanOption | undefined = useMemo(
    () => overview?.plans.find((p) => p.id === targetPlanId),
    [overview, targetPlanId],
  );

  const joinFee = targetPlan?.joinFee ?? 0;
  const change = method === "Cash" ? Math.max(0, cashReceived - joinFee) : 0;
  const cashShort = method === "Cash" && cashReceived < joinFee;

  const openAction = (kind: ActionKind) => {
    setAction(kind);
    setMethod("Cash");
    setCashReceived(0);
    if (kind === "extend") {
      setTargetPlanId(status?.planId ?? "");
    } else {
      setTargetPlanId("");
    }
  };

  const closeAction = () => setAction(null);

  const submit = async () => {
    if (!memberId || saving) return;
    if (action !== "extend" && !targetPlanId) {
      toast.error("Pilih plan terlebih dahulu.");
      return;
    }
    setSaving(true);
    const cash = method === "Cash" ? cashReceived : undefined;
    let res: { success: boolean; error?: string; change?: number };
    if (action === "assign") {
      res = await assignPlanStaffAction({ memberId, planId: targetPlanId, method, cashReceived: cash });
    } else if (action === "extend") {
      res = await extendPlanStaffAction({ memberId, method, cashReceived: cash });
    } else {
      res = await upgradePlanStaffAction({ memberId, planId: targetPlanId, method, cashReceived: cash });
    }
    setSaving(false);
    if (!res.success) {
      toast.error(res.error || "Gagal memproses membership.");
      return;
    }
    toast.success(
      action === "assign" ? "Plan di-assign." : action === "extend" ? "Membership diperpanjang." : "Membership di-upgrade.",
      res.change && res.change > 0 ? `Kembalian ${idr(res.change)}` : "Tersimpan",
    );
    closeAction();
    await load();
    onChanged?.();
  };

  // plan options for assign/upgrade (exclude current plan for upgrade)
  const planOptions = useMemo(() => {
    const plans = overview?.plans ?? [];
    const filtered = action === "upgrade" ? plans.filter((p) => p.id !== status?.planId) : plans;
    return filtered.map((p) => ({
      value: p.id,
      label: p.name,
      desc:
        p.joinFee > 0
          ? `${idr(p.joinFee)} · ${p.includedCourtBookings}x gratis · ${p.courtDiscountPct}% off`
          : `Gratis · ${p.includedCourtBookings}x gratis · ${p.courtDiscountPct}% off`,
    }));
  }, [overview, action, status]);

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Detail Membership" size="max-w-md">
      {loading || !overview ? (
        <div className="space-y-3">
          <div className="h-20 animate-pulse rounded-xl bg-[var(--surface-muted)]" />
          <div className="h-40 animate-pulse rounded-xl bg-[var(--surface-muted)]" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* member header */}
          <div className="flex items-center gap-4">
            <Avatar name={overview.member.name} size="xl" />
            <div className="min-w-0">
              <h3 className="truncate text-lg font-bold text-gray-900 dark:text-white">{overview.member.name}</h3>
              <p className="truncate font-mono text-xs text-gray-500 dark:text-gray-400">{overview.member.memberNo}</p>
              <p className="truncate text-sm text-gray-500 dark:text-gray-400">{overview.member.phone}</p>
            </div>
          </div>

          {/* current status */}
          <div className="rounded-xl border border-gray-100 p-4 dark:border-gray-800">
            <p className="mb-2 text-sm font-semibold text-[var(--text-heading)]">Plan saat ini</p>
            {hasPlan ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ background: status!.planColor ?? "#6D5BFF" }} />
                  <span className="text-sm font-medium text-[var(--text-heading)]">{status!.planName}</span>
                </div>
                {status!.quotaTotal > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400 dark:text-gray-500">Kuota tersisa</span>
                    <span className="font-medium text-gray-800 dark:text-white/90">
                      {status!.quotaRemaining}/{status!.quotaTotal}
                    </span>
                  </div>
                )}
                {status!.resetAt && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400 dark:text-gray-500">Reset kuota</span>
                    <span className="font-medium text-gray-800 dark:text-white/90">{status!.resetAt}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-caption)]">Daily / Walk-in (belum punya membership).</p>
            )}

            {/* actions */}
            <div className="mt-4 flex flex-wrap gap-2">
              {!hasPlan && canCreate && (
                <Button size="sm" variant="primary" sheen onClick={() => openAction("assign")}>
                  Assign Plan
                </Button>
              )}
              {hasPlan && canUpdate && (
                <>
                  <Button size="sm" variant="outline" onClick={() => openAction("extend")}>
                    Perpanjang
                  </Button>
                  <Button size="sm" variant="soft" onClick={() => openAction("upgrade")}>
                    Upgrade
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* history */}
          <div className="rounded-xl border border-gray-100 p-4 dark:border-gray-800">
            <p className="mb-3 text-sm font-semibold text-[var(--text-heading)]">Riwayat</p>
            {overview.history.length === 0 ? (
              <p className="py-3 text-center text-sm text-[var(--text-muted)]">Belum ada riwayat.</p>
            ) : (
              <ul className="space-y-3">
                {overview.history.map((h) => {
                  const meta = ACTION_META[h.action] ?? { label: h.action, color: "primary" as const };
                  return (
                    <li key={h.id} className="flex items-start justify-between gap-2 border-b border-[var(--border-light)] pb-3 last:border-0 last:pb-0">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="light" color={meta.color} size="sm">
                            {meta.label}
                          </Badge>
                          <span className="truncate text-sm font-medium text-[var(--text-heading)]">{h.planName}</span>
                        </div>
                        {h.previousPlanName && (
                          <p className="mt-0.5 text-xs text-[var(--text-muted)]">dari {h.previousPlanName}</p>
                        )}
                        <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                          {prettyDateTime(h.createdAt)} · {h.actorType === "staff" ? "oleh staff" : "oleh member"}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-medium text-[var(--text-heading)]">
                          {h.joinFee > 0 ? idr(h.joinFee) : "Gratis"}
                        </p>
                        {h.method && <p className="text-xs text-[var(--text-muted)]">{h.method}</p>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* action modal */}
      <ModalDialog
        isOpen={!!action}
        onClose={closeAction}
        title={action === "assign" ? "Assign Plan" : action === "extend" ? "Perpanjang Membership" : "Upgrade Membership"}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={closeAction} disabled={saving}>
              Batal
            </Button>
            <Button onClick={submit} sheen disabled={saving || cashShort || (action !== "extend" && !targetPlanId)}>
              {saving ? "Memproses…" : joinFee > 0 ? `Tagih ${idr(joinFee)}` : "Konfirmasi"}
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          {action === "upgrade" && (
            <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
              Upgrade mengganti plan. Sisa kuota plan lama hangus dan siklus dimulai ulang.
            </p>
          )}
          {action === "extend" && (
            <p className="rounded-xl bg-[var(--surface-muted)] p-3 text-xs text-[var(--text-caption)]">
              Perpanjang mereset siklus dan mengembalikan kuota penuh untuk plan {status?.planName}.
            </p>
          )}

          {action !== "extend" && (
            <UiSelect
              label="Plan"
              searchable
              placeholder="Pilih plan"
              options={planOptions}
              value={targetPlanId}
              clearable={false}
              onChange={(v) => setTargetPlanId(v as string)}
            />
          )}

          <div>
            <p className="mb-2 text-sm font-medium text-[var(--text-heading)]">Metode pembayaran</p>
            <div className="grid grid-cols-3 gap-2">
              {PAY_METHODS.map((pm) => (
                <button
                  key={pm}
                  type="button"
                  onClick={() => setMethod(pm)}
                  className={[
                    "rounded-xl border px-3 py-2.5 text-sm font-medium transition-all",
                    method === pm
                      ? "border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)]"
                      : "border-[var(--border-default)] text-[var(--text-body)] hover:border-[var(--color-primary)]/40",
                  ].join(" ")}
                >
                  {pm}
                </button>
              ))}
            </div>
          </div>

          {method === "Cash" && joinFee > 0 && (
            <div>
              <CurrencyInput
                label="Uang diterima"
                value={cashReceived}
                onChange={setCashReceived}
                error={cashShort}
                errorText="Uang tunai kurang dari total."
              />
              {!cashShort && cashReceived > 0 && (
                <p className="mt-1.5 text-xs text-[var(--text-caption)]">Kembalian: {idr(change)}</p>
              )}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-[var(--border-light)] pt-3">
            <span className="font-medium text-[var(--text-heading)]">Total tagihan</span>
            <span className="text-lg font-bold text-[var(--color-primary)]">
              {joinFee > 0 ? idr(joinFee) : "Gratis"}
            </span>
          </div>
        </div>
      </ModalDialog>
    </Drawer>
  );
};

export default MembershipDetailDrawer;
