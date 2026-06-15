"use client";

// Step 3 — Court booking (search-first, mirrors the New Booking flow).
// User picks a date + duration → clicks "Cari" → sees available slots per court
// (respecting each court's schedule + master operating hours + existing bookings
// and drafts already added this session) → clicks a slot to add it. Supports
// multiple bookings; quota-included ones are free, the rest add the court fee.

import React, { useMemo, useState } from "react";
import { Search, Clock, Check, ChevronDown } from "lucide-react";
import DatePicker from "@/components/ui/datepicker/DatePicker";
import TimePicker from "@/components/ui/datepicker/TimePicker";
import UiSelect from "@/components/ui/select/Select";
import Button from "@/components/ui/button/Button";
import InputLabel from "@/components/ui/input/InputLabel";
import EmptyState from "@/components/ui/feedback/EmptyState";
import ToneBadge from "@/components/club-core/ToneBadge";
import { formatIDR } from "@/components/club-core/format";
import { useOperatingHours } from "@/context/OperatingHoursContext";
import {
  type Court,
  type AvailableSlot,
  courtAvailableSlots,
  hourToSlot,
  slotLabel,
  STORAGE_SLOT_MINUTES,
} from "@/data/padel/club/courts";
import { type Booking, dateKey } from "@/data/padel/club/bookings";
import type { MemberTier } from "@/data/padel/club/members";
import { type DraftBooking, tierQuota, TODAY_KEY } from "./types";

interface CourtBookingStepProps {
  tier: MemberTier;
  courts: Court[];
  bookings: Booking[];
  drafts: DraftBooking[];
  onAdd: (b: Omit<DraftBooking, "id">) => void;
  onRemove: (id: string) => void;
}

interface CourtResult {
  court: Court;
  slots: AvailableSlot[];
}

const buildDurations = (step: 30 | 60) => {
  const out: { value: string; label: string }[] = [];
  for (let m = step; m <= 180; m += step) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    const label = h > 0 ? `${h} jam${min ? ` ${min} menit` : ""}` : `${min} menit`;
    out.push({ value: String(m), label });
  }
  return out;
};

