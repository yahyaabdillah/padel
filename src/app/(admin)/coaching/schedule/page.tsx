"use client";

// Master/Coaching ▸ Jadwal Coach. Menampilkan jadwal sesi coaching (PT) yang
// bisa difilter (coach, status, tanggal) beserta daftar coach dengan
// ketersediaan slot pada tanggal terpilih. Data dummy dari engage/coaches +
// availability deterministik dari club/pt.

import React, { useMemo, useState } from "react";
import PageScaffold from "@/components/club-engage/PageScaffold";
import StatCard from "@/components/club-engage/StatCard";
import EngageAvatar from "@/components/club-engage/EngageAvatar";
import { formatDateLong } from "@/components/club-engage/format";
import Card from "@/components/ui/card/Card";
import Badge from "@/components/ui/badge/Badge";
import UiSelect from "@/components/ui/select/Select";
import DatePicker from "@/components/ui/datepicker/DatePicker";
import InputLabel from "@/components/ui/input/InputLabel";
import Tabs from "@/components/ui/tabs/Tabs";
import EmptyState from "@/components/ui/feedback/EmptyState";
import {
  coaches,
  coachById,
  ptSessions,
  ptStatusMeta,
  type PTStatus,
} from "@/data/padel/engage/coaches";
import { coachFreeSlots } from "@/data/padel/club/pt";

const pad2 = (n: number) => String(n).padStart(2, "0");
const toKey = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const ClockIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
const UsersIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4z" /></svg>
);
const CalendarIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
);
const StarIcon = () => (
  <svg className="h-3.5 w-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.05 2.93c.3-.92 1.6-.92 1.9 0l1.28 3.95a1 1 0 00.95.69h4.15c.97 0 1.37 1.24.59 1.81l-3.36 2.44a1 1 0 00-.36 1.12l1.28 3.95c.3.92-.75 1.69-1.54 1.12l-3.36-2.44a1 1 0 00-1.18 0l-3.36 2.44c-.79.57-1.84-.2-1.54-1.12l1.28-3.95a1 1 0 00-.36-1.12L2.32 9.38c-.78-.57-.38-1.81.59-1.81h4.15a1 1 0 00.95-.69l1.04-3.95z" /></svg>
);

const ALL = "all";

