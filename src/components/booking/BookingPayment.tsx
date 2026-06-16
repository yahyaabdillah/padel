"use client";

// PadelHub — booking payment step. Reached after picking a court + one or more
// hourly slots + a member in the New Booking search flow. Reads the pending
// booking from URL params (slots = comma-separated storage-slot indices), shows
// a payment summary + method picker, and on confirm creates one 60-min booking
// per selected slot via useClubData.addBooking, then shows a receipt.

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import Card from "@/components/ui/card/Card";
import Button from "@/components/ui/button/Button";
import TextInput from "@/components/ui/input/TextInput";
import { useToast } from "@/components/ui/toast/ToastContext";
import { useClubData } from "@/components/club-core/ClubDataContext";
import { calcMembershipBenefit } from "@/lib/membership-benefit";
import {
  createBookingsAction,
  getMemberByIdAction,
  type BookingMember,
} from "@/app/(admin)/bookings/actions";
import ToneBadge from "@/components/club-core/ToneBadge";
import { formatIDR } from "@/components/club-core/format";
import {
  courtById as seedCourtById,
  STORAGE_SLOT_MINUTES,
  slotLabel,
  courtRateAtSlot,
  type Court,
} from "@/data/padel/club/courts";
import { paymentMethods, type PaymentMethod } from "@/data/padel/engage/products";

const pad = (n: number) => String(n).padStart(2, "0");

/** Sessions are fixed at 60 minutes. */
const SESSION_MINUTES = 60;
const SLOTS_PER_SESSION = SESSION_MINUTES / STORAGE_SLOT_MINUTES; // 2

interface BookingPaymentProps {
  courtId: string;
  dateKey: string;
  /** storage-slot indices (0–47), one per chosen 60-min session */
  startSlots: number[];
  memberId: string;
}

/** Price (IDR) for a single 60-min session starting at `startSlot`. */
const sessionPrice = (court: Court, day: number, startSlot: number): number => {
  let total = 0;
  for (let i = 0; i < SLOTS_PER_SESSION; i++) {
    const rate = courtRateAtSlot(court, day, startSlot + i);
    total += (rate === "peak" ? court.pricePeak : court.priceOffPeak) / 2;
  }
  return Math.round(total);
};

