"use client";

// PadelHub — "New Booking" flow, time-first.
//   Step 1 (this page): pick a DATE + earliest START TIME, click Cari.
//   Step 2 (this page): show every available 60-min START TIME (at/after the
//           chosen time) across all active courts. Click a time → navigate to
//           the court-selection page (/bookings/courts) for that date + time.

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, CalendarDays, Clock, ChevronRight } from "lucide-react";
import Card from "@/components/ui/card/Card";
import Button from "@/components/ui/button/Button";
import DatePicker from "@/components/ui/datepicker/DatePicker";
import TimePicker from "@/components/ui/datepicker/TimePicker";
import EmptyState from "@/components/ui/feedback/EmptyState";
import ToneBadge from "@/components/club-core/ToneBadge";
import { useClubData } from "@/components/club-core/ClubDataContext";
import { useOperatingHours } from "@/context/OperatingHoursContext";
import {
  courtAvailableSlots,
  hourToSlot,
  slotLabel,
  occupiedSlotsFor,
  type BlockingWindow,
} from "@/data/padel/club/courts";
import { dateKey } from "@/data/padel/club/bookings";
import {
  getTimeGroupsAction,
  type TimeGroup,
} from "@/app/(admin)/settings/hours/group-actions";

const todayKey = "2026-06-02";

/** Sessions are fixed at 60 minutes. */
const SESSION_MINUTES = 60;

/** An available start time + how many courts are free at it. */
interface TimeOption {
  startSlot: number;
  startLabel: string;
  endLabel: string;
  courtCount: number;
}

