"use client";

// Step 3 — Court booking (time-first, mirrors the New Booking flow).
// 1) Pick a date + earliest start time → "Cari".
// 2) See available START TIMES (at/after the chosen time) across all courts.
// 3) Click a time → see COURTS available at that time → click a court to add it
//    to the registration drafts (fixed 60-min sessions). Multiple bookings ok.

import React, { useMemo, useState } from "react";
import { Search, Clock, Check, ChevronRight, ArrowLeft } from "lucide-react";
import DatePicker from "@/components/ui/datepicker/DatePicker";
import TimePicker from "@/components/ui/datepicker/TimePicker";
import Button from "@/components/ui/button/Button";
import EmptyState from "@/components/ui/feedback/EmptyState";
import ToneBadge from "@/components/club-core/ToneBadge";
import { formatIDR } from "@/components/club-core/format";
import {
  type Court,
  courtAvailableSlots,
  hourToSlot,
  slotLabel,
  STORAGE_SLOT_MINUTES,
} from "@/data/padel/club/courts";
import { type Booking, dateKey } from "@/data/padel/club/bookings";
import type { MemberTier } from "@/data/padel/club/members";
import type { MaintenanceRecord } from "@/app/(admin)/maintenance/actions";
import { type DraftBooking, tierQuota, TODAY_KEY } from "./types";

const SESSION_MINUTES = 60;
const SLOTS_PER_SESSION = SESSION_MINUTES / STORAGE_SLOT_MINUTES; // 2

interface CourtBookingStepProps {
  tier: MemberTier;
  courts: Court[];
  bookings: Booking[];
  maintenance?: MaintenanceRecord[];
  drafts: DraftBooking[];
  onAdd: (b: Omit<DraftBooking, "id">) => void;
  onRemove: (id: string) => void;
}

/** Available start time across courts. */
interface TimeOption {
  startSlot: number;
  startLabel: string;
  endLabel: string;
  courtCount: number;
}

/** A court bookable at the picked time. */
interface CourtOption {
  court: Court;
  price: number;
  hasPeak: boolean;
}