export default function BookingPayment({
  courtId,
  dateKey: bookingDate,
  startSlots,
  memberId,
}: BookingPaymentProps) {
  const router = useRouter();
  const toast = useToast();
  const { courts, isReady } = useClubData();

  const court = useMemo(
    () => courts.find((c) => c.id === courtId) ?? seedCourtById(courtId),
    [courts, courtId],
  );

  // resolve member live from the tenant DB
  const [member, setMember] = useState<BookingMember | null>(null);
  const [memberLoaded, setMemberLoaded] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const m = await getMemberByIdAction(memberId);
        setMember(m);
      } catch {
        setMember(null);
      } finally {
        setMemberLoaded(true);
      }
    })();
  }, [memberId]);

  const [method, setMethod] = useState<PaymentMethod>("QRIS");
  const [cash, setCash] = useState("");
  const [confirmedRef, setConfirmedRef] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const day = useMemo(
    () => new Date(`${bookingDate}T00:00:00`).getDay(),
    [bookingDate],
  );

  // sorted sessions with labels + per-session price
  const sessions = useMemo(() => {
    if (!court) return [];
    return [...startSlots]
      .sort((a, b) => a - b)
      .map((startSlot) => {
        const endSlot = startSlot + SLOTS_PER_SESSION;
        return {
          startSlot,
          endSlot,
          startLabel: slotLabel(startSlot),
          endLabel: slotLabel(endSlot),
          price: sessionPrice(court, day, startSlot),
        };
      });
  }, [court, startSlots, day]);

  const totalPrice = useMemo(
    () => sessions.reduce((sum, s) => sum + s.price, 0),
    [sessions],
  );

  // ── apply membership benefit (quota + post-quota discount) ──
  // Plan + remaining quota come live from the member record (DB).
  const plan = member?.plan ?? null;
  const benefit = useMemo(
    () =>
      calcMembershipBenefit({
        plan: plan
          ? {
              includedCourtBookings: plan.includedCourtBookings,
              courtDiscountPct: plan.courtDiscountPct,
            }
          : null,
        quotaRemaining: member?.quotaRemaining ?? 0,
        sessions: sessions.map((s) => ({
          basePrice: s.price,
          label: `${s.startLabel}–${s.endLabel}`,
        })),
      }),
    [plan, member?.quotaRemaining, sessions],
  );
  const payableTotal = benefit.payable;

  const cashNum = parseInt(cash.replace(/\D/g, ""), 10) || 0;
  const change = method === "Cash" ? cashNum - payableTotal : 0;
  const cashShort = method === "Cash" && cashNum < payableTotal;

  const pay = async () => {
    if (!court || !member || sessions.length === 0 || saving) return;
    if (cashShort) {
      toast.warning("Uang tunai kurang dari total.");
      return;
    }
    setSaving(true);

    const payload = sessions.map((s, idx) => {
      const startH = Math.floor(s.startSlot / 2);
      const startM = (s.startSlot % 2) * 30;
      const endH = Math.floor(s.endSlot / 2);
      const endM = (s.endSlot % 2) * 30;
      const line = benefit.sessions[idx];
      const note = line?.coveredByQuota
        ? `Gratis kuota membership · bayar ${method}`
        : line && line.discountPct > 0
          ? `Diskon ${line.discountPct}% · bayar ${method}`
          : `Dibayar via ${method}`;
      return {
        courtId: court.id,
        memberId: member.id,
        type: (member.tier === "daily" ? "walk_in" : "member") as
          | "walk_in"
          | "member",
        status: "confirmed" as const,
        customer: member.name,
        start: `${bookingDate}T${pad(startH)}:${pad(startM)}:00`,
        end: `${bookingDate}T${pad(endH)}:${pad(endM)}:00`,
        partySize: court.format === "single" ? 2 : 4,
        // charge the benefit-adjusted amount (quota → 0, else rate − discount)
        price: line?.payable ?? s.price,
        note,
      };
    });

    const res = await createBookingsAction(payload, {
      memberId: member.id,
      quotaConsumed: benefit.quotaCoveredCount,
    });
    if (!res.success || !res.ids?.length) {
      toast.error(res.error || "Gagal menyimpan booking.", "Pembayaran gagal");
      setSaving(false);
      return;
    }

    setConfirmedRef(res.ids[0]);
    toast.success(
      `Pembayaran ${formatIDR(payableTotal)} diterima.`,
      `${sessions.length} booking dikonfirmasi`,
    );
  };

  if (!isReady || !memberLoaded) {
    return (
      <Card padding="lg">
        <div className="space-y-4">
          <div className="h-10 w-full animate-pulse rounded-lg bg-[var(--surface-muted)]" />
          <div className="h-40 w-full animate-pulse rounded-xl bg-[var(--surface-muted)]" />
        </div>
      </Card>
    );
  }

  if (!court || !member || sessions.length === 0) {
    return (
      <Card padding="lg">
        <div className="py-10 text-center">
          <p className="text-sm text-[var(--text-caption)]">
            Data booking tidak lengkap atau sudah kedaluwarsa.
          </p>
          <div className="mt-4">
            <Button variant="outline" onClick={() => router.push("/bookings/search")}>
              Kembali ke pencarian
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // ── success / receipt ──
  if (confirmedRef) {
    return (
      <Card padding="lg">
        <div className="mx-auto max-w-md py-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10">
            <Check className="h-7 w-7" strokeWidth={2.5} />
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-heading)]">
            {sessions.length > 1
              ? `${sessions.length} booking dikonfirmasi`
              : "Booking dikonfirmasi"}
          </h3>
          <p className="mt-1 text-sm text-[var(--text-caption)]">
            {court.name} · {bookingDate} · {sessions.length} jam — ref{" "}
            <span className="font-mono font-semibold">{confirmedRef}</span>
          </p>
          <div className="mx-auto mt-5 max-w-xs rounded-xl border border-[var(--border-default)] bg-[var(--surface-muted)] p-4 text-left text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--text-caption)]">Member</span>
              <span className="font-medium text-[var(--text-heading)]">{member.name}</span>
            </div>
            <div className="mt-1.5 flex justify-between">
              <span className="text-[var(--text-caption)]">Jam</span>
              <span className="text-right font-medium text-[var(--text-heading)]">
                {sessions.map((s) => `${s.startLabel}–${s.endLabel}`).join(", ")}
              </span>
            </div>
            <div className="mt-1.5 flex justify-between">
              <span className="text-[var(--text-caption)]">Metode</span>
              <span className="font-medium text-[var(--text-heading)]">{method}</span>
            </div>
            {benefit.totalSavings > 0 && (
              <div className="mt-1.5 flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>Hemat membership</span>
                <span className="font-medium">−{formatIDR(benefit.totalSavings)}</span>
              </div>
            )}
            <div className="mt-1.5 flex justify-between">
              <span className="text-[var(--text-caption)]">Total</span>
              <span className="font-semibold text-[var(--text-heading)]">{formatIDR(payableTotal)}</span>
            </div>
            {method === "Cash" && (
              <div className="mt-1.5 flex justify-between">
                <span className="text-[var(--text-caption)]">Kembalian</span>
                <span className="font-medium text-[var(--text-heading)]">
                  {formatIDR(Math.max(change, 0))}
                </span>
              </div>
            )}
          </div>
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="outline" onClick={() => router.push("/bookings/search")}>
              Booking lagi
            </Button>
            <Button variant="primary" sheen onClick={() => router.push("/bookings")}>
              Ke daftar booking
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* ── Payment ── */}
      <div className="lg:col-span-2">
        <Card padding="lg">
          <h3 className="mb-1 text-lg font-semibold text-[var(--text-heading)]">
            Pembayaran
          </h3>
          <p className="mb-5 text-sm text-[var(--text-caption)]">
            Pilih metode pembayaran untuk menyelesaikan booking.
          </p>

          <p className="mb-2 text-sm font-medium text-[var(--text-body)]">Metode pembayaran</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {paymentMethods.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                className={`rounded-xl border-2 px-3 py-2.5 text-sm font-semibold transition-all ${
                  method === m
                    ? "border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)]"
                    : "border-[var(--border-default)] text-[var(--text-caption)] hover:border-[var(--color-primary)]/50"
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {method === "Cash" && (
            <div className="mt-5 max-w-xs">
              <TextInput
                label="Uang diterima"
                type="number"
                value={cash}
                onChange={setCash}
                placeholder="0"
                error={cashShort}
                errorText="Kurang dari total"
              />
              {!cashShort && cashNum > 0 && (
                <p className="mt-1.5 text-xs text-[var(--text-caption)]">
                  Kembalian: {formatIDR(Math.max(change, 0))}
                </p>
              )}
            </div>
          )}

          <div className="mt-7 flex items-center justify-between border-t border-[var(--border-default)] pt-5">
            <Button variant="outline" onClick={() => router.push("/bookings/search")}>
              Kembali
            </Button>
            <Button variant="primary" sheen glow onClick={pay} disabled={saving}>
              {saving ? "Menyimpan…" : `Bayar · ${formatIDR(payableTotal)}`}
            </Button>
          </div>
        </Card>
      </div>

      {/* ── Summary ── */}
      <div className="lg:col-span-1">
        <div className="lg:sticky lg:top-24">
          <Card variant="accent-top" accentColor={court.color} padding="md">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-[var(--text-heading)]">
                Ringkasan booking
              </span>
              <ToneBadge tone={plan ? "primary" : "neutral"}>
                {plan ? plan.name : "Non-member"}
              </ToneBadge>
            </div>
            <dl className="space-y-2.5 text-sm">
              <Row label="Lapangan" value={court.name} />
              <Row label="Tanggal" value={bookingDate} />
              <Row label="Member" value={member.name} />
            </dl>

            {/* per-session breakdown (with benefit) */}
            <div className="mt-3 space-y-1.5 border-t border-[var(--border-default)] pt-3">
              {sessions.map((s, idx) => {
                const line = benefit.sessions[idx];
                return (
                  <div
                    key={s.startSlot}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-[var(--text-caption)]">
                      {s.startLabel}–{s.endLabel}
                    </span>
                    {line?.coveredByQuota ? (
                      <span className="flex items-center gap-1.5">
                        <span className="text-xs text-[var(--text-muted)] line-through">
                          {formatIDR(s.price)}
                        </span>
                        <ToneBadge tone="success">Gratis</ToneBadge>
                      </span>
                    ) : line && line.discountPct > 0 ? (
                      <span className="flex items-center gap-1.5">
                        <span className="text-xs text-[var(--text-muted)] line-through">
                          {formatIDR(s.price)}
                        </span>
                        <span className="font-medium text-[var(--text-heading)]">
                          {formatIDR(line.payable)}
                        </span>
                      </span>
                    ) : (
                      <span className="font-medium text-[var(--text-heading)]">
                        {formatIDR(s.price)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* savings + total */}
            <div className="mt-3 space-y-1.5 border-t border-[var(--border-default)] pt-3 text-sm">
              <div className="flex items-center justify-between text-[var(--text-caption)]">
                <span>Subtotal</span>
                <span>{formatIDR(totalPrice)}</span>
              </div>
              {benefit.totalSavings > 0 && (
                <div className="flex items-center justify-between font-medium text-emerald-600 dark:text-emerald-400">
                  <span>
                    Hemat membership
                    {benefit.quotaCoveredCount > 0
                      ? ` (${benefit.quotaCoveredCount}x kuota)`
                      : ""}
                  </span>
                  <span>−{formatIDR(benefit.totalSavings)}</span>
                </div>
              )}
            </div>

            <div className="mt-3 border-t border-[var(--border-default)] pt-4">
              <p className="text-sm text-[var(--text-caption)]">
                Total bayar · {sessions.length} jam
              </p>
              <p className="mt-1 text-3xl font-bold text-brand-600 dark:text-brand-400">
                {formatIDR(payableTotal)}
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

const Row: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex items-center justify-between gap-3">
    <dt className="text-[var(--text-caption)]">{label}</dt>
    <dd className="text-right font-medium text-[var(--text-heading)]">{value}</dd>
  </div>
);
