"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import Button from "@/components/ui/button/Button";
import StatCard from "./StatCard";
import ToneBadge from "./ToneBadge";
import PeakHoursChart from "./PeakHoursChart";
import { ClubDataProvider, useClubData } from "./ClubDataContext";
import { formatIDR, formatTimeRange, relativeDayLabel } from "./format";
import { currentClub } from "@/data/padel/tenant";
import { gridHours, todayKey, bookingTypeMeta, bookingStatusMeta } from "@/data/padel/club/bookings";
import { isPeakHour } from "@/data/padel/club/courts";

const CourtIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <rect x="3" y="5" width="18" height="14" rx="1.5" />
    <path strokeLinecap="round" d="M12 5v14M3 12h18" />
  </svg>
);
const MoneyIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.66 0-3 .9-3 2s1.34 2 3 2 3 .9 3 2-1.34 2-3 2m0-10v1m0 8v1m0-10c1.1 0 2.08.4 2.6 1M12 16c-1.1 0-2.08-.4-2.6-1" />
    <circle cx="12" cy="12" r="9" />
  </svg>
);
const CalendarIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path strokeLinecap="round" d="M3 9h18M8 3v4M16 3v4" />
  </svg>
);
const UsersIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-1a4 4 0 00-4-4M9 20H4v-1a4 4 0 014-4h2a4 4 0 014 4v1H9zm3-9a3 3 0 100-6 3 3 0 000 6zm6-1a2.5 2.5 0 100-5" />
  </svg>
);

