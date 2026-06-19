"use client";

// Member ▸ Book a Court — Step 1+2 (mirrors the STAFF "New Booking" flow):
//   Step 1: pick a DATE + earliest START TIME → "Cari".
//   Step 2: list every available 60-min start time (grouped by time-group);
//           click a time → navigate to the court-selection page.
// Steps 3 (court) and 4 (payment) live on their own pages, exactly like staff.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, CalendarDays, Clock, ChevronRight } from "lucide-react";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import Card from "@/components/ui/card/Card";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import DatePicker from "@/components/ui/datepicker/DatePicker";
import TimePicker from "@/components/ui/datepicker/TimePicker";
import EmptyState from "@/components/ui/feedback/EmptyState";
import { getMeBookDataAction, getMeOccupancyAction } from "./actions";
import {
  SESSION_MINUTES,
  SESSION_SLOTS,
  toKey,
  slotLabel,
  prettyDate,
  sessionAt,
} from "./book-helpers";
import type { MeBookData } from "./types";

interface TimeOption {
  startHour: number;
  startLabel: string;
  endLabel: string;
  courtCount: number;
}

export default function BookCourtPage() {
  const router = useRouter();
  const [data, setData] = useState<MeBookData | null>(null);
  const [loading, setLoading] = useState(true);

  const [date, setDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [startTime, setStartTime] = useState("07:00");

  const [results, setResults] = useState<TimeOption[] | null>(null);
  const [searchedMeta, setSearchedMeta] = useState<{ dateKey: string; startTime: string } | null>(null);
  const [searching, setSearching] = useState(false);

  const loadData = useCallback(async () => {
    const d = await getMeBookDataAction();
    setData(d);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const timeGroups = data?.timeGroups ?? [];
  const todayKey = toKey(new Date());
  const nowHour = new Date().getHours();

  const timeToHour = (t: string): number => {
    const m = /^(\d{1,2}):/.exec(t);
    return m ? Number(m[1]) : 7;
  };

  const runSearch = async () => {
    if (!data) return;
    setSearching(true);
    const key = toKey(date);
    const weekday = date.getDay();
    const fromHour = timeToHour(startTime);

    const occRows = await getMeOccupancyAction(key);
    const occMap = new Map(occRows.map((r) => [r.courtId, new Set(r.slots)]));

    const guard = { isToday: key === todayKey, nowHour };
    const countByHour = new Map<number, number>();
    for (const court of data.courts) {
      const occ = occMap.get(court.id) ?? new Set<number>();
      for (let h = fromHour; h < 24; h++) {
        if (sessionAt(court, weekday, h, occ, guard)) {
          countByHour.set(h, (countByHour.get(h) ?? 0) + 1);
        }
      }
    }

    const times: TimeOption[] = [...countByHour.entries()]
      .sort(([a], [b]) => a - b)
      .map(([startHour, courtCount]) => ({
        startHour,
        startLabel: slotLabel(startHour * 2),
        endLabel: slotLabel(startHour * 2 + SESSION_SLOTS),
        courtCount,
      }));

    setSearchedMeta({ dateKey: key, startTime });
    setResults(times);
    setSearching(false);
  };

  const goToCourts = (startHour: number) => {
    if (!searchedMeta) return;
    const params = new URLSearchParams({ date: searchedMeta.dateKey, hour: String(startHour) });
    router.push(`/me/book/courts?${params.toString()}`);
  };

  const groupedResults = useMemo(() => {
    if (!results) return [];
    const buckets: { key: string; name: string; color: string; items: TimeOption[] }[] = [];
    const sorted = [...timeGroups].sort((a, b) => a.sortOrder - b.sortOrder || a.startHour - b.startHour);
    for (const g of sorted) buckets.push({ key: g.id, name: g.name, color: g.color, items: [] });
    const other: TimeOption[] = [];
    for (const t of results) {
      const g = sorted.find((grp) => t.startHour >= grp.startHour && t.startHour < grp.endHour);
      if (g) buckets.find((b) => b.key === g.id)!.items.push(t);
      else other.push(t);
    }
    const out = buckets.filter((b) => b.items.length > 0);
    if (other.length > 0) out.push({ key: "__other", name: "Lainnya", color: "#94A3B8", items: other });
    return out;
  }, [results, timeGroups]);

  if (loading || !data) {
    return (
      <div>
        <PageBreadCrumb pageTitle="Book a Court" />
        <div className="h-[300px] animate-pulse rounded-2xl bg-[var(--surface-muted)]" />
      </div>
    );
  }

  const m = data.membership;

  return (
    <div>
      <PageBreadCrumb pageTitle="Book a Court" />

      <div className="space-y-6">
        {/* membership strip */}
        {m.planName && m.quotaTotal > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-4">
            <Badge size="sm" color={m.quotaRemaining > 0 ? "success" : "neutral"} variant="light">
              {m.planName}
            </Badge>
            <span className="text-xs text-[var(--text-body)]">
              Kuota gratis: {m.quotaRemaining}/{m.quotaTotal} tersisa
            </span>
            {m.resetAt && <span className="text-xs text-[var(--text-muted)]">· reset {m.resetAt}</span>}
            <span className="text-xs text-[var(--text-caption)]">
              {m.quotaRemaining > 0
                ? "— booking berikutnya GRATIS (semua lapangan & jam)."
                : m.courtDiscountPct > 0
                  ? `— kuota habis, diskon ${m.courtDiscountPct}% berlaku.`
                  : "— kuota habis, tarif normal."}
            </span>
          </div>
        )}

        {/* Step 1: search form */}
        <Card padding="lg">
          <div className="mb-5 flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-[var(--color-primary)]" />
            <h3 className="text-lg font-semibold text-[var(--text-heading)]">Mau booking kapan?</h3>
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
              disabled={searching}
              className="h-11"
            >
              {searching ? "Mencari…" : "Cari"}
            </Button>
          </div>
        </Card>

        {/* Step 2: available times */}
        {results !== null && (
          <Card padding="lg">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-[var(--text-heading)]">Jam tersedia</h3>
              {searchedMeta && (
                <p className="mt-0.5 text-xs text-[var(--text-caption)]">
                  {prettyDate(searchedMeta.dateKey)} · mulai {searchedMeta.startTime} · {results.length} pilihan
                  jam · sesi {SESSION_MINUTES} menit
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
                    className="w-full rounded-2xl border border-[var(--border-default)] bg-[var(--surface-muted)]/40 p-3 lg:w-[260px] lg:flex-none"
                  >
                    <div className="mb-3 flex items-center gap-2 px-1">
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: group.color }} />
                      <h4 className="text-sm font-semibold text-[var(--text-heading)]">{group.name}</h4>
                      <span className="ml-auto text-xs text-[var(--text-muted)]">{group.items.length} jam</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">
                      {group.items.map((t) => (
                        <button
                          key={t.startHour}
                          type="button"
                          onClick={() => goToCourts(t.startHour)}
                          className="flex items-center gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-3 text-left transition-all hover:border-[var(--color-primary)] hover:ring-1 hover:ring-[var(--color-primary)]"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary-light)] text-[var(--color-primary)]">
                            <Clock className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[var(--text-heading)]">
                              {t.startLabel}–{t.endLabel}
                            </p>
                            <p className="truncate text-xs text-[var(--text-caption)]">{t.courtCount} lapangan</p>
                          </div>
                          <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-[var(--text-muted)]" />
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
    </div>
  );
}
