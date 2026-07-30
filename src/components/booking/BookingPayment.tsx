"use client";

// PadelHub — booking payment step (multi-item cart). Reached after picking a
// court + time + member. The cart is seeded from the URL (court/date/slots) but
// the user can ADD more bookings (another court / date / time) right here before
// paying. Membership benefit (quota + discount) is applied across the whole cart.

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, Trash2, Clock, Search, ArrowLeft } from "lucide-react";
import Card from "@/components/ui/card/Card";
import Button from "@/components/ui/button/Button";
import TextInput from "@/components/ui/input/TextInput";
import DatePicker from "@/components/ui/datepicker/DatePicker";
import TimePicker from "@/components/ui/datepicker/TimePicker";
import { ModalDialog } from "@/components/ui/modal";
import EmptyState from "@/components/ui/feedback/EmptyState";
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
  courtAvailableSlots,
  hourToSlot,
  occupiedSlotsFor,
  type BlockingWindow,
  type Court,
} from "@/data/padel/club/courts";
import { dateKey as toDateKey } from "@/data/padel/club/bookings";
import type { PayMethod } from "@/lib/checkout-core";

const pad = (n: number) => String(n).padStart(2, "0");
const todayKey = "2026-06-02";

const SESSION_MINUTES = 60;
const SLOTS_PER_SESSION = SESSION_MINUTES / STORAGE_SLOT_MINUTES; // 2

interface BookingPaymentProps {
  courtId: string;
  dateKey: string;
  /** storage-slot indices (0–47), one per chosen 60-min session */
  startSlots: number[];
  memberId: string;
}

