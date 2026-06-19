"use client";

// Member ▸ Membership (DB-backed) — overview page.
//   Row 1 (full width): a "hero" status card — plan, benefit usage, validity
//     period with a color-coded indicator (red < 3 days, yellow < 10 days,
//     green otherwise) + an icon, and a CTA to the manage page.
//   Then: the member's own membership history (timeline style).
// The plan cards live on a separate page (/me/membership/manage).

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  ArrowRight,
  Ticket,
  Percent,
  CalendarClock,
  Sparkles,
  History,
} from "lucide-react";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import { getMyMembershipAction, type MyMembershipData, type MyMembershipHistoryRow } from "./actions";

const idr = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

const prettyDate = (key: string) =>
  new Date(`${key}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

const prettyDateTime = (iso: string) =>
  new Date(iso).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const ACTION_META: Record<string, { label: string; color: "primary" | "success" | "warning"; dot: string }> = {
  assign: { label: "Beli", color: "primary", dot: "bg-[var(--color-primary)]" },
  extend: { label: "Perpanjang", color: "success", dot: "bg-emerald-500" },
  upgrade: { label: "Upgrade", color: "warning", dot: "bg-amber-500" },
};

/** Validity tier from days remaining: red < 3, yellow < 10, else green. */
type ValidityTone = "danger" | "warn" | "ok";
function validityTier(daysLeft: number | null): {
  tone: ValidityTone;
  Icon: typeof ShieldCheck;
  card: string;
  text: string;
  label: string;
} {
  if (daysLeft !== null && daysLeft < 3) {
    return {
      tone: "danger",
      Icon: AlertCircle,
      card: "border-rose-200 bg-gradient-to-br from-rose-50 to-rose-100/40 dark:border-rose-500/30 dark:from-rose-500/15 dark:to-rose-500/5",
      text: "text-rose-600 dark:text-rose-400",
      label: "Segera berakhir",
    };
  }
  if (daysLeft !== null && daysLeft < 10) {
    return {
      tone: "warn",
      Icon: AlertTriangle,
      card: "border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/40 dark:border-amber-500/30 dark:from-amber-500/15 dark:to-amber-500/5",
      text: "text-amber-600 dark:text-amber-400",
      label: "Akan berakhir",
    };
  }
  return {
    tone: "ok",
    Icon: ShieldCheck,
    card: "border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/40 dark:border-emerald-500/30 dark:from-emerald-500/15 dark:to-emerald-500/5",
    text: "text-emerald-600 dark:text-emerald-400",
    label: "Membership aktif",
  };
}

export default function MembershipPage() {
  const [data, setData] = useState<MyMembershipData | null>(null);
  const [loading, setLoading] = useState(true);

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
  const accent = status?.planColor ?? "#6D5BFF";

  const quotaUsed = status ? status.quotaTotal - status.quotaRemaining : 0;
  const quotaPct = useMemo(() => {
    if (!status || status.quotaTotal === 0) return 0;
    return Math.round((status.quotaRemaining / status.quotaTotal) * 100);
  }, [status]);

  const daysLeft = useMemo(() => {
    if (!status?.resetAt) return null;
    const end = new Date(`${status.resetAt}T00:00:00`).getTime();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.ceil((end - today.getTime()) / 86_400_000);
  }, [status]);

  if (loading || !data || !status) {
    return (
      <div>
        <PageBreadCrumb pageTitle="Membership" />
        <div className="h-[280px] animate-pulse rounded-3xl bg-[var(--surface-muted)]" />
      </div>
    );
  }

  const tier = validityTier(daysLeft);

  return (
    <div>
      <PageBreadCrumb pageTitle="Membership" />

      <div className="mx-auto max-w-3xl space-y-6">
        {/* ── Hero status card ── */}
        <div className="overflow-hidden rounded-3xl border border-[var(--border-default)] bg-[var(--surface-card)] shadow-theme-sm">
          {hasPlan ? (
            <>
              {/* accent banner */}
              <div
                className="relative px-6 pb-16 pt-6 sm:px-8"
                style={{
                  background: `linear-gradient(135deg, ${accent}26 0%, ${accent}0d 55%, transparent 100%)`,
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-[var(--text-caption)]">
                    <Sparkles className="h-3.5 w-3.5" style={{ color: accent }} />
                    Status membership
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm"
                    style={{ background: accent }}
                  >
                    <Ticket className="h-5.5 w-5.5" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-2xl font-bold leading-none text-[var(--text-heading)]">{status.planName}</h3>
                      <Badge variant="light" color="success" size="sm">
                        Aktif
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-caption)]">Plan membership Anda saat ini</p>
                  </div>
                </div>
              </div>

              {/* stat tiles — pulled up over the banner */}
              <div className="-mt-10 grid grid-cols-1 gap-4 px-6 sm:grid-cols-3 sm:px-8">
                {/* quota tile */}
                <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-4 shadow-theme-xs">
                  <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-caption)]">
                    <Ticket className="h-4 w-4" style={{ color: accent }} />
                    Kuota gratis
                  </div>
                  {status.quotaTotal > 0 ? (
                    <>
                      <p className="mt-2 text-xl font-bold text-[var(--text-heading)]">
                        {status.quotaRemaining}
                        <span className="text-sm font-medium text-[var(--text-muted)]"> / {status.quotaTotal} tersisa</span>
                      </p>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--surface-muted)]">
                        <div className="h-full rounded-full transition-all" style={{ width: `${quotaPct}%`, background: accent }} />
                      </div>
                      <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">{quotaUsed} terpakai siklus ini</p>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-[var(--text-muted)]">Tanpa kuota gratis</p>
                  )}
                </div>

                {/* discount tile */}
                <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-4 shadow-theme-xs">
                  <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-caption)]">
                    <Percent className="h-4 w-4" style={{ color: accent }} />
                    Diskon lapangan
                  </div>
                  {status.courtDiscountPct > 0 ? (
                    <>
                      <p className="mt-2 text-xl font-bold text-[var(--text-heading)]">{status.courtDiscountPct}%</p>
                      <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">Berlaku setelah kuota habis</p>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-[var(--text-muted)]">Tidak ada diskon tambahan</p>
                  )}
                </div>

                {/* validity tile */}
                <div className={`rounded-2xl border p-4 shadow-theme-xs ${tier.card}`}>
                  <div className={`flex items-center gap-2 text-xs font-semibold ${tier.text}`}>
                    <tier.Icon className="h-4 w-4" />
                    {tier.label}
                  </div>
                  <p className="mt-2 text-xl font-bold text-[var(--text-heading)]">
                    {daysLeft !== null ? (daysLeft <= 0 ? "Berakhir hari ini" : `${daysLeft} hari lagi`) : "Tanpa batas"}
                  </p>
                  {status.resetAt && (
                    <p className="mt-1.5 flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                      <CalendarClock className="h-3 w-3" />
                      Berlaku sampai {prettyDate(status.resetAt)}
                    </p>
                  )}
                </div>
              </div>

              {/* CTA */}
              <div className="px-6 pb-6 pt-5 sm:px-8">
                <Link href="/me/membership/manage">
                  <Button fullWidth glow endIcon={<ArrowRight className="h-4 w-4" />}>
                    Perpanjang / Perbarui Membership
                  </Button>
                </Link>
              </div>
            </>
          ) : (
            /* no plan state */
            <div className="px-6 py-8 sm:px-8">
              <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface-muted)] text-[var(--text-muted)]">
                    <ShieldCheck className="h-7 w-7" />
                  </span>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-caption)]">
                      Status membership
                    </p>
                    <h3 className="mt-1 text-2xl font-bold text-[var(--text-heading)]">Daily / Walk-in</h3>
                    <p className="mt-1.5 max-w-lg text-sm text-[var(--text-caption)]">
                      Anda belum memiliki membership. Beli plan untuk dapat kuota booking gratis &amp; diskon lapangan.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-6">
                <Link href="/me/membership/manage">
                  <Button fullWidth glow endIcon={<ArrowRight className="h-4 w-4" />}>
                    Beli Membership
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* ── History (timeline) ── */}
        <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface-card)] p-6 shadow-theme-sm">
          <div className="mb-5 flex items-center gap-2">
            <History className="h-4.5 w-4.5 text-[var(--text-muted)]" />
            <h4 className="font-semibold text-[var(--text-heading)]">Riwayat membership</h4>
          </div>

          {data.history.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-[var(--text-muted)]">Belum ada riwayat membership.</p>
            </div>
          ) : (
            <ol className="relative space-y-5 border-l border-[var(--border-light)] pl-5">
              {data.history.map((h: MyMembershipHistoryRow) => {
                const meta = ACTION_META[h.action] ?? { label: h.action, color: "primary" as const, dot: "bg-[var(--color-primary)]" };
                return (
                  <li key={h.id} className="relative">
                    <span className={`absolute -left-[26px] top-1 h-3 w-3 rounded-full ring-4 ring-[var(--surface-card)] ${meta.dot}`} />
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="light" color={meta.color} size="sm">
                            {meta.label}
                          </Badge>
                          <span className="truncate text-sm font-semibold text-[var(--text-heading)]">{h.planName}</span>
                          {h.previousPlanName && (
                            <span className="text-xs text-[var(--text-muted)]">← {h.previousPlanName}</span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-[var(--text-muted)]">{prettyDateTime(h.createdAt)}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-[var(--text-heading)]">
                          {h.joinFee > 0 ? idr(h.joinFee) : "Gratis"}
                        </p>
                        {h.method && (
                          <span className="mt-0.5 inline-block rounded-md bg-[var(--surface-muted)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-caption)]">
                            {h.method}
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
