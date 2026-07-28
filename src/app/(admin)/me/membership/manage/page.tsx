"use client";

// Member ▸ Membership ▸ Manage (DB-backed). Plan cards to Buy / Extend /
// Upgrade. Reached from /me/membership. Payment is non-cash only (cash goes
// through staff at the desk).
//   Buy     = member has no plan.
//   Extend  = same plan (reset cycle + full quota), charge join fee.
//   Upgrade = different plan (replace, forfeit remaining quota).

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import { ModalDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast/ToastContext";
import { CheckIcon } from "@/components/member/icons";
import { MEMBER_PAYMENT_METHODS, type MemberPaymentMethod } from "../../book/types";
import {
  getMyMembershipAction,
  buyMyMembershipAction,
  extendMyMembershipAction,
  upgradeMyMembershipAction,
  type MyMembershipData,
  type MyPlanOption,
} from "../actions";

const idr = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

type PendingAction =
  | { kind: "buy"; plan: MyPlanOption }
  | { kind: "extend"; plan: MyPlanOption }
  | { kind: "upgrade"; plan: MyPlanOption };

export default function ManageMembershipPage() {
  const router = useRouter();
  const toast = useToast();
  const [data, setData] = useState<MyMembershipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [method, setMethod] = useState<MemberPaymentMethod>("QRIS");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const d = await getMyMembershipAction();
    setData(d);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const status = data?.status;
  const hasPlan = !!status?.planId;

  const openAction = (kind: PendingAction["kind"], plan: MyPlanOption) => {
    setPending({ kind, plan } as PendingAction);
    setMethod("QRIS");
  };

  const confirm = async () => {
    if (!pending || saving) return;
    setSaving(true);
    let res: { success: boolean; error?: string };
    if (pending.kind === "buy") {
      res = await buyMyMembershipAction({ planId: pending.plan.id, method });
    } else if (pending.kind === "extend") {
      res = await extendMyMembershipAction({ method });
    } else {
      res = await upgradeMyMembershipAction({ planId: pending.plan.id, method });
    }
    setSaving(false);
    if (!res.success) {
      toast.error(res.error || "Gagal memproses membership.");
      return;
    }
    toast.success(
      pending.kind === "buy"
        ? "Membership aktif!"
        : pending.kind === "extend"
          ? "Membership diperpanjang!"
          : "Membership di-upgrade!",
      "Berhasil",
    );
    setPending(null);
    // back to the overview so the updated status is visible
    router.push("/me/membership");
  };

  if (loading || !data || !status) {
    return (
      <div>
        <PageBreadCrumb pageTitle="Kelola Membership" />
        <div className="h-[360px] animate-pulse rounded-2xl bg-[var(--surface-muted)]" />
      </div>
    );
  }

  return (
    <div>
      <PageBreadCrumb pageTitle="Kelola Membership" />

      <div className="mb-5 flex items-center justify-between gap-3">
        <Button variant="outline" startIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => router.push("/me/membership")}>
          Kembali
        </Button>
        {hasPlan && (
          <Badge variant="light" color="primary">
            Saat ini: {status.planName}
          </Badge>
        )}
      </div>

      {data.plans.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-10 text-center text-sm text-[var(--text-muted)]">
          Belum ada plan tersedia. Hubungi front desk.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.plans.map((p) => {
            const isCurrent = p.id === status.planId;
            return (
              <div
                key={p.id}
                className={`relative flex flex-col rounded-2xl border bg-[var(--surface-card)] p-5 transition-all ${
                  p.highlighted ? "border-[var(--color-primary)] shadow-theme-md" : "border-[var(--border-default)]"
                }`}
              >
                {p.highlighted && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-[var(--color-primary)] px-3 py-0.5 text-[11px] font-semibold text-white">
                    Populer
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ background: p.color }} />
                  <h5 className="text-lg font-bold text-[var(--text-heading)]">{p.name}</h5>
                  {isCurrent && (
                    <Badge variant="light" color="success" size="sm">
                      Aktif
                    </Badge>
                  )}
                </div>
                <p className="mt-3">
                  <span className="text-2xl font-bold text-[var(--text-heading)]">
                    {p.joinFee === 0 ? "Gratis" : idr(p.joinFee)}
                  </span>
                  {p.joinFee > 0 && <span className="text-sm text-[var(--text-muted)]"> join fee</span>}
                </p>
                <ul className="mt-4 flex-1 space-y-2">
                  {p.includedCourtBookings > 0 && (
                    <li className="flex items-start gap-2 text-sm text-[var(--text-body)]">
                      <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-primary)]" />
                      {p.includedCourtBookings} sesi 60 menit gratis / {p.resetPeriodDays} hari
                    </li>
                  )}
                  {p.courtDiscountPct > 0 && (
                    <li className="flex items-start gap-2 text-sm text-[var(--text-body)]">
                      <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-primary)]" />
                      Diskon {p.courtDiscountPct}% setelah kuota habis
                    </li>
                  )}
                  {p.freeCoaching > 0 && (
                    <li className="flex items-start gap-2 text-sm text-[var(--text-body)]">
                      <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-primary)]" />
                      {p.freeCoaching}x coaching gratis
                    </li>
                  )}
                  {p.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-2 text-sm text-[var(--text-body)]">
                      <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-primary)]" />
                      {perk}
                    </li>
                  ))}
                </ul>

                <div className="mt-5">
                  {!hasPlan ? (
                    <Button fullWidth variant={p.highlighted ? "primary" : "soft"} onClick={() => openAction("buy", p)}>
                      Beli
                    </Button>
                  ) : isCurrent ? (
                    <Button fullWidth variant="outline" onClick={() => openAction("extend", p)}>
                      Perpanjang
                    </Button>
                  ) : (
                    <Button fullWidth variant="soft" onClick={() => openAction("upgrade", p)}>
                      Upgrade
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* confirm modal */}
      <ModalDialog
        isOpen={!!pending}
        onClose={() => setPending(null)}
        title={
          pending?.kind === "buy"
            ? `Beli ${pending.plan.name}`
            : pending?.kind === "extend"
              ? `Perpanjang ${pending.plan.name}`
              : `Upgrade ke ${pending?.plan.name}`
        }
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setPending(null)} disabled={saving}>
              Batal
            </Button>
            <Button onClick={confirm} glow disabled={saving}>
              {saving
                ? "Memproses…"
                : (pending?.plan.joinFee ?? 0) > 0
                  ? `Bayar ${idr(pending?.plan.joinFee ?? 0)}`
                  : "Konfirmasi"}
            </Button>
          </div>
        }
      >
        {pending && (
          <div className="space-y-5">
            {pending.kind === "upgrade" && (
              <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                Upgrade akan mengganti plan Anda. Sisa kuota plan lama hangus dan siklus dimulai ulang.
              </p>
            )}
            {pending.kind === "extend" && (
              <p className="rounded-xl bg-[var(--surface-muted)] p-3 text-xs text-[var(--text-caption)]">
                Perpanjang akan mereset siklus dan mengembalikan kuota penuh.
              </p>
            )}

            <div>
              <p className="mb-2 text-sm font-medium text-[var(--text-heading)]">Metode pembayaran</p>
              <div className="grid grid-cols-2 gap-2">
                {MEMBER_PAYMENT_METHODS.map((pm) => (
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
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                Pembayaran tunai hanya tersedia di front desk (lewat staff).
              </p>
            </div>

            <div className="flex items-center justify-between border-t border-[var(--border-light)] pt-3">
              <span className="font-medium text-[var(--text-heading)]">Total</span>
              <span className="text-lg font-bold text-[var(--color-primary)]">
                {pending.plan.joinFee > 0 ? idr(pending.plan.joinFee) : "Gratis"}
              </span>
            </div>
          </div>
        )}
      </ModalDialog>
    </div>
  );
}