/** A booking line in the cart. */
interface CartItem {
  id: string;
  courtId: string;
  dateKey: string;
  startSlot: number;
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

let cartSeq = 0;
const nextCartId = () => `c-${Date.now().toString(36)}-${cartSeq++}`;

export default function BookingPayment({
  courtId,
  dateKey: initialDate,
  startSlots,
  memberId,
}: BookingPaymentProps) {
  const router = useRouter();
  const toast = useToast();
  const { courts, bookings, maintenance, isReady } = useClubData();

  const findCourt = (id: string): Court | undefined =>
    courts.find((c) => c.id === id) ?? seedCourtById(id);

  // ── cart (seeded from URL) ──
  const [cart, setCart] = useState<CartItem[]>(() =>
    [...startSlots]
      .sort((a, b) => a - b)
      .map((startSlot) => ({
        id: nextCartId(),
        courtId,
        dateKey: initialDate,
        startSlot,
      })),
  );

  // resolve member live from the tenant DB
  const [member, setMember] = useState<BookingMember | null>(null);
  const [memberLoaded, setMemberLoaded] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        setMember(await getMemberByIdAction(memberId));
      } catch {
        setMember(null);
      } finally {
        setMemberLoaded(true);
      }
    })();
  }, [memberId]);

  const paymentMethods: PayMethod[] = ["Cash", "QRIS", "Transfer"];
  const [method, setMethod] = useState<PayMethod>("QRIS");
  const [cash, setCash] = useState("");
  const [confirmedRef, setConfirmedRef] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // ── derive priced sessions from the cart ──
  const sessions = useMemo(() => {
    return cart
      .map((item) => {
        const court = findCourt(item.courtId);
        if (!court) return null;
        const day = new Date(`${item.dateKey}T00:00:00`).getDay();
        const endSlot = item.startSlot + SLOTS_PER_SESSION;
        return {
          ...item,
          court,
          endSlot,
          startLabel: slotLabel(item.startSlot),
          endLabel: slotLabel(endSlot),
          price: sessionPrice(court, day, item.startSlot),
        };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, courts]);

  const totalPrice = useMemo(
    () => sessions.reduce((sum, s) => sum + s.price, 0),
    [sessions],
  );

  // ── membership benefit across the whole cart ──
  const plan = member?.plan ?? null;
  // Outstanding membership join fee (collected once, in this checkout).
  const joinFeeDue = member?.joinFeeDue ?? 0;
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
        sessions: sessions.map((s) => ({ basePrice: s.price })),
        joinFee: joinFeeDue,
      }),
    [plan, member?.quotaRemaining, sessions, joinFeeDue],
  );
  const grandTotal = benefit.grandTotal;

  const cashNum = parseInt(cash.replace(/\D/g, ""), 10) || 0;
  const change = method === "Cash" ? cashNum - grandTotal : 0;
  const cashShort = method === "Cash" && cashNum < grandTotal;

  const removeItem = (id: string) =>
    setCart((prev) => prev.filter((c) => c.id !== id));

  // ── add-booking modal ──
  const [addOpen, setAddOpen] = useState(false);

  const pay = async () => {
    if (!member || sessions.length === 0 || saving) return;
    if (cashShort) {
      toast.warning("Uang tunai kurang dari total.");
      return;
    }
    setSaving(true);

    const details = sessions.map((s, idx) => {
      const startH = Math.floor(s.startSlot / 2);
      const startM = (s.startSlot % 2) * 30;
      const endH = Math.floor(s.endSlot / 2);
      const endM = (s.endSlot % 2) * 30;
      const line = benefit.sessions[idx];
      const rateNote = line?.coveredByQuota
        ? "free"
        : line && line.discountPct > 0
          ? `discount-${line.discountPct}`
          : "regular";
      return {
        courtId: s.courtId,
        start: `${s.dateKey}T${pad(startH)}:${pad(startM)}:00`,
        end: `${s.dateKey}T${pad(endH)}:${pad(endM)}:00`,
        partySize: s.court.format === "single" ? 2 : 4,
        basePrice: s.price,
        price: line?.payable ?? s.price,
        rateNote,
      };
    });

    const res = await createBookingsAction(
      {
        memberId: member.id,
        type: member.tier === "daily" ? "walk_in" : "member",
        status: "confirmed",
        customer: member.name,
        paymentMethod: method,
        details,
      },
      {
        memberId: member.id,
        quotaConsumed: benefit.quotaCoveredCount,
        joinFee: joinFeeDue,
        cashReceived: method === "Cash" ? cashNum : undefined,
      },
    );
    if (!res.success || !res.id) {
      toast.error(res.error || "Gagal menyimpan booking.", "Pembayaran gagal");
      setSaving(false);
      return;
    }

    setConfirmedRef(res.id);
    toast.success(
      `Pembayaran ${formatIDR(grandTotal)} diterima.`,
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

  if (!member) {
    return (
      <Card padding="lg">
        <div className="py-10 text-center">
          <p className="text-sm text-[var(--text-caption)]">
            Data member tidak ditemukan atau sudah kedaluwarsa.
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
    const courtNames = Array.from(new Set(sessions.map((s) => s.court.name)));
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
            {courtNames.join(", ")} — ref{" "}
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
            {benefit.totalSavings > 0 && (
              <div className="mt-1.5 flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>Hemat membership</span>
                <span className="font-medium">−{formatIDR(benefit.totalSavings)}</span>
              </div>
            )}
            {joinFeeDue > 0 && (
              <div className="mt-1.5 flex justify-between">
                <span className="text-[var(--text-caption)]">Join fee membership</span>
                <span className="font-medium text-[var(--text-heading)]">{formatIDR(joinFeeDue)}</span>
              </div>
            )}
            <div className="mt-1.5 flex justify-between">
              <span className="text-[var(--text-caption)]">Total</span>
              <span className="font-semibold text-[var(--text-heading)]">{formatIDR(grandTotal)}</span>
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
      {/* ── Left: cart + payment ── */}
      <div className="space-y-6 lg:col-span-2">
        {/* cart */}
        <Card padding="lg">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-[var(--text-heading)]">
              Daftar Booking
            </h3>
            <Button
              variant="outline"
              size="sm"
              startIcon={<Plus className="h-4 w-4" />}
              onClick={() => setAddOpen(true)}
            >
              Tambah booking
            </Button>
          </div>

          {sessions.length === 0 ? (
            <EmptyState
              title="Belum ada booking"
              description="Tambahkan minimal satu sesi untuk melanjutkan pembayaran."
            />
          ) : (
            <div className="space-y-2.5">
              {sessions.map((s, idx) => {
                const line = benefit.sessions[idx];
                return (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-3"
                  >
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                      style={{ background: s.court.color }}
                    >
                      {s.court.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--text-heading)]">
                        {s.court.name}
                      </p>
                      <p className="truncate text-xs text-[var(--text-caption)]">
                        {s.dateKey} · {s.startLabel}–{s.endLabel}
                      </p>
                    </div>
                    <div className="text-right">
                      {line?.coveredByQuota ? (
                        <ToneBadge tone="success">Gratis kuota</ToneBadge>
                      ) : line && line.discountPct > 0 ? (
                        <div className="flex flex-col items-end">
                          <span className="text-xs text-[var(--text-muted)] line-through">
                            {formatIDR(s.price)}
                          </span>
                          <span className="text-sm font-semibold text-[var(--text-heading)]">
                            {formatIDR(line.payable)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm font-semibold text-[var(--text-heading)]">
                          {formatIDR(s.price)}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(s.id)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10"
                      aria-label="Hapus booking"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* payment */}
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
            <Button
              variant="primary"
              sheen
              glow
              onClick={pay}
              disabled={saving || sessions.length === 0}
            >
              {saving ? "Menyimpan…" : `Bayar · ${formatIDR(grandTotal)}`}
            </Button>
          </div>
        </Card>
      </div>

      {/* ── Right: summary ── */}
      <div className="lg:col-span-1">
        <div className="lg:sticky lg:top-24">
          <Card variant="accent-top" accentColor={sessions[0]?.court.color ?? "#6D5BFF"} padding="md">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-[var(--text-heading)]">
                Ringkasan
              </span>
              <ToneBadge tone={plan ? "primary" : "neutral"}>
                {plan ? plan.name : "Non-member"}
              </ToneBadge>
            </div>
            <dl className="space-y-2.5 text-sm">
              <Row label="Member" value={member.name} />
              <Row
                label="Jumlah sesi"
                value={`${sessions.length} sesi (60 menit/sesi)`}
              />
              {plan && (
                <Row
                  label="Sisa kuota"
                  value={`${Math.max((member.quotaRemaining ?? 0) - benefit.quotaCoveredCount, 0)} / ${plan.includedCourtBookings}`}
                />
              )}
            </dl>

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
                      ? ` (${benefit.quotaCoveredCount} kuota sesi)`
                      : ""}
                  </span>
                  <span>−{formatIDR(benefit.totalSavings)}</span>
                </div>
              )}
              {joinFeeDue > 0 && (
                <div className="flex items-center justify-between text-[var(--text-caption)]">
                  <span>Join fee {plan ? plan.name : ""}</span>
                  <span className="font-medium text-[var(--text-heading)]">
                    +{formatIDR(joinFeeDue)}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-3 border-t border-[var(--border-default)] pt-4">
              <p className="text-sm text-[var(--text-caption)]">Total bayar</p>
              <p className="mt-1 text-3xl font-bold text-brand-600 dark:text-brand-400">
                {formatIDR(grandTotal)}
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Add-booking modal ── */}
      <AddBookingModal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        courts={courts}
        bookings={bookings}
        maintenance={maintenance}
        cart={cart}
        onAdd={(item) => {
          setCart((prev) => [...prev, { ...item, id: nextCartId() }]);
          setAddOpen(false);
        }}
      />
    </div>
  );
}

const Row: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex items-center justify-between gap-3">
    <dt className="text-[var(--text-caption)]">{label}</dt>
    <dd className="text-right font-medium text-[var(--text-heading)]">{value}</dd>
  </div>
);

/* ════════════════════════════════════════════════════════
 * Add-booking modal — time-first (matches the main New Booking flow):
 * pick date + earliest time → list available start times across courts →
 * pick a time → pick a court available at that time.
 * ════════════════════════════════════════════════════════ */
interface AddBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  courts: Court[];
  bookings: { courtId: string; status: string; start: string; end: string }[];
  maintenance: { courtId: string; start: string; end: string }[];
  cart: CartItem[];
  onAdd: (item: Omit<CartItem, "id">) => void;
}

interface TimeOpt {
  startSlot: number;
  startLabel: string;
  endLabel: string;
  courtCount: number;
}
interface CourtOpt {
  court: Court;
  price: number;
  hasPeak: boolean;
}

const AddBookingModal: React.FC<AddBookingModalProps> = ({
  isOpen,
  onClose,
  courts,
  bookings,
  maintenance,
  cart,
  onAdd,
}) => {
  const activeCourts = useMemo(
    () => courts.filter((c) => c.status === "active"),
    [courts],
  );
  const [date, setDate] = useState<Date>(new Date(`${todayKey}T00:00:00`));
  const [startTime, setStartTime] = useState("07:00");
  const [results, setResults] = useState<TimeOpt[] | null>(null);
  const [searchedKey, setSearchedKey] = useState("");
  const [pickedSlot, setPickedSlot] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDate(new Date(`${todayKey}T00:00:00`));
      setStartTime("07:00");
      setResults(null);
      setPickedSlot(null);
      setSearchedKey("");
    }
  }, [isOpen]);

  const timeToSlot = (t: string): number => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(t);
    if (!m) return 0;
    return hourToSlot(Number(m[1])) + (Number(m[2]) >= 30 ? 1 : 0);
  };

  const occupiedFor = (courtId: string, key: string): Set<number> => {
    const blockers: BlockingWindow[] = [
      ...bookings
        .filter((b) => b.status !== "cancelled")
        .map((b) => ({ courtId: b.courtId, start: b.start, end: b.end })),
      ...maintenance.map((m) => ({ courtId: m.courtId, start: m.start, end: m.end })),
    ];
    const occ = occupiedSlotsFor(courtId, key, blockers);
    cart
      .filter((c) => c.courtId === courtId && c.dateKey === key)
      .forEach((c) => {
        occ.add(c.startSlot);
        occ.add(c.startSlot + 1);
      });
    return occ;
  };

  const runSearch = () => {
    const key = toDateKey(date);
    const day = date.getDay();
    const fromSlot = timeToSlot(startTime);
    const countBySlot = new Map<number, number>();
    activeCourts.forEach((court) => {
      courtAvailableSlots(
        court,
        day,
        SESSION_MINUTES,
        occupiedFor(court.id, key),
        SESSION_MINUTES,
      )
        .filter((s) => s.startSlot >= fromSlot)
        .forEach((s) => {
          countBySlot.set(s.startSlot, (countBySlot.get(s.startSlot) ?? 0) + 1);
        });
    });
    const opts: TimeOpt[] = Array.from(countBySlot.entries())
      .sort(([a], [b]) => a - b)
      .map(([startSlot, courtCount]) => ({
        startSlot,
        startLabel: slotLabel(startSlot),
        endLabel: slotLabel(startSlot + SLOTS_PER_SESSION),
        courtCount,
      }));
    setSearchedKey(key);
    setPickedSlot(null);
    setResults(opts);
  };

  // courts available at the picked time
  const courtsAtPicked: CourtOpt[] = useMemo(() => {
    if (pickedSlot == null || !searchedKey) return [];
    const day = new Date(`${searchedKey}T00:00:00`).getDay();
    const out: CourtOpt[] = [];
    for (const court of activeCourts) {
      const slot = courtAvailableSlots(
        court,
        day,
        SESSION_MINUTES,
        occupiedFor(court.id, searchedKey),
        SESSION_MINUTES,
      ).find((s) => s.startSlot === pickedSlot);
      if (slot) out.push({ court, price: slot.price, hasPeak: slot.hasPeak });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickedSlot, searchedKey, activeCourts, bookings, maintenance, cart]);

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Tambah Booking"
      description="Pilih tanggal & jam, lalu pilih lapangan yang tersedia."
      size="lg"
      footer={
        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Tutup
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Step 1: date + time + search */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <DatePicker
            label="Tanggal main"
            mode="single"
            value={date}
            minDate={new Date(`${todayKey}T00:00:00`)}
            onChange={(v) => {
              if (v instanceof Date) {
                setDate(v);
                setResults(null);
                setPickedSlot(null);
              }
            }}
          />
          <TimePicker
            label="Mulai dari jam"
            value={startTime}
            minuteStep={60}
            placeholder="Pilih jam mulai"
            onChange={(v) => {
              setStartTime(v || "07:00");
              setResults(null);
              setPickedSlot(null);
            }}
          />
          <Button
            variant="primary"
            sheen
            startIcon={<Search className="h-4 w-4" />}
            onClick={runSearch}
            className="h-11"
          >
            Cari
          </Button>
        </div>

        {/* Step 2: available times */}
        {results !== null && pickedSlot == null && (
          <div>
            <p className="mb-2 text-xs text-[var(--text-caption)]">
              {searchedKey} · {results.length} pilihan jam
            </p>
            {results.length === 0 ? (
              <p className="rounded-lg bg-[var(--surface-muted)] px-3 py-6 text-center text-sm text-[var(--text-caption)]">
                Tidak ada jam tersedia. Coba tanggal atau jam lain.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {results.map((t) => (
                  <button
                    key={t.startSlot}
                    type="button"
                    onClick={() => setPickedSlot(t.startSlot)}
                    className="flex items-center gap-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-3 text-left transition-all hover:border-[var(--color-primary)] hover:ring-1 hover:ring-[var(--color-primary)]"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary-light)] text-[var(--color-primary)]">
                      <Clock className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--text-heading)]">
                        {t.startLabel}–{t.endLabel}
                      </p>
                      <p className="truncate text-xs text-[var(--text-caption)]">
                        {t.courtCount} lapangan
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: courts at the picked time */}
        {results !== null && pickedSlot != null && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs text-[var(--text-caption)]">
                {searchedKey} · {slotLabel(pickedSlot)}–{slotLabel(pickedSlot + SLOTS_PER_SESSION)} ·{" "}
                {courtsAtPicked.length} lapangan
              </p>
              <Button
                variant="ghost"
                size="sm"
                startIcon={<ArrowLeft className="h-4 w-4" />}
                onClick={() => setPickedSlot(null)}
              >
                Ganti jam
              </Button>
            </div>
            {courtsAtPicked.length === 0 ? (
              <p className="rounded-lg bg-[var(--surface-muted)] px-3 py-6 text-center text-sm text-[var(--text-caption)]">
                Tidak ada lapangan tersedia di jam ini.
              </p>
            ) : (
              <div className="space-y-2">
                {courtsAtPicked.map(({ court, price, hasPeak }) => (
                  <button
                    key={court.id}
                    type="button"
                    onClick={() =>
                      onAdd({ courtId: court.id, dateKey: searchedKey, startSlot: pickedSlot })
                    }
                    className="flex w-full items-center gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-3 text-left transition-all hover:border-[var(--color-primary)] hover:ring-1 hover:ring-[var(--color-primary)]"
                  >
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                      style={{ background: court.color }}
                    >
                      {court.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[var(--text-heading)]">
                        {court.name}
                      </p>
                      <p className="truncate text-xs text-[var(--text-caption)]">
                        {court.environment} · {court.wall} · {court.format}
                      </p>
                    </div>
                    <span className="ml-auto flex shrink-0 items-center gap-2">
                      {hasPeak && <ToneBadge tone="primary">peak</ToneBadge>}
                      <span className="text-sm font-bold text-[var(--text-heading)]">
                        {formatIDR(price, true)}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </ModalDialog>
  );
};