export default function CoachSchedulePage() {
  const [coachFilter, setCoachFilter] = useState<string>(ALL);
  const [statusFilter, setStatusFilter] = useState<"all" | PTStatus>("all");
  const [dateFilter, setDateFilter] = useState<string>("");

  const activeCoaches = useMemo(
    () => coaches.filter((c) => c.status === "active"),
    [],
  );

  // ── filtered sessions ──
  const sessions = useMemo(() => {
    return ptSessions
      .filter((s) => coachFilter === ALL || s.coachId === coachFilter)
      .filter((s) => statusFilter === "all" || s.status === statusFilter)
      .filter((s) => !dateFilter || s.date === dateFilter)
      .sort((a, b) =>
        `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`),
      );
  }, [coachFilter, statusFilter, dateFilter]);

  // group sessions by date for the timeline
  const grouped = useMemo(() => {
    const map = new Map<string, typeof sessions>();
    for (const s of sessions) {
      const arr = map.get(s.date) ?? [];
      arr.push(s);
      map.set(s.date, arr);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [sessions]);

  // stats over the filtered set
  const stats = useMemo(() => {
    const upcoming = sessions.filter(
      (s) => s.status === "confirmed" || s.status === "pending",
    ).length;
    const completed = sessions.filter((s) => s.status === "completed").length;
    return { total: sessions.length, upcoming, completed };
  }, [sessions]);

  // availability date for the roster (defaults to filter date or demo today)
  const rosterDate = dateFilter || "2026-06-02";

  const resetFilters = () => {
    setCoachFilter(ALL);
    setStatusFilter("all");
    setDateFilter("");
  };

  const statusCounts = useMemo(() => {
    const base = ptSessions.filter(
      (s) =>
        (coachFilter === ALL || s.coachId === coachFilter) &&
        (!dateFilter || s.date === dateFilter),
    );
    const c: Record<string, number> = { all: base.length };
    (["confirmed", "pending", "completed", "cancelled"] as PTStatus[]).forEach(
      (st) => (c[st] = base.filter((s) => s.status === st).length),
    );
    return c;
  }, [coachFilter, dateFilter]);

  return (
    <PageScaffold
      title="Jadwal Coach"
      subtitle="Jadwal sesi coaching dan ketersediaan coach. Filter berdasarkan coach, status, atau tanggal."
      requireAny={["coaching.view"]}
    >
      <div className="space-y-6">
        {/* KPI */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Total Sesi (filter)" value={stats.total} icon={<CalendarIcon />} accent="primary" />
          <StatCard label="Akan Datang" value={stats.upcoming} icon={<ClockIcon />} accent="secondary" />
          <StatCard label="Selesai" value={stats.completed} icon={<UsersIcon />} accent="accent" />
        </div>

        {/* Filters */}
        <Card padding="md">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <UiSelect
                label="Coach"
                labelInfo="Tampilkan jadwal untuk coach tertentu, atau semua coach."
                value={coachFilter}
                onChange={(v) => setCoachFilter(v as string)}
                clearable={false}
                options={[
                  { value: ALL, label: "Semua coach" },
                  ...coaches.map((c) => ({
                    value: c.id,
                    label: c.name,
                    desc: c.level,
                  })),
                ]}
              />
            </div>
            <div>
              <DatePicker
                label="Tanggal"
                labelInfo="Saring sesi pada tanggal tertentu. Kosongkan untuk menampilkan semua tanggal."
                mode="single"
                placeholder="Semua tanggal"
                value={dateFilter ? new Date(dateFilter + "T00:00:00") : null}
                onChange={(v) => {
                  if (v instanceof Date) setDateFilter(toKey(v));
                  else setDateFilter("");
                }}
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={resetFilters}
                className="h-11 rounded-lg border border-[var(--border-default)] px-4 text-sm font-medium text-[var(--text-body)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
              >
                Reset filter
              </button>
            </div>
          </div>

          <div className="mt-4">
            <InputLabel
              label="Status"
              tooltip="Saring berdasarkan status sesi: confirmed, pending, completed, atau cancelled."
            />
            <Tabs
              variant="segment"
              size="sm"
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as typeof statusFilter)}
              items={[
                { value: "all", label: "Semua", badge: statusCounts.all },
                { value: "confirmed", label: "Confirmed", badge: statusCounts.confirmed },
                { value: "pending", label: "Pending", badge: statusCounts.pending },
                { value: "completed", label: "Completed", badge: statusCounts.completed },
                { value: "cancelled", label: "Cancelled", badge: statusCounts.cancelled },
              ]}
            />
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {/* Schedule timeline */}
          <div className="space-y-5 xl:col-span-2">
            <h3 className="text-base font-semibold text-[var(--text-heading)]">
              Jadwal Sesi
            </h3>
            {grouped.length === 0 ? (
              <Card padding="lg">
                <EmptyState
                  title="Tidak ada sesi"
                  description="Tidak ada sesi coaching yang cocok dengan filter saat ini. Coba ubah atau reset filter."
                />
              </Card>
            ) : (
              grouped.map(([day, items]) => (
                <div key={day}>
                  <div className="mb-2 flex items-center gap-2">
                    <CalendarIcon />
                    <h4 className="text-sm font-semibold text-[var(--text-heading)]">
                      {formatDateLong(day)}
                    </h4>
                    <Badge size="sm" color="neutral" variant="light">
                      {items.length} sesi
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {items.map((s) => {
                      const coach = coachById(s.coachId);
                      const tone = ptStatusMeta[s.status];
                      return (
                        <Card key={s.id} padding="sm" className="flex items-center gap-3">
                          <div className="flex w-16 shrink-0 flex-col items-center rounded-lg bg-[var(--surface-muted)] px-2 py-1.5 text-center">
                            <span className="text-sm font-bold text-[var(--text-heading)]">
                              {s.startTime}
                            </span>
                            <span className="text-[10px] text-[var(--text-muted)]">
                              {s.durationMin}m
                            </span>
                          </div>
                          <EngageAvatar src={coach?.avatar} name={coach?.name ?? ""} size={40} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-[var(--text-heading)]">
                              Coach {coach?.name}
                            </p>
                            <p className="truncate text-xs text-[var(--text-caption)]">
                              {s.clientName} · {s.focus}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              <Badge size="sm" color="neutral" variant="light">
                                {s.court}
                              </Badge>
                              {s.players === 2 && (
                                <Badge size="sm" color="info" variant="light">
                                  Pair (1-on-2)
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Badge
                            size="sm"
                            color={tone.tone === "neutral" ? "neutral" : tone.tone}
                            variant="light"
                            dot
                          >
                            {tone.label}
                          </Badge>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Coach roster + availability */}
          <div className="space-y-4 xl:col-span-1">
            <div className="flex items-center gap-1.5">
              <h3 className="text-base font-semibold text-[var(--text-heading)]">
                Daftar Coach
              </h3>
              <InputLabel
                label=""
                className="mb-0"
                tooltip={`Slot kosong dihitung untuk tanggal ${formatDateLong(rosterDate)}.`}
              />
            </div>
            {coaches.map((c) => {
              const free = c.status === "active" ? coachFreeSlots(c.id, rosterDate) : 0;
              const isFiltered = coachFilter === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() =>
                    setCoachFilter((prev) => (prev === c.id ? ALL : c.id))
                  }
                  className={[
                    "flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all",
                    isFiltered
                      ? "border-[var(--color-primary)] bg-[var(--color-primary-light)] ring-2 ring-[var(--color-primary)]/30"
                      : "border-[var(--border-default)] bg-[var(--surface-card)] hover:border-[var(--color-primary)]/40",
                  ].join(" ")}
                >
                  <EngageAvatar src={c.avatar} name={c.name} size={44} ring={isFiltered} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-[var(--text-heading)]">
                        {c.name}
                      </p>
                      <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-[var(--text-heading)]">
                        <StarIcon />
                        {c.rating.toFixed(1)}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-caption)]">{c.level}</p>
                    <div className="mt-1">
                      {c.status === "active" ? (
                        <span className={`text-xs font-medium ${free > 0 ? "text-emerald-500" : "text-rose-500"}`}>
                          {free} slot kosong
                        </span>
                      ) : (
                        <Badge size="sm" color="warning" variant="light">
                          On Leave
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
            <p className="px-1 text-xs text-[var(--text-muted)]">
              Klik coach untuk menyaring jadwal. {activeCoaches.length} dari {coaches.length} coach aktif.
            </p>
          </div>
        </div>
      </div>
    </PageScaffold>
  );
}
