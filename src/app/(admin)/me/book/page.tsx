"use client";

import React, { useMemo, useState } from "react";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import { ModalDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast/ToastContext";
import {
  memberCourts,
  bookableHours,
  buildSlotGrid,
  isPeakHour,
  courtById,
  idr,
  prettyDateLong,
  type SlotStatus,
} from "@/data/padel/member";
import { tierById } from "@/data/padel/member";
import { useRole } from "@/context/RoleContext";
import DatePicker from "@/components/ui/datepicker/DatePicker";
import { CheckIcon, ClockIcon } from "@/components/member/icons";
import PromoReferralInput from "@/components/shared/PromoReferralInput";
import type { MemberTier as ClubMemberTier } from "@/data/padel/club/members";

const pad2 = (n: number) => String(n).padStart(2, "0");
const toKey = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

function nextDays(count: number) {
  const out: string[] = [];
  const base = new Date("2026-06-02T00:00:00");
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

const slotTone: Record<SlotStatus, string> = {
  open: "border-[var(--border-default)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)] cursor-pointer text-[var(--text-body)]",
  booked: "border-transparent bg-[var(--surface-muted)] text-[var(--text-muted)] line-through cursor-not-allowed",
  mine: "border-[var(--color-secondary)] bg-[var(--color-secondary-light)] text-[var(--color-secondary)]",
  closed: "border-transparent bg-[var(--surface-muted)]/50 text-[var(--text-muted)] cursor-not-allowed",
};

export default function BookCourtPage() {
  const toast = useToast();
  const { currentUser } = useRole();
  const days = useMemo(() => nextDays(10), []);
  const [date, setDate] = useState(days[0]);
  const [courtId, setCourtId] = useState(memberCourts[0].id);
  const [duration, setDuration] = useState(1.5);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [bookedRef, setBookedRef] = useState<string | null>(null);
  const [promoDiscount, setPromoDiscount] = useState(0);

  const grid = useMemo(() => buildSlotGrid(date), [date]);
  const court = courtById(courtId);
  const slots = grid[courtId] ?? [];
  const isCustomDate = !days.includes(date);

  const tier = tierById((currentUser.membershipTier as "Pro") ?? "Casual");
  const basePrice = (time: string) => {
    const hourly = isPeakHour(time) ? court.pricePeak : court.priceOffPeak;
    return hourly * duration;
  };
  const discounted = (gross: number) => Math.round(gross * (1 - tier.courtDiscountPct / 100));

  const gross = selectedTime ? basePrice(selectedTime) : 0;
  const net = discounted(gross);
  // Promo applies to the tier-discounted subtotal; clamp so total never < 0.
  const appliedPromo = selectedTime ? Math.min(promoDiscount, net) : 0;
  const payable = Math.max(net - appliedPromo, 0);
  // Map the member-side tier label to the club-engine tier the promo audience uses.
  const promoTier: ClubMemberTier = (
    (currentUser.membershipTier as string) ?? "casual"
  ).toLowerCase() as ClubMemberTier;

  const handleConfirm = () => {
    const ref = "SC-" + Math.random().toString(36).slice(2, 6).toUpperCase();
    setBookedRef(ref);
    setConfirmOpen(false);
    toast.success(`Court booked! Reference ${ref}`, "Booking confirmed");
    setSelectedTime(null);
    setPromoDiscount(0);
  };

  const endTime = (start: string) => {
    const [h, m] = start.split(":").map(Number);
    const total = h * 60 + m + duration * 60;
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  };

  return (
    <div>
      <PageBreadCrumb pageTitle="Book a Court" />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          {/* date picker strip */}
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h4 className="font-semibold text-[var(--text-heading)]">Select date</h4>
              {/* Other date — pick any day beyond the quick strip */}
              <div className="w-full sm:w-56">
                <DatePicker
                  mode="single"
                  placeholder="Other date…"
                  minDate={new Date(days[0] + "T00:00:00")}
                  value={isCustomDate ? new Date(date + "T00:00:00") : null}
                  onChange={(v) => {
                    if (v instanceof Date) {
                      setDate(toKey(v));
                      setSelectedTime(null);
                    }
                  }}
                />
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
              {days.map((d) => {
                const dt = new Date(d + "T00:00:00");
                const active = d === date;
                return (
                  <button
                    key={d}
                    onClick={() => {
                      setDate(d);
                      setSelectedTime(null);
                    }}
                    className={`flex min-w-[64px] flex-col items-center rounded-xl border px-3 py-2 transition-all ${
                      active
                        ? "border-transparent bg-[var(--color-primary)] text-white shadow-theme-sm"
                        : "border-[var(--border-default)] text-[var(--text-body)] hover:border-[var(--color-primary)]"
                    }`}
                  >
                    <span className="text-[11px] uppercase">
                      {dt.toLocaleDateString("en-US", { weekday: "short" })}
                    </span>
                    <span className="text-lg font-bold leading-tight">{dt.getDate()}</span>
                    <span className="text-[10px]">
                      {dt.toLocaleDateString("en-US", { month: "short" })}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* court picker */}
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-5">
            <h4 className="mb-3 font-semibold text-[var(--text-heading)]">Choose court</h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {memberCourts.map((c) => {
                const active = c.id === courtId;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setCourtId(c.id);
                      setSelectedTime(null);
                    }}
                    className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                      active
                        ? "border-[var(--color-primary)] bg-[var(--color-primary-light)]"
                        : "border-[var(--border-default)] hover:border-[var(--color-primary)]"
                    }`}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-muted)] text-lg">
                      🎾
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[var(--text-heading)]">{c.name}</p>
                      <p className="truncate text-xs text-[var(--text-muted)]">
                        {c.zone} · {c.surface} · {c.tag}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* duration + slots */}
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h4 className="font-semibold text-[var(--text-heading)]">Pick a time</h4>
              <div className="flex items-center gap-1.5">
                {[1, 1.5, 2].map((d) => (
                  <Button
                    key={d}
                    variant="chip"
                    size="sm"
                    active={duration === d}
                    onClick={() => setDuration(d)}
                  >
                    {d}h
                  </Button>
                ))}
              </div>
            </div>
            <div className="mb-4 flex flex-wrap gap-3 text-xs text-[var(--text-muted)]">
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded border border-[var(--border-default)]" /> Available
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-[var(--surface-muted)]" /> Booked
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-amber-400" /> Peak rate
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
              {bookableHours.map((time, i) => {
                const status = slots[i] ?? "open";
                const disabled = status === "booked" || status === "closed";
                const active = selectedTime === time;
                return (
                  <button
                    key={time}
                    disabled={disabled}
                    onClick={() => setSelectedTime(time)}
                    className={`relative rounded-lg border py-2.5 text-sm font-medium transition-all ${
                      active
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-theme-sm"
                        : slotTone[status]
                    }`}
                  >
                    {time}
                    {isPeakHour(time) && !disabled && (
                      <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-amber-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* summary rail */}
        <div className="xl:col-span-1">
          <div className="sticky top-24 space-y-4 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-5">
            <h4 className="font-semibold text-[var(--text-heading)]">Booking summary</h4>
            <div className="space-y-2.5 text-sm">
              <Row label="Court" value={court.name} />
              <Row label="Date" value={prettyDateLong(date)} />
              <Row
                label="Time"
                value={selectedTime ? `${selectedTime} – ${endTime(selectedTime)}` : "—"}
              />
              <Row label="Duration" value={`${duration} hour${duration > 1 ? "s" : ""}`} />
              <Row
                label="Rate"
                value={
                  selectedTime ? (
                    <Badge variant="light" color={isPeakHour(selectedTime) ? "warning" : "success"} size="sm">
                      {isPeakHour(selectedTime) ? "Peak" : "Off-peak"}
                    </Badge>
                  ) : (
                    "—"
                  )
                }
              />
            </div>
            {selectedTime && (
              <div className="border-t border-[var(--border-light)] pt-4">
                <PromoReferralInput
                  scope="booking"
                  amount={net}
                  tier={promoTier}
                  onChange={(s) => setPromoDiscount(s.discount)}
                />
              </div>
            )}
            <div className="border-t border-[var(--border-light)] pt-3">
              {tier.courtDiscountPct > 0 && selectedTime && (
                <div className="flex items-center justify-between text-sm text-[var(--text-caption)]">
                  <span>Subtotal</span>
                  <span className="line-through">{idr(gross)}</span>
                </div>
              )}
              {tier.courtDiscountPct > 0 && selectedTime && (
                <div className="flex items-center justify-between text-sm text-emerald-500">
                  <span>{tier.name} discount ({tier.courtDiscountPct}%)</span>
                  <span>−{idr(gross - net)}</span>
                </div>
              )}
              {appliedPromo > 0 && (
                <div className="flex items-center justify-between text-sm text-emerald-500">
                  <span>Promo</span>
                  <span>−{idr(appliedPromo)}</span>
                </div>
              )}
              <div className="mt-1 flex items-center justify-between">
                <span className="font-medium text-[var(--text-heading)]">Total</span>
                <span className="text-xl font-bold text-[var(--color-primary)]">
                  {selectedTime ? idr(payable) : "—"}
                </span>
              </div>
            </div>
            <Button
              fullWidth
              disabled={!selectedTime}
              glow
              onClick={() => setConfirmOpen(true)}
              startIcon={<ClockIcon className="h-4 w-4" />}
            >
              Review &amp; confirm
            </Button>
            {bookedRef && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                <CheckIcon className="h-4 w-4" />
                Last booking confirmed · {bookedRef}
              </div>
            )}
          </div>
        </div>
      </div>

      <ModalDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirm your booking"
        description="Payment will be drawn from your wallet."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Back
            </Button>
            <Button onClick={handleConfirm} glow>
              Pay {idr(payable)} &amp; confirm
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-sm">
          <Row label="Court" value={court.name} />
          <Row label="When" value={`${prettyDateLong(date)} · ${selectedTime ?? ""}`} />
          <Row label="Players" value="Up to 4 (invite later)" />
          <Row label="Pay with" value="Wallet" />
          {appliedPromo > 0 && (
            <Row label="Promo" value={`−${idr(appliedPromo)}`} />
          )}
          <div className="flex items-center justify-between border-t border-[var(--border-light)] pt-3">
            <span className="font-medium text-[var(--text-heading)]">Total</span>
            <span className="text-lg font-bold text-[var(--color-primary)]">{idr(payable)}</span>
          </div>
        </div>
      </ModalDialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[var(--text-caption)]">{label}</span>
      <span className="text-right font-medium text-[var(--text-heading)]">{value}</span>
    </div>
  );
}
