"use client";

// PadelHub — owner/staff "New booking" wizard (Stepper PAGE).
// MANY inputs -> Stepper per project UI/UX rule (never modal).
// Consumes club-core ClubDataContext (courts + addBooking) + shared data
// contracts. Slot availability is computed live from existing bookings so a
// court/hour cannot be double-booked.

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/card/Card";
import Stepper, { type StepItem } from "@/components/ui/stepper/Stepper";
import Button from "@/components/ui/button/Button";
import UiSelect from "@/components/ui/select/Select";
import DatePicker from "@/components/ui/datepicker/DatePicker";
import { useToast } from "@/components/ui/toast/ToastContext";
import { useClubData } from "@/components/club-core/ClubDataContext";
import ToneBadge from "@/components/club-core/ToneBadge";
import { formatIDR } from "@/components/club-core/format";
import { isPeakHour } from "@/data/padel/club/courts";
import {
  type BookingType,
  type Booking,
  bookingTypeMeta,
  dateKey,
  gridHours,
} from "@/data/padel/club/bookings";
import { mockMembers, memberTierMeta } from "@/data/padel/club/members";
import PromoReferralInput from "@/components/shared/PromoReferralInput";

const pad = (n: number) => String(n).padStart(2, "0");
const todayKey = "2026-06-02";

const steps: StepItem[] = [
  { label: "Court & date", description: "Where & when" },
  { label: "Time & duration", description: "Pick a slot" },
  { label: "Customer", description: "Member or walk-in" },
  { label: "Review", description: "Confirm & price" },
];

const durations = [
  { value: 60, label: "60 minutes" },
  { value: 90, label: "90 minutes" },
  { value: 120, label: "120 minutes" },
];

type CustomerKind = "member" | "walk_in";

interface NewBookingStepperProps {
  initialCourtId?: string;
  initialDateKey?: string;
  initialHour?: number;
}

