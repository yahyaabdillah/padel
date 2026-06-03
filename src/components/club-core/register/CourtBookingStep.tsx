"use client";

// Step 3 — Court booking. Court × hour grid with live availability (existing
// club bookings + drafts already added this session, so no double-book). User
// can add MULTIPLE bookings; count vs the tier's included quota, anything
// beyond quota adds the court fee to the running total.

import React, { useMemo, useState } from "react";
import DatePicker from "@/components/ui/datepicker/DatePicker";
import UiSelect from "@/components/ui/select/Select";
import Button from "@/components/ui/button/Button";
import { formatIDR } from "@/components/club-core/format";
import { isPeakHour, type Court } from "@/data/padel/club/courts";
import { type Booking, dateKey, gridHours } from "@/data/padel/club/bookings";
import type { MemberTier } from "@/data/padel/club/members";
import {
  type DraftBooking,
  pad,
  tierQuota,
  TODAY_KEY,
} from "./types";

const durations = [
  { value: 60, label: "60 minutes" },
  { value: 90, label: "90 minutes" },
  { value: 120, label: "120 minutes" },
];

interface CourtBookingStepProps {
  tier: MemberTier;
  courts: Court[];
  bookings: Booking[];
  drafts: DraftBooking[];
  onAdd: (b: Omit<DraftBooking, "id">) => void;
  onRemove: (id: string) => void;
}

