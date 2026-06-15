"use client";

// PadelHub — booking payment step. Reached after picking a slot + member in the
// New Booking search flow. Reads the pending booking from URL params, shows a
// payment summary + method picker, and on confirm creates the booking via
// useClubData.addBooking and shows a receipt.

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import Card from "@/components/ui/card/Card";
import Button from "@/components/ui/button/Button";
import TextInput from "@/components/ui/input/TextInput";
import { useToast } from "@/components/ui/toast/ToastContext";
import { useClubData } from "@/components/club-core/ClubDataContext";
import ToneBadge from "@/components/club-core/ToneBadge";
import { formatIDR } from "@/components/club-core/format";
import {
  courtById as seedCourtById,
  STORAGE_SLOT_MINUTES,
  slotLabel,
} from "@/data/padel/club/courts";
import {
  mockMembers,
  memberTierMeta,
  type Member,
} from "@/data/padel/club/members";
import { paymentMethods, type PaymentMethod } from "@/data/padel/engage/products";

const pad = (n: number) => String(n).padStart(2, "0");
const LS_MEMBERS = "padelhub-club-members";

interface BookingPaymentProps {
  courtId: string;
  dateKey: string;
  startSlot: number;
  durationMinutes: number;
  price: number;
  memberId: string;
}

export default function BookingPayment({
  courtId,
  dateKey: bookingDate,
  startSlot,
  durationMinutes,
  price,
  memberId,
}: BookingPaymentProps) {
  const router = useRouter();
  const toast = useToast();
  const { courts, addBooking, isReady } = useClubData();

  const court = useMemo(
    () => courts.find((c) => c.id === courtId) ?? seedCourtById(courtId),
    [courts, courtId],
  );

  // resolve member from seed or locally-created list
  const member = useMemo<Member | undefined>(() => {
    const seed = mockMembers.find((m) => m.id === memberId);
    if (seed) return seed;
    try {
      const raw = window.localStorage.getItem(LS_MEMBERS);
      if (raw) {
        const list = JSON.parse(raw) as Member[];
        return list.find((m) => m.id === memberId);
      }
    } catch {
      /* ignore */
    }
    return undefined;
  }, [memberId]);

  const [method, setMethod] = useState<PaymentMethod>("QRIS");
  const [cash, setCash] = useState("");
  const [confirmedRef, setConfirmedRef] = useState<string | null>(null);

  const endSlot = startSlot + Math.ceil(durationMinutes / STORAGE_SLOT_MINUTES);
  const startLabel = slotLabel(startSlot);
  const endLabel = slotLabel(endSlot);

  const cashNum = parseInt(cash.replace(/\D/g, ""), 10) || 0;
  const change = method === "Cash" ? cashNum - price : 0;
  const cashShort = method === "Cash" && cashNum < price;

  const pay = () => {
    if (!court || !member) return;
    if (cashShort) {
      toast.warning("Uang tunai kurang dari total.");
      return;
    }
    const startH = Math.floor(startSlot / 2);
    const startM = (startSlot % 2) * 30;
    const endH = Math.floor(endSlot / 2);
    const endM = (endSlot % 2) * 30;
    const startIso = `${bookingDate}T${pad(startH)}:${pad(startM)}:00`;
    const endIso = `${bookingDate}T${pad(endH)}:${pad(endM)}:00`;

    const created = addBooking({
      courtId: court.id,
      start: startIso,
      end: endIso,
      type: member.tier === "daily" ? "walk_in" : "member",
      status: "confirmed",
      customer: member.name,
      memberId: member.id,
      partySize: court.format === "single" ? 2 : 4,
      price,
      note: `Dibayar via ${method}`,
      createdBy: "Front desk",
    });
    setConfirmedRef(created.id);
    toast.success(`Pembayaran ${formatIDR(price)} diterima.`, "Booking dikonfirmasi");
  };

  if (!isReady) {
    return (
      <Card padding="lg">
        <div className="space-y-4">
          <div className="h-10 w-full animate-pulse rounded-lg bg-[var(--surface-muted)]" />
          <div className="h-40 w-full animate-pulse rounded-xl bg-[var(--surface-muted)]" />
        </div>
      </Card>
    );
  }

  if (!court || !member) {
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
            Booking dikonfirmasi
          </h3>
          <p className="mt-1 text-sm text-[var(--text-caption)]">
            {court.name} · {bookingDate} · {startLabel}–{endLabel} — ref{" "}
            <span className="font-mono font-semibold">{confirmedRef}</span>
          </p>
          <div className="mx-auto mt-5 max-w-xs rounded-xl border border-[var(--border-default)] bg-[var(--surface-muted)] p-4 text-left text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--text-caption)]">Member</span>
              <span className="font-medium text-[var(--text-heading)]">{member.name}</span>
            </div>
            <div className="mt-1.5 flex justify-between">
              <span className="text-[var(--text-caption)]">Metode</span>
              <span className="font-medium text-[var(--text-heading)]">{method}</span>
            </div>
            <div className="mt-1.5 flex justify-between">
              <span className="text-[var(--text-caption)]">Total</span>
              <span className="font-semibold text-[var(--text-heading)]">{formatIDR(price)}</span>
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
            <Button variant="primary" sheen glow onClick={pay}>
              {`Bayar · ${formatIDR(price)}`}
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
              <ToneBadge tone={member.tier === "daily" ? "warning" : "primary"}>
                {memberTierMeta[member.tier].label}
              </ToneBadge>
            </div>
            <dl className="space-y-2.5 text-sm">
              <Row label="Lapangan" value={court.name} />
              <Row label="Tanggal" value={bookingDate} />
              <Row label="Jam" value={`${startLabel}–${endLabel}`} />
              <Row label="Durasi" value={`${durationMinutes} menit`} />
              <Row label="Member" value={member.name} />
            </dl>

            <div className="mt-4 border-t border-[var(--border-default)] pt-4">
              <p className="text-sm text-[var(--text-caption)]">Total bayar</p>
              <p className="mt-1 text-3xl font-bold text-brand-600 dark:text-brand-400">
                {formatIDR(price)}
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