function DashboardInner() {
  const { courts, bookings, isReady } = useClubData();

  const stats = useMemo(() => {
    const today = bookings.filter((b) => b.start.startsWith(todayKey) && b.status !== "cancelled");
    const todayRevenue = today.reduce((s, b) => s + b.price, 0);

    const activeCourts = courts.filter((c) => c.status === "active");
    // occupancy = booked court-hours / available court-hours today
    const availableSlots = activeCourts.length * gridHours.length;
    const bookedSlots = today.reduce((s, b) => {
      const sh = new Date(b.start).getHours();
      const eh = new Date(b.end).getHours();
      const em = new Date(b.end).getMinutes();
      return s + Math.max(1, (em > 0 ? eh + 1 : eh) - sh);
    }, 0);
    const occupancy = availableSlots ? Math.round((bookedSlots / availableSlots) * 100) : 0;

    const memberCount = today.filter((b) => b.type === "member").length;
    const walkInCount = today.filter((b) => b.type === "walk_in").length;

    // peak hours histogram (count of bookings starting each hour)
    const peak = gridHours.map(
      (h) => today.filter((b) => new Date(b.start).getHours() === h).length,
    );

    // upcoming bookings: future today + sorted
    const nowHour = 14;
    const upcoming = [...today]
      .filter((b) => new Date(b.start).getHours() >= nowHour)
      .sort((a, b) => (a.start < b.start ? -1 : 1))
      .slice(0, 6);

    return {
      todayRevenue,
      occupancy,
      bookingsToday: today.length,
      memberCount,
      walkInCount,
      peak,
      upcoming,
      activeCourts,
      maintenanceCount: courts.filter((c) => c.status === "maintenance").length,
    };
  }, [bookings, courts]);

  // court status heatmap: per court x hour utilization today
  const heatmap = useMemo(() => {
    const today = bookings.filter((b) => b.start.startsWith(todayKey) && b.status !== "cancelled");
    const map = new Map<string, boolean>();
    for (const b of today) {
      const sh = new Date(b.start).getHours();
      const eh = new Date(b.end).getHours();
      const em = new Date(b.end).getMinutes();
      const last = em > 0 ? eh : eh - 1;
      for (let h = sh; h <= last; h++) map.set(`${b.courtId}:${h}`, true);
    }
    return map;
  }, [bookings]);

  if (!isReady) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-gray-100 dark:bg-white/[0.04]" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <PageBreadcrumb pageTitle="Dashboard" />

      {/* hero / context bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-gradient-to-r from-brand-500/10 via-transparent to-teal-500/10 p-5 dark:border-gray-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-400" />
              {currentClub.plan.toUpperCase()} plan
            </span>
          </div>
          <h1 className="mt-2 text-xl font-bold text-gray-900 dark:text-white">{currentClub.name}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {currentClub.address} · Open {currentClub.openingTime}–{currentClub.closingTime}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/bookings">
            <Button variant="primary" sheen glow>
              New booking
            </Button>
          </Link>
          <Link href="/finance">
            <Button variant="outline">View finance</Button>
          </Link>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Today's occupancy"
          value={`${stats.occupancy}%`}
          icon={<CourtIcon />}
          accent="var(--color-primary)"
          delta="+6.2%"
          deltaTone="up"
          hint="vs last week"
        >
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-teal-500"
              style={{ width: `${stats.occupancy}%` }}
            />
          </div>
        </StatCard>
        <StatCard
          label="Today's revenue"
          value={formatIDR(stats.todayRevenue, true)}
          icon={<MoneyIcon />}
          accent="#14B8A6"
          delta="+11.8%"
          deltaTone="up"
          hint="vs yesterday"
        />
        <StatCard
          label="Bookings today"
          value={stats.bookingsToday}
          icon={<CalendarIcon />}
          accent="#F59E0B"
          hint={`${stats.memberCount} member · ${stats.walkInCount} walk-in`}
        />
        <StatCard
          label="Active courts"
          value={`${stats.activeCourts.length}/${courts.length}`}
          icon={<UsersIcon />}
          accent="#EC4899"
          hint={stats.maintenanceCount ? `${stats.maintenanceCount} in maintenance` : "All courts available"}
        />
      </div>

      {/* charts row */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ComponentCard title="Peak hours" desc="Bookings starting per hour — today">
            <PeakHoursChart data={stats.peak} />
          </ComponentCard>
        </div>

        {/* upcoming bookings */}
        <ComponentCard title="Upcoming today" desc="Next sessions on court">
          {stats.upcoming.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
              No more bookings scheduled for today.
            </p>
          ) : (
            <ul className="-my-2 divide-y divide-gray-100 dark:divide-gray-800">
              {stats.upcoming.map((b) => {
                const court = courts.find((c) => c.id === b.courtId);
                return (
                  <li key={b.id} className="flex items-center gap-3 py-3">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                      style={{ background: bookingTypeMeta[b.type].color }}
                    >
                      {court?.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">{b.customer}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {court?.name} · {formatTimeRange(b.start, b.end)}
                      </p>
                    </div>
                    <ToneBadge tone={bookingStatusMeta[b.status].tone}>
                      {bookingStatusMeta[b.status].label}
                    </ToneBadge>
                  </li>
                );
              })}
            </ul>
          )}
        </ComponentCard>
      </div>

      {/* court status heatmap */}
      <div className="mt-6">
        <ComponentCard title="Court status heatmap" desc="Court utilization by hour — today (07:00–22:00)">
          <div className="overflow-x-auto custom-scrollbar">
            <div className="min-w-[760px]">
              {/* hour header */}
              <div className="mb-1 flex pl-28">
                {gridHours.map((h) => (
                  <div key={h} className="flex-1 text-center text-[10px] text-gray-400 dark:text-gray-500">
                    {String(h).padStart(2, "0")}
                  </div>
                ))}
              </div>
              {stats.activeCourts.map((c) => (
                <div key={c.id} className="mb-1 flex items-center">
                  <div className="flex w-28 items-center gap-1.5 pr-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                    <span className="truncate text-xs font-medium text-gray-600 dark:text-gray-300">{c.name}</span>
                  </div>
                  <div className="flex flex-1 gap-0.5">
                    {gridHours.map((h) => {
                      const booked = heatmap.get(`${c.id}:${h}`);
                      const peak = isPeakHour(h, false);
                      return (
                        <div
                          key={h}
                          title={`${c.name} · ${String(h).padStart(2, "0")}:00 — ${booked ? "Booked" : "Open"}`}
                          className="h-6 flex-1 rounded-sm transition-colors"
                          style={{
                            background: booked
                              ? c.color
                              : peak
                                ? "color-mix(in srgb, var(--color-primary) 8%, transparent)"
                                : "var(--surface-muted)",
                            opacity: booked ? 0.92 : 1,
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
              <div className="mt-3 flex items-center gap-4 pl-28 text-[11px] text-gray-400 dark:text-gray-500">
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-sm bg-brand-500" /> Booked
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-sm bg-[var(--surface-muted)]" /> Open
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-sm" style={{ background: "color-mix(in srgb, var(--color-primary) 8%, transparent)" }} /> Peak window
                </span>
              </div>
            </div>
          </div>
        </ComponentCard>
      </div>
    </div>
  );
}

const ClubDashboard: React.FC = () => (
  <ClubDataProvider>
    <DashboardInner />
  </ClubDataProvider>
);

export default ClubDashboard;