const CourtBookingStep: React.FC<CourtBookingStepProps> = ({
  tier,
  courts,
  bookings,
  drafts,
  onAdd,
  onRemove,
}) => {
  const activeCourts = useMemo(
    () => courts.filter((c) => c.status === "active"),
    [courts],
  );
  const lockedToday = tier === "daily";
  const quota = tierQuota[tier];

  const [courtId, setCourtId] = useState(activeCourts[0]?.id ?? "");
  const [date, setDate] = useState<Date>(new Date(`${TODAY_KEY}T00:00:00`));
  const [hour, setHour] = useState<number | null>(null);
  const [duration, setDuration] = useState(90);

  const selectedKey = dateKey(date);
  const court = courts.find((c) => c.id === courtId);
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;

  // Hours already taken on this court+date: existing club bookings + our drafts.
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
    drafts
      .filter((d) => d.courtId === courtId && d.dateKey === selectedKey)
      .forEach((d) => {
        const span = Math.ceil(d.duration / 60);
        for (let i = 0; i < span; i++) set.add(d.hour + i);
      });
    return set;
  }, [bookings, drafts, courtId, selectedKey]);

  const slotPrice = (h: number) => {
    if (!court) return 0;
    const rate = isPeakHour(h, isWeekend) ? court.pricePeak : court.priceOffPeak;
    return Math.round((rate * duration) / 60);
  };

  const span = Math.ceil(duration / 60);
  const clash = (h: number) =>
    h + span > 23 ||
    Array.from({ length: span }, (_, i) => h + i).some((x) => bookedHours.has(x));

  const canAdd =
    !!court &&
    hour !== null &&
    !clash(hour) &&
    !(lockedToday && drafts.length >= 1);

  const handleAdd = () => {
    if (!court || hour === null) return;
    onAdd({
      courtId: court.id,
      dateKey: selectedKey,
      hour,
      duration,
      price: slotPrice(hour),
    });
    setHour(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-sm font-semibold text-[var(--text-heading)]">
          Court booking
        </h4>
        <span className="rounded-full bg-[var(--surface-muted)] px-2.5 py-0.5 text-xs font-medium text-[var(--text-caption)]">
          {drafts.length} added
          {quota > 0 && ` · ${quota} included`}
        </span>
        {lockedToday && (
          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
            Walk-in · 1 session today
          </span>
        )}
      </div>

      {/* Court picker */}
      <div>
        <span className="mb-2 block text-xs font-medium text-[var(--text-caption)]">
          Choose court
        </span>
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
                  "flex items-center gap-3 rounded-2xl border p-3 text-left transition-all",
                  active
                    ? "border-[var(--color-primary)] bg-[var(--color-primary-light)] ring-2 ring-[var(--color-primary)]/30"
                    : "border-[var(--border-default)] bg-[var(--surface-card)] hover:border-[var(--color-primary)]/40",
                ].join(" ")}
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white"
                  style={{ background: c.color }}
                >
                  {c.name.slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[var(--text-heading)]">
                    {c.name}
                  </p>
                  <p className="truncate text-xs text-[var(--text-caption)]">
                    {c.environment} · {formatIDR(c.priceOffPeak, true)}–
                    {formatIDR(c.pricePeak, true)}/h
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Date + duration */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DatePicker
          label="Date"
          mode="single"
          value={date}
          minDate={new Date(`${TODAY_KEY}T00:00:00`)}
          disabled={lockedToday}
          onChange={(v) => {
            if (v instanceof Date) {
              setDate(v);
              setHour(null);
            }
          }}
        />
        <UiSelect
          label="Duration"
          options={durations.map((d) => ({ value: String(d.value), label: d.label }))}
          value={String(duration)}
          searchable
          clearable={false}
          onChange={(v) => {
            setDuration(Number(v));
            setHour(null);
          }}
        />
      </div>

      {/* Hour grid */}
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-medium text-[var(--text-caption)]">
            Pick a start time
          </span>
          <div className="flex flex-wrap gap-3 text-xs text-[var(--text-muted)]">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded border border-[var(--border-strong)]" /> Open
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-[var(--surface-muted)]" /> Booked
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-400" /> Peak
            </span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {gridHours.map((h) => {
            const blocked = clash(h);
            const active = hour === h;
            const peak = isPeakHour(h, isWeekend);
            return (
              <button
                key={h}
                type="button"
                disabled={blocked}
                onClick={() => setHour(h)}
                className={[
                  "relative rounded-lg border py-2.5 text-sm font-medium transition-all",
                  active
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-theme-sm"
                    : blocked
                      ? "cursor-not-allowed border-transparent bg-[var(--surface-muted)] text-[var(--text-muted)] line-through"
                      : "border-[var(--border-default)] text-[var(--text-body)] hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-primary-light)]",
                ].join(" ")}
              >
                {pad(h)}:00
                {peak && !blocked && !active && (
                  <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-amber-400" />
                )}
              </button>
            );
          })}
        </div>
        {bookedHours.size >= gridHours.length && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
            {court?.name} is fully booked on {selectedKey}. Pick another court or date.
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-[var(--text-caption)]">
          {hour !== null && court
            ? `${court.name} · ${selectedKey} · ${pad(hour)}:00 — ${formatIDR(slotPrice(hour))}`
            : "Select a court, date and time."}
        </p>
        <Button
          variant="outline"
          size="sm"
          disabled={!canAdd}
          onClick={handleAdd}
        >
          + Add booking
        </Button>
      </div>

      {/* Added list */}
      {drafts.length > 0 && (
        <div className="space-y-2">
          <span className="block text-xs font-medium text-[var(--text-caption)]">
            Bookings in this registration
          </span>
          {drafts.map((d, i) => {
            const c = courts.find((x) => x.id === d.courtId);
            const free = i < quota;
            return (
              <div
                key={d.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] px-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="h-8 w-8 shrink-0 rounded-lg"
                    style={{ background: c?.color }}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--text-heading)]">
                      {c?.name ?? "Court"} · {pad(d.hour)}:00
                    </p>
                    <p className="truncate text-xs text-[var(--text-caption)]">
                      {d.dateKey} · {d.duration} min
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={[
                      "text-sm font-semibold",
                      free
                        ? "text-emerald-500"
                        : "text-[var(--text-heading)]",
                    ].join(" ")}
                  >
                    {free ? "Included" : formatIDR(d.price)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemove(d.id)}
                    className="text-[var(--text-muted)] transition-colors hover:text-rose-500"
                    aria-label="Remove booking"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CourtBookingStep;