const CourtBookingStep: React.FC<CourtBookingStepProps> = ({
  tier,
  courts,
  bookings,
  drafts,
  onAdd,
  onRemove,
}) => {
  const { slotMinutes } = useOperatingHours();
  const activeCourts = useMemo(
    () => courts.filter((c) => c.status === "active"),
    [courts],
  );
  const lockedToday = tier === "daily";
  const quota = tierQuota[tier];

  const durationOptions = useMemo(() => buildDurations(slotMinutes), [slotMinutes]);

  const [date, setDate] = useState<Date>(new Date(`${TODAY_KEY}T00:00:00`));
  const [duration, setDuration] = useState<number>(60);
  const [results, setResults] = useState<CourtResult[] | null>(null);
  const [resultsOpen, setResultsOpen] = useState(true);
  const [searchedKey, setSearchedKey] = useState<string>("");
  const [filterCourt, setFilterCourt] = useState<string>("all");
  const [filterTime, setFilterTime] = useState<string>("");

  const durationValid = durationOptions.some((d) => Number(d.value) === duration);
  const effectiveDuration = durationValid
    ? duration
    : Number(durationOptions[0]?.value ?? 60);

  // occupied 30-min slots for a court on a date: existing bookings + our drafts
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
        const startSlot = hourToSlot(sh) + (sm >= 30 ? 1 : 0);
        const endSlot = hourToSlot(eh) + (em > 30 ? 2 : em > 0 ? 1 : 0);
        for (let s = startSlot; s < endSlot; s++) set.add(s);
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
    const found: CourtResult[] = activeCourts
      .map((court) => ({
        court,
        slots: courtAvailableSlots(
          court,
          day,
          effectiveDuration,
          occupiedFor(court.id, key),
          slotMinutes,
        ),
      }))
      .filter((r) => r.slots.length > 0);
    setSearchedKey(key);
    setFilterCourt("all");
    setFilterTime("");
    setResults(found);
    setResultsOpen(true);
  };

  const timeToSlot = (t: string): number | null => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(t);
    if (!m) return null;
    return hourToSlot(Number(m[1])) + (Number(m[2]) >= 30 ? 1 : 0);
  };

  const filteredResults = useMemo(() => {
    if (!results) return [];
    const fromSlot = filterTime ? timeToSlot(filterTime) : null;
    return results
      .filter((r) => filterCourt === "all" || r.court.id === filterCourt)
      .map((r) => ({
        ...r,
        slots:
          fromSlot == null
            ? r.slots
            : r.slots.filter((s) => s.startSlot >= fromSlot),
      }))
      .filter((r) => r.slots.length > 0);
  }, [results, filterCourt, filterTime]);

  const reachedDailyLimit = lockedToday && drafts.length >= 1;

  const addSlot = (court: Court, slot: AvailableSlot) => {
    if (reachedDailyLimit) return;
    onAdd({
      courtId: court.id,
      dateKey: searchedKey,
      hour: Math.floor(slot.startSlot / 2),
      minute: (slot.startSlot % 2) * 30,
      duration: effectiveDuration,
      price: slot.price,
    });
  };

  /** is this court+startSlot already in the current drafts (for searchedKey)? */
  const isDrafted = (courtId: string, startSlot: number) =>
    drafts.some(
      (d) =>
        d.courtId === courtId &&
        d.dateKey === searchedKey &&
        hourToSlot(d.hour) + ((d.minute ?? 0) >= 30 ? 1 : 0) === startSlot,
    );

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

      {/* Search form */}
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
              setResults(null);
            }
          }}
        />
        <UiSelect
          label="Durasi main"
          labelInfo={`Lama sewa. Mengikuti durasi slot booking klub (${slotMinutes} menit).`}
          options={durationOptions}
          value={String(effectiveDuration)}
          clearable={false}
          onChange={(v) => {
            setDuration(Number(v));
            setResults(null);
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

      {/* Results */}
      {results !== null && (
        <div className="overflow-hidden rounded-2xl border border-[var(--border-default)]">
          {/* Accordion header */}
          <button
            type="button"
            onClick={() => setResultsOpen((o) => !o)}
            className="flex w-full items-center justify-between gap-3 bg-[var(--surface-muted)] px-4 py-3 text-left transition-colors hover:bg-[var(--surface-card)]"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-[var(--text-heading)]">
              Hasil pencarian
              <span className="rounded-full bg-[var(--surface-card)] px-2 py-0.5 text-xs font-medium text-[var(--text-caption)]">
                {filteredResults.length} lapangan
              </span>
            </span>
            <span className="flex items-center gap-2 text-xs text-[var(--text-caption)]">
              {resultsOpen ? "Tutup" : "Buka"}
              <ChevronDown
                className={`h-4 w-4 transition-transform ${resultsOpen ? "rotate-180" : ""}`}
              />
            </span>
          </button>

          {resultsOpen && (
            <div className="space-y-4 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-[var(--text-caption)]">
                  {searchedKey} · durasi {effectiveDuration} menit
                </p>
                {results.length > 0 && (
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="w-40">
                      <InputLabel label="Filter lapangan" tooltip="Tampilkan hanya lapangan tertentu." />
                      <UiSelect
                        options={[
                          { value: "all", label: "Semua lapangan" },
                          ...results.map((r) => ({ value: r.court.id, label: r.court.name })),
                        ]}
                        value={filterCourt}
                        clearable={false}
                        searchable
                        onChange={(v) => setFilterCourt(v as string)}
                      />
                    </div>
                    <div className="w-40">
                      <TimePicker
                        label="Mulai dari jam"
                        value={filterTime}
                        minuteStep={slotMinutes}
                        placeholder="Semua jam"
                        onChange={(v) => setFilterTime(v)}
                      />
                    </div>
                  </div>
                )}
              </div>

              {reachedDailyLimit && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                  Member harian hanya bisa memesan 1 sesi. Hapus sesi yang ada untuk mengganti.
                </p>
              )}

              {filteredResults.length === 0 ? (
                <EmptyState
                  title="Tidak ada slot tersedia"
                  description="Coba ubah tanggal, durasi, atau filter."
                />
              ) : (
                <div className="space-y-4">
                  {filteredResults.map(({ court, slots }) => (
                    <div
                      key={court.id}
                      className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-4"
                    >
                      <div className="mb-3 flex items-center gap-3">
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
                            {court.environment} · {formatIDR(court.priceOffPeak, true)}–
                            {formatIDR(court.pricePeak, true)}/jam
                          </p>
                        </div>
                        <span className="ml-auto shrink-0">
                          <ToneBadge tone="success">{slots.length} slot</ToneBadge>
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {slots.map((s) => {
                          const drafted = isDrafted(court.id, s.startSlot);
                          const draft = drafts.find(
                            (d) =>
                              d.courtId === court.id &&
                              d.dateKey === searchedKey &&
                              hourToSlot(d.hour) + ((d.minute ?? 0) >= 30 ? 1 : 0) ===
                                s.startSlot,
                          );
                          return (
                            <button
                          key={s.startSlot}
                          type="button"
                          disabled={!drafted && reachedDailyLimit}
                          onClick={() =>
                            drafted && draft ? onRemove(draft.id) : addSlot(court, s)
                          }
                          className={[
                            "group flex flex-col items-center rounded-xl border px-3 py-2 text-center transition-all disabled:cursor-not-allowed disabled:opacity-40",
                            drafted
                              ? "border-emerald-500 bg-emerald-500 text-white shadow-theme-sm"
                              : "border-[var(--border-default)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)]",
                          ].join(" ")}
                          title={
                            drafted
                              ? `Klik untuk batalkan ${s.startLabel}–${s.endLabel}`
                              : `Tambah ${s.startLabel}–${s.endLabel}`
                          }
                        >
                          <span
                            className={[
                              "flex items-center gap-1 text-sm font-semibold",
                              drafted ? "text-white" : "text-[var(--text-heading)]",
                            ].join(" ")}
                          >
                            <Clock
                              className={[
                                "h-3.5 w-3.5",
                                drafted ? "text-white/80" : "text-[var(--text-muted)]",
                              ].join(" ")}
                            />
                            {s.startLabel}–{s.endLabel}
                          </span>
                          {drafted ? (
                            <span className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-white/90">
                              <Check className="h-3 w-3" /> Masuk draft
                            </span>
                          ) : (
                            <span className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--text-caption)]">
                              {formatIDR(s.price, true)}
                              {s.hasPeak && <ToneBadge tone="primary">peak</ToneBadge>}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
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
                  <span
                    className="h-8 w-8 shrink-0 rounded-lg"
                    style={{ background: c?.color }}
                  />
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