const CourtBookingStep: React.FC<CourtBookingStepProps> = ({
  tier,
  courts,
  bookings,
  maintenance = [],
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

  const [date, setDate] = useState<Date>(new Date(`${TODAY_KEY}T00:00:00`));
  const [startTime, setStartTime] = useState<string>("07:00");
  const [times, setTimes] = useState<TimeOption[] | null>(null);
  const [searchedKey, setSearchedKey] = useState<string>("");
  /** when a time is picked, show the courts for it (inline step 3) */
  const [pickedSlot, setPickedSlot] = useState<number | null>(null);

  const reachedDailyLimit = lockedToday && drafts.length >= 1;

  const timeToSlot = (t: string): number => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(t);
    if (!m) return 0;
    return hourToSlot(Number(m[1])) + (Number(m[2]) >= 30 ? 1 : 0);
  };

  // occupied 30-min slots for a court on a date: existing bookings + our drafts + maintenance
  const occupiedFor = (courtId: string, key: string): Set<number> => {
    const set = new Set<number>();
    bookings
      .filter(
        (b) =>
          b.courtId === courtId &&
          b.status !== "cancelled" &&
          b.start.startsWith(key),
      )
      .forEach((b) => {
        const sh = Number(b.start.slice(11, 13));
        const sm = Number(b.start.slice(14, 16));
        const eh = Number(b.end.slice(11, 13));
        const em = Number(b.end.slice(14, 16));
        const s0 = hourToSlot(sh) + (sm >= 30 ? 1 : 0);
        const e0 = hourToSlot(eh) + (em > 30 ? 2 : em > 0 ? 1 : 0);
        for (let s = s0; s < e0; s++) set.add(s);
      });
    maintenance
      .filter((m) => m.courtId === courtId && m.start.startsWith(key))
      .forEach((m) => {
        const sh = Number(m.start.slice(11, 13));
        const sm = Number(m.start.slice(14, 16));
        const eh = Number(m.end.slice(11, 13));
        const em = Number(m.end.slice(14, 16));
        const s0 = hourToSlot(sh) + (sm >= 30 ? 1 : 0);
        const e0 = hourToSlot(eh) + (em > 30 ? 2 : em > 0 ? 1 : 0);
        for (let s = s0; s < e0; s++) set.add(s);
      });
    drafts
      .filter((d) => d.courtId === courtId && d.dateKey === key)
      .forEach((d) => {
        const startSlot = hourToSlot(d.hour) + ((d.minute ?? 0) >= 30 ? 1 : 0);
        const span = Math.ceil(d.duration / STORAGE_SLOT_MINUTES);
        for (let i = 0; i < span; i++) set.add(startSlot + i);
      });
    return set;
  };

  const runSearch = () => {
    const key = dateKey(date);
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

    const opts: TimeOption[] = Array.from(countBySlot.entries())
      .sort(([a], [b]) => a - b)
      .map(([startSlot, courtCount]) => ({
        startSlot,
        startLabel: slotLabel(startSlot),
        endLabel: slotLabel(startSlot + SLOTS_PER_SESSION),
        courtCount,
      }));

    setSearchedKey(key);
    setPickedSlot(null);
    setTimes(opts);
  };

  // courts available at the picked time
  const courtsAtPicked: CourtOption[] = useMemo(() => {
    if (pickedSlot == null || !searchedKey) return [];
    const day = new Date(`${searchedKey}T00:00:00`).getDay();
    const out: CourtOption[] = [];
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
  }, [pickedSlot, searchedKey, activeCourts, bookings, drafts, maintenance]);

  const addCourt = (opt: CourtOption) => {
    if (pickedSlot == null || reachedDailyLimit) return;
    onAdd({
      courtId: opt.court.id,
      dateKey: searchedKey,
      hour: Math.floor(pickedSlot / 2),
      minute: (pickedSlot % 2) * 30,
      duration: SESSION_MINUTES,
      price: opt.price,
    });
    // re-run search so the now-occupied slot/court updates, return to time list
    runSearch();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-[var(--surface-muted)] px-2.5 py-0.5 text-xs font-medium text-[var(--text-caption)]">
          {drafts.length} ditambahkan
          {quota > 0 && ` · ${quota} termasuk kuota`}
        </span>
        {lockedToday && (
          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
            Walk-in · 1 sesi hari ini
          </span>
        )}
      </div>

      {/* Step 1 — search form */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
        <DatePicker
          label="Tanggal main"
          labelInfo="Tanggal bermain. Tidak bisa memilih tanggal di masa lalu."
          mode="single"
          value={date}
          minDate={new Date(`${TODAY_KEY}T00:00:00`)}
          disabled={lockedToday}
          onChange={(v) => {
            if (v instanceof Date) {
              setDate(v);
              setTimes(null);
              setPickedSlot(null);
            }
          }}
        />
        <TimePicker
          label="Mulai dari jam"
          value={startTime}
          minuteStep={SESSION_MINUTES}
          placeholder="Pilih jam mulai"
          onChange={(v) => {
            setStartTime(v || "07:00");
            setTimes(null);
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

      {/* Step 2 — available times */}
      {times !== null && pickedSlot == null && (
        <div className="space-y-3">
          <p className="text-xs text-[var(--text-caption)]">
            {searchedKey} · mulai {startTime} · {times.length} pilihan jam · sesi {SESSION_MINUTES} menit
          </p>
          {reachedDailyLimit && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
              Member harian hanya bisa memesan 1 sesi. Hapus sesi yang ada untuk mengganti.
            </p>
          )}
          {times.length === 0 ? (
            <EmptyState
              title="Tidak ada jam tersedia"
              description="Coba ubah tanggal atau jam mulai."
            />
          ) : (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {times.map((t) => (
                <button
                  key={t.startSlot}
                  type="button"
                  onClick={() => setPickedSlot(t.startSlot)}
                  className="flex items-center gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-3.5 text-left transition-all hover:border-[var(--color-primary)] hover:ring-1 hover:ring-[var(--color-primary)]"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary-light)] text-[var(--color-primary)]">
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
                  <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 3 — courts at the picked time */}
      {times !== null && pickedSlot != null && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
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
            <EmptyState
              title="Tidak ada lapangan"
              description="Semua lapangan di jam ini terisi. Pilih jam lain."
            />
          ) : (
            <div className="space-y-2.5">
              {courtsAtPicked.map(({ court, price, hasPeak }) => (
                <button
                  key={court.id}
                  type="button"
                  disabled={reachedDailyLimit}
                  onClick={() => addCourt({ court, price, hasPeak })}
                  className="flex w-full items-center gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-4 text-left transition-all hover:border-[var(--color-primary)] hover:ring-1 hover:ring-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-40"
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

      {/* Added list */}
      {drafts.length > 0 && (
        <div className="space-y-2">
          <span className="block text-xs font-medium text-[var(--text-caption)]">
            Booking dalam registrasi ini
          </span>
          {drafts.map((d, i) => {
            const c = courts.find((x) => x.id === d.courtId);
            const free = i < quota;
            const startSlot = hourToSlot(d.hour) + ((d.minute ?? 0) >= 30 ? 1 : 0);
            const endSlot = startSlot + Math.ceil(d.duration / STORAGE_SLOT_MINUTES);
            return (
              <div
                key={d.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] px-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white" style={{ background: c?.color }}>
                    <Check className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--text-heading)]">
                      {c?.name ?? "Court"} · {slotLabel(startSlot)}–{slotLabel(endSlot)}
                    </p>
                    <p className="truncate text-xs text-[var(--text-caption)]">
                      {d.dateKey} · {d.duration} menit
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={[
                      "text-sm font-semibold",
                      free ? "text-emerald-500" : "text-[var(--text-heading)]",
                    ].join(" ")}
                  >
                    {free ? "Termasuk" : formatIDR(d.price)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemove(d.id)}
                    className="text-[var(--text-muted)] transition-colors hover:text-rose-500"
                    aria-label="Hapus booking"
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