export default function NewBookingStepper({
  initialCourtId,
  initialDateKey,
  initialHour,
}: NewBookingStepperProps) {
  const router = useRouter();
  const toast = useToast();
  const { courts, bookings, addBooking, isReady } = useClubData();

  const activeCourts = useMemo(
    () => courts.filter((c) => c.status === "active"),
    [courts],
  );

  const [step, setStep] = useState(0);
  const [courtId, setCourtId] = useState(initialCourtId ?? "");
  const [date, setDate] = useState<Date>(
    new Date(`${initialDateKey ?? todayKey}T00:00:00`),
  );
  const [hour, setHour] = useState<number | null>(
    initialHour !== undefined ? initialHour : null,
  );
  const [duration, setDuration] = useState(90);
  const [kind, setKind] = useState<CustomerKind>("member");
  const [memberId, setMemberId] = useState("");
  const [walkInName, setWalkInName] = useState("");
  const [confirmedRef, setConfirmedRef] = useState<string | null>(null);
  const [promoDiscount, setPromoDiscount] = useState(0);

  // default court once data is ready
  React.useEffect(() => {
    if (!courtId && activeCourts[0]) setCourtId(activeCourts[0].id);
  }, [activeCourts, courtId]);

  const selectedKey = dateKey(date);
  const court = courts.find((c) => c.id === courtId);
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;

  // ── live slot availability for the chosen court + date ──
  const bookedHours = useMemo(() => {
    const set = new Set<number>();
    bookings
      .filter(
        (b) =>
          b.courtId === courtId &&
          b.status !== "cancelled" &&
          b.start.startsWith(selectedKey),
      )
      .forEach((b) => {
        const startH = Number(b.start.slice(11, 13));
        const endH = Number(b.end.slice(11, 13));
        const endM = Number(b.end.slice(14, 16));
        const lastH = endM > 0 ? endH : endH - 1;
        for (let h = startH; h <= lastH; h++) set.add(h);
      });
    return set;
  }, [bookings, courtId, selectedKey]);

  // hours covered by the chosen start + duration (to detect overlap)
  const occupiedByChoice = useMemo(() => {
    if (hour === null) return [] as number[];
    const span = Math.ceil(duration / 60);
    return Array.from({ length: span }, (_, i) => hour + i);
  }, [hour, duration]);

  const durationClashes = occupiedByChoice.some(
    (h) => bookedHours.has(h) || h > 22,
  );

  const price = useMemo(() => {
    if (!court || hour === null) return 0;
    const rate = isPeakHour(hour, isWeekend) ? court.pricePeak : court.priceOffPeak;
    return Math.round((rate * duration) / 60);
  }, [court, hour, duration, isWeekend]);

  const member = mockMembers.find((m) => m.id === memberId);
  // Promo audience tier: the selected member's tier, or "daily" for walk-ins.
  const promoTier = kind === "member" ? member?.tier ?? "daily" : "daily";
  const appliedPromo = Math.min(promoDiscount, price);
  const payable = Math.max(price - appliedPromo, 0);

  // ── per-step gating ──
  const step0Valid = !!court;
  const step1Valid = hour !== null && !durationClashes;
  const step2Valid =
    kind === "member" ? !!memberId : walkInName.trim().length >= 2;
  const canNext =
    step === 0 ? step0Valid : step === 1 ? step1Valid : step === 2 ? step2Valid : true;

  const isLast = step === steps.length - 1;

  const reset = () => {
    setStep(0);
    setHour(null);
    setWalkInName("");
    setMemberId("");
    setConfirmedRef(null);
    setPromoDiscount(0);
  };

  const finalize = () => {
    if (!court || hour === null) return;
    const startIso = `${selectedKey}T${pad(hour)}:00:00`;
    const endH = hour + Math.floor(duration / 60);
    const endM = duration % 60;
    const endIso = `${selectedKey}T${pad(endH)}:${pad(endM)}:00`;

    const type: BookingType = kind === "member" ? "member" : "walk_in";
    const created = addBooking({
      courtId: court.id,
      start: startIso,
      end: endIso,
      type,
      status: "confirmed",
      customer:
        kind === "member"
          ? (member?.name ?? "Member")
          : `Walk-in · ${walkInName.trim()}`,
      memberId: kind === "member" ? memberId : undefined,
      partySize: court.format === "single" ? 2 : 4,
      price: payable,
      createdBy: "Front desk",
    });
    setConfirmedRef(created.id);
    toast.success(`Court reserved for ${created.customer}.`, "Booking confirmed");
  };

  const goNext = () => {
    if (!canNext) return;
    if (isLast) finalize();
    else setStep((s) => s + 1);
  };

  // ── loading skeleton ──
  if (!isReady) {
    return (
      <Card padding="lg">
        <div className="space-y-4">
          <div className="h-10 w-full animate-pulse rounded-lg bg-gray-100 dark:bg-white/[0.04]" />
          <div className="h-40 w-full animate-pulse rounded-xl bg-gray-100 dark:bg-white/[0.04]" />
        </div>
      </Card>
    );
  }

  // ── success state ──
  if (confirmedRef) {
    return (
      <Card padding="lg">
        <div className="mx-auto max-w-md py-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/10">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-7 w-7">
              <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Booking confirmed
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {court?.name} · {selectedKey} · {pad(hour ?? 0)}:00 — ref{" "}
            <span className="font-mono font-semibold">{confirmedRef}</span>
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="outline" onClick={reset}>
              Book another
            </Button>
            <Button variant="primary" sheen onClick={() => router.push("/bookings")}>
              Back to bookings
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="lg">
      <Stepper steps={steps} currentStep={step} onStepClick={(i) => i < step && setStep(i)} />

      <div className="mt-8 max-w-3xl">
        {/* ── Step 0: court & date ── */}
        {step === 0 && (
          <div className="space-y-6">
            <div>
              <h4 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Choose court
              </h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {activeCourts.map((c) => {
                  const active = c.id === courtId;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setCourtId(c.id);
                        setHour(null);
                      }}
                      className={[
                        "flex items-center gap-3 rounded-xl border p-3 text-left transition-all",
                        active
                          ? "border-brand-500 bg-brand-50 dark:border-brand-500 dark:bg-brand-500/10"
                          : "border-gray-200 hover:border-brand-300 dark:border-gray-800 dark:hover:border-brand-700",
                      ].join(" ")}
                    >
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                        style={{ background: c.color }}
                      >
                        {c.name.slice(0, 2).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-gray-800 dark:text-white/90">
                          {c.name}
                        </p>
                        <p className="truncate text-xs text-gray-400 dark:text-gray-500">
                          {c.environment} · {formatIDR(c.priceOffPeak, true)}–
                          {formatIDR(c.pricePeak, true)}/h
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="max-w-xs">
              <DatePicker
                label="Booking date"
                mode="single"
                value={date}
                minDate={new Date(`${todayKey}T00:00:00`)}
                hint="Pilih tanggal bermain"
                onChange={(v) => {
                  if (v instanceof Date) {
                    setDate(v);
                    setHour(null);
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* ── Step 1: time & duration ── */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="max-w-xs">
              <UiSelect
                label="Duration"
                options={durations.map((d) => ({ value: String(d.value), label: d.label }))}
                value={String(duration)}
                searchable
                clearable={false}
                hint="Durasi sewa lapangan"
                onChange={(v) => {
                  setDuration(Number(v));
                  setHour(null);
                }}
              />
            </div>
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Pick a start time
                </h4>
                <div className="flex flex-wrap gap-3 text-xs text-gray-400 dark:text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded border border-gray-300 dark:border-gray-700" /> Open
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded bg-gray-100 dark:bg-white/10" /> Booked
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2 w-2 rounded-full bg-amber-400" /> Peak
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                {gridHours.map((h) => {
                  const span = Math.ceil(duration / 60);
                  const wouldOverflow = h + span > 23;
                  const clashes =
                    Array.from({ length: span }, (_, i) => h + i).some((x) =>
                      bookedHours.has(x),
                    ) || wouldOverflow;
                  const active = hour === h;
                  const peak = isPeakHour(h, isWeekend);
                  return (
                    <button
                      key={h}
                      type="button"
                      disabled={clashes}
                      onClick={() => setHour(h)}
                      className={[
                        "relative rounded-lg border py-2.5 text-sm font-medium transition-all",
                        active
                          ? "border-brand-500 bg-brand-500 text-white shadow-theme-sm"
                          : clashes
                            ? "cursor-not-allowed border-transparent bg-gray-100 text-gray-400 line-through dark:bg-white/10 dark:text-gray-600"
                            : "border-gray-200 text-gray-700 hover:border-brand-400 hover:bg-brand-50 dark:border-gray-800 dark:text-gray-300 dark:hover:border-brand-700 dark:hover:bg-brand-500/10",
                      ].join(" ")}
                    >
                      {pad(h)}:00
                      {peak && !clashes && !active && (
                        <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-amber-400" />
                      )}
                    </button>
                  );
                })}
              </div>
              {bookedHours.size === gridHours.length && (
                <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                  This court is fully booked on {selectedKey}. Pick another court or date.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Step 2: customer ── */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Customer type
              </span>
              <div className="flex flex-wrap gap-2">
                {(["member", "walk_in"] as CustomerKind[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKind(k)}
                    className={[
                      "rounded-full px-3.5 py-1.5 text-sm font-medium transition-all",
                      kind === k
                        ? "text-white shadow-theme-xs"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10",
                    ].join(" ")}
                    style={kind === k ? { background: bookingTypeMeta[k].color } : undefined}
                  >
                    {bookingTypeMeta[k].label}
                  </button>
                ))}
              </div>
            </div>

            {kind === "member" ? (
              <div className="max-w-md">
                <UiSelect
                  label="Select member"
                  searchable
                  placeholder="Search by name…"
                  options={mockMembers
                    .filter((m) => m.tier !== "daily")
                    .map((m) => ({
                      value: m.id,
                      label: m.name,
                      desc: `${memberTierMeta[m.tier].label} · ${formatIDR(m.walletBalance, true)} wallet`,
                    }))}
                  value={memberId}
                  onChange={(v) => setMemberId(v as string)}
                  hint="Cari berdasarkan nama member terdaftar"
                />
              </div>
            ) : (
              <div className="max-w-md">
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Walk-in name (daily)
                </label>
                <input
                  type="text"
                  value={walkInName}
                  onChange={(e) => setWalkInName(e.target.value)}
                  placeholder="e.g. Arif (group of 4)"
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                />
                <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                  Charged as a daily-tier guest. No membership required.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Step 3: review ── */}
        {step === 3 && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <Card variant="accent-top" accentColor={court?.color} padding="md">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-800 dark:text-white/90">
                    Booking summary
                  </span>
                  <ToneBadge tone={bookingTypeMeta[kind].tone}>
                    {bookingTypeMeta[kind].label}
                  </ToneBadge>
                </div>
                <dl className="space-y-2.5 text-sm">
                  <Row label="Court" value={court?.name ?? "—"} />
                  <Row label="Date" value={selectedKey} />
                  <Row
                    label="Time"
                    value={
                      hour !== null
                        ? `${pad(hour)}:00 – ${pad(hour + Math.floor(duration / 60))}:${pad(duration % 60)}`
                        : "—"
                    }
                  />
                  <Row label="Duration" value={`${duration} minutes`} />
                  <Row
                    label="Customer"
                    value={
                      kind === "member"
                        ? (member?.name ?? "—")
                        : walkInName.trim()
                          ? `Walk-in · ${walkInName.trim()}`
                          : "—"
                    }
                  />
                  <Row
                    label="Rate"
                    value={
                      hour !== null ? (
                        <ToneBadge tone={isPeakHour(hour, isWeekend) ? "warning" : "success"}>
                          {isPeakHour(hour, isWeekend) ? "Peak" : "Off-peak"}
                        </ToneBadge>
                      ) : (
                        "—"
                      )
                    }
                  />
                </dl>
              </Card>
            </div>
            <div className="lg:col-span-2 space-y-4">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                <PromoReferralInput
                  scope="booking"
                  amount={price}
                  tier={promoTier}
                  onChange={(s) => setPromoDiscount(s.discount)}
                />
              </div>
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                {appliedPromo > 0 && (
                  <div className="mb-3 space-y-1.5 border-b border-gray-200 pb-3 text-sm dark:border-gray-800">
                    <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                      <span>Subtotal</span>
                      <span>{formatIDR(price)}</span>
                    </div>
                    <div className="flex items-center justify-between font-medium text-emerald-600 dark:text-emerald-400">
                      <span>Promo</span>
                      <span>−{formatIDR(appliedPromo)}</span>
                    </div>
                  </div>
                )}
                <p className="text-sm text-gray-500 dark:text-gray-400">Total payable</p>
                <p className="mt-1 text-3xl font-bold text-brand-600 dark:text-brand-400">
                  {formatIDR(payable)}
                </p>
                <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                  {court?.name} · {duration} min ·{" "}
                  {hour !== null && isPeakHour(hour, isWeekend) ? "peak" : "off-peak"} rate
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── footer nav ── */}
      <div className="mt-8 flex items-center justify-between border-t border-gray-100 pt-5 dark:border-gray-800">
        <Button
          variant="outline"
          onClick={() => (step === 0 ? router.push("/bookings") : setStep((s) => s - 1))}
        >
          {step === 0 ? "Cancel" : "Back"}
        </Button>
        <div className="flex items-center gap-3">
          {!canNext && step === 1 && (
            <span className="text-xs text-amber-500">Pick an available slot to continue.</span>
          )}
          {!canNext && step === 2 && (
            <span className="text-xs text-amber-500">Select a member or enter a guest name.</span>
          )}
          <Button variant="primary" sheen onClick={goNext} disabled={!canNext}>
            {isLast ? `Confirm · ${formatIDR(payable)}` : "Continue"}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="text-right font-medium text-gray-800 dark:text-white/90">{value}</dd>
    </div>
  );
}