export default function NewBookingSearch() {
  const router = useRouter();
  const { courts, bookings, maintenance, isReady } = useClubData();
  const { isReady: hoursReady } = useOperatingHours();

  const [date, setDate] = useState<Date>(
    () => new Date(`${todayKey}T00:00:00`),
  );
  /** earliest hour the customer wants to play ("HH:MM") */
  const [startTime, setStartTime] = useState<string>("07:00");

  const [results, setResults] = useState<TimeOption[] | null>(null);
  const [searchedMeta, setSearchedMeta] = useState<{
    dateKey: string;
    startTime: string;
  } | null>(null);
  const [timeGroups, setTimeGroups] = useState<TimeGroup[]>([]);

  useEffect(() => {
    void getTimeGroupsAction()
      .then(setTimeGroups)
      .catch(() => setTimeGroups([]));
  }, []);

  const activeCourts = useMemo(
    () => courts.filter((c) => c.status === "active"),
    [courts],
  );

  /** start-time → storage slot index (0–47) */
  const timeToSlot = (t: string): number => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(t);
    if (!m) return 0;
    return hourToSlot(Number(m[1])) + (Number(m[2]) >= 30 ? 1 : 0);
  };

  const runSearch = () => {
    const key = dateKey(date);
    const day = date.getDay();
    const fromSlot = timeToSlot(startTime);

    // Count, per start slot, how many active courts have it available.
    const blockers: BlockingWindow[] = [
      ...bookings
        .filter((b) => b.status !== "cancelled")
        .map((b) => ({ courtId: b.courtId, start: b.start, end: b.end })),
      ...maintenance.map((m) => ({ courtId: m.courtId, start: m.start, end: m.end })),
    ];
    const countBySlot = new Map<number, number>();
    activeCourts.forEach((court) => {
      const occupied = occupiedSlotsFor(court.id, key, blockers);

      courtAvailableSlots(court, day, SESSION_MINUTES, occupied, SESSION_MINUTES)
        .filter((s) => s.startSlot >= fromSlot)
        .forEach((s) => {
          countBySlot.set(s.startSlot, (countBySlot.get(s.startSlot) ?? 0) + 1);
        });
    });

    const times: TimeOption[] = Array.from(countBySlot.entries())
      .sort(([a], [b]) => a - b)
      .map(([startSlot, courtCount]) => ({
        startSlot,
        startLabel: slotLabel(startSlot),
        endLabel: slotLabel(startSlot + SESSION_MINUTES / 30),
        courtCount,
      }));

    setSearchedMeta({ dateKey: key, startTime });
    setResults(times);
  };

  const goToCourts = (startSlot: number) => {
    if (!searchedMeta) return;
    const params = new URLSearchParams({
      date: searchedMeta.dateKey,
      slot: String(startSlot),
    });
    router.push(`/bookings/courts?${params.toString()}`);
  };

  /** Bucket the available time options into the configured time groups. A slot
   * belongs to a group if its START hour is within [startHour, endHour). Any
   * slot not covered by a group falls into "Lainnya". Empty groups are hidden. */
  const groupedResults = useMemo(() => {
    if (!results) return [];
    const startHourOf = (startSlot: number) => Math.floor((startSlot * 30) / 60);

    const buckets: { key: string; name: string; color: string; items: TimeOption[] }[] = [];
    const sortedGroups = [...timeGroups].sort(
      (a, b) => a.sortOrder - b.sortOrder || a.startHour - b.startHour,
    );
    for (const g of sortedGroups) {
      buckets.push({ key: g.id, name: g.name, color: g.color, items: [] });
    }
    const other: TimeOption[] = [];

    for (const t of results) {
      const h = startHourOf(t.startSlot);
      const g = sortedGroups.find((grp) => h >= grp.startHour && h < grp.endHour);
      if (g) {
        const bucket = buckets.find((b) => b.key === g.id)!;
        bucket.items.push(t);
      } else {
        other.push(t);
      }
    }

    const out = buckets.filter((b) => b.items.length > 0);
    if (other.length > 0) {
      out.push({ key: "__other", name: "Lainnya", color: "#94A3B8", items: other });
    }
    return out;
  }, [results, timeGroups]);

  if (!isReady || !hoursReady) {
    return (
      <Card padding="lg">
        <div className="space-y-4">
          <div className="h-10 w-full animate-pulse rounded-lg bg-[var(--surface-muted)]" />
          <div className="h-40 w-full animate-pulse rounded-xl bg-[var(--surface-muted)]" />
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Step 1: Search form ── */}
      <Card padding="lg">
        <div className="mb-5 flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-[var(--color-primary)]" />
          <h3 className="text-lg font-semibold text-[var(--text-heading)]">
            Mau booking kapan?
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
          <DatePicker
            label="Tanggal main"
            labelInfo="Tanggal bermain. Tidak bisa memilih tanggal di masa lalu."
            mode="single"
            value={date}
            minDate={new Date(`${todayKey}T00:00:00`)}
            onChange={(v) => {
              if (v instanceof Date) {
                setDate(v);
                setResults(null);
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
              setResults(null);
            }}
          />

          <Button
            variant="primary"
            sheen
            glow
            startIcon={<Search className="h-4 w-4" />}
            onClick={runSearch}
            className="h-11"
          >
            Cari
          </Button>
        </div>
      </Card>

      {/* ── Step 2: available times — click a time to pick a court ── */}
      {results !== null && (
        <Card padding="lg">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-[var(--text-heading)]">
              Jam tersedia
            </h3>
            {searchedMeta && (
              <p className="mt-0.5 text-xs text-[var(--text-caption)]">
                {searchedMeta.dateKey} · mulai {searchedMeta.startTime} ·{" "}
                {results.length} pilihan jam · sesi {SESSION_MINUTES} menit
              </p>
            )}
          </div>

          {results.length === 0 ? (
            <EmptyState
              title="Tidak ada jam tersedia"
              description="Coba ubah tanggal atau jam mulai untuk menemukan slot yang kosong."
            />
          ) : (
            <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-start">
              {groupedResults.map((group) => (
                <div
                  key={group.key}
                  className="w-full lg:w-[260px] lg:flex-none rounded-2xl border border-[var(--border-default)] bg-[var(--surface-muted)]/40 p-3"
                >
                  <div className="mb-3 flex items-center gap-2 px-1">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ background: group.color }}
                    />
                    <h4 className="text-sm font-semibold text-[var(--text-heading)]">
                      {group.name}
                    </h4>
                    <span className="ml-auto text-xs text-[var(--text-muted)]">
                      {group.items.length} jam
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">
                    {group.items.map((t) => (
                      <button
                        key={t.startSlot}
                        type="button"
                        onClick={() => goToCourts(t.startSlot)}
                        className="flex items-center gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-3 text-left transition-all hover:border-[var(--color-primary)] hover:ring-1 hover:ring-[var(--color-primary)]"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary-light)] text-[var(--color-primary)]">
                          <Clock className="h-4.5 w-4.5" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[var(--text-heading)]">
                            {t.startLabel}–{t.endLabel}
                          </p>
                          <p className="truncate text-xs text-[var(--text-caption)]">
                            {t.courtCount} lapangan
                          </p>
                        </div>
                        <span className="ml-auto flex shrink-0 items-center gap-1.5">
                          <ToneBadge tone="success">{t.courtCount}</ToneBadge>
                          <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
