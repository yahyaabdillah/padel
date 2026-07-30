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
  startMyMembershipMidtransAction,
  type MyMembershipData,
  type MyPlanOption,
} from "../actions";

const idr = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

type SnapCallbacks = {
  onSuccess: () => void;
  onPending: () => void;
  onError: () => void;
  onClose: () => void;
};

declare global {
  interface Window {
    snap?: { pay: (token: string, callbacks: SnapCallbacks) => void };
  }
}

async function loadMidtransSnap(clientKey: string, production: boolean) {
  const source = `${production ? "https://app.midtrans.com" : "https://app.sandbox.midtrans.com"}/snap/snap.js`;
  const existing = document.querySelector<HTMLScriptElement>(
    "script[data-padel-midtrans]",
  );
  if (
    existing &&
    existing.src === source &&
    existing.dataset.clientKey === clientKey &&
    window.snap
  ) return;
  existing?.remove();
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = source;
    script.async = true;
    script.dataset.padelMidtrans = "true";
    script.dataset.clientKey = clientKey;
    script.setAttribute("data-client-key", clientKey);
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Midtrans Snap gagal dimuat."));
    document.head.appendChild(script);
  });
}

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
  const pendingFee = pending?.plan.joinFee ?? 0;

  const openAction = (kind: PendingAction["kind"], plan: MyPlanOption) => {
    setPending({ kind, plan } as PendingAction);
    setMethod("QRIS");
  };

  const confirm = async () => {
    if (!pending || saving) return;
    setSaving(true);
    const selected = pending;
    const finish = async (providerOrderId?: string) => {
      let res: { success: boolean; error?: string };
      if (selected.kind === "buy") {
        res = await buyMyMembershipAction({
          planId: selected.plan.id,
          method,
          providerOrderId,
        });
      } else if (selected.kind === "extend") {
        res = await extendMyMembershipAction({ method, providerOrderId });
      } else {
        res = await upgradeMyMembershipAction({
          planId: selected.plan.id,
          method,
          providerOrderId,
        });
      }
      setSaving(false);
      if (!res.success) {
        toast.error(res.error || "Gagal memproses membership.");
        return;
      }
      toast.success(
        selected.kind === "buy"
          ? "Membership aktif!"
          : selected.kind === "extend"
            ? "Berhasil join ulang!"
            : "Membership di-upgrade!",
        "Berhasil",
      );
      setPending(null);
      router.push("/me/membership");
    };
    if (pendingFee === 0) {
      await finish();
      return;
    }
    const started = await startMyMembershipMidtransAction({
      kind: selected.kind,
      planId: selected.plan.id,
      method,
    });
    if (!started.success || !started.token || !started.orderId || !started.clientKey) {
      setSaving(false);
      toast.error(started.error || "Gagal memulai Midtrans.");
      return;
    }
    try {
      await loadMidtransSnap(started.clientKey, Boolean(started.production));
      if (!window.snap) throw new Error("Midtrans Snap tidak tersedia.");
      window.snap.pay(started.token, {
        onSuccess: () => void finish(started.orderId),
        onPending: () => {
          setSaving(false);
          toast.info("Pembayaran masih pending.", "Midtrans");
        },
        onError: () => {
          setSaving(false);
          toast.error("Pembayaran Midtrans gagal.");
        },
        onClose: () => setSaving(false),
      });
    } catch (err) {
      setSaving(false);
      toast.error(err instanceof Error ? err.message : "Midtrans Snap gagal dimuat.");
    }
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
                    <Badge variant="light" color={status.active ? "success" : "warning"} size="sm">
                      {status.active ? "Aktif" : "Berakhir"}
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
                      Join Ulang
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
              ? `Join Ulang ${pending.plan.name}`
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
                : pendingFee > 0
                  ? `Bayar ${idr(pendingFee)}`
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
                Join ulang memulai periode baru, mengenakan join fee, dan mengembalikan kuota penuh.
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
                 Pembayaran diproses dan diverifikasi melalui Midtrans.
              </p>
            </div>

            <div className="flex items-center justify-between border-t border-[var(--border-light)] pt-3">
              <span className="font-medium text-[var(--text-heading)]">Total</span>
              <span className="text-lg font-bold text-[var(--color-primary)]">
                {pendingFee > 0 ? idr(pendingFee) : "Gratis"}
              </span>
            </div>
          </div>
        )}
      </ModalDialog>
    </div>
  );
}
