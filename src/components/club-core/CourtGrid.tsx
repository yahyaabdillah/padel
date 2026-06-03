"use client";

import React, { useMemo } from "react";
import type { Court } from "@/data/padel/club/courts";
import { isPeakHour } from "@/data/padel/club/courts";
import type { Booking } from "@/data/padel/club/bookings";
import { gridHours } from "@/data/padel/club/bookings";
import { bookingTypeMeta } from "@/data/padel/club/bookings";
import { formatTime } from "./format";

interface CourtGridProps {
  courts: Court[];
  bookings: Booking[]; // already filtered to the selected day
  /** local date key YYYY-MM-DD of the displayed day */
  dateKey: string;
  isWeekend: boolean;
  onSlotClick?: (court: Court, hour: number) => void;
  onBookingClick?: (booking: Booking) => void;
}

const pad = (n: number) => String(n).padStart(2, "0");

const CourtGrid: React.FC<CourtGridProps> = ({
  courts,
  bookings,
  isWeekend,
  onSlotClick,
  onBookingClick,
}) => {
  // index bookings by court + start-hour
  const byCourtHour = useMemo(() => {
    const map = new Map<string, Booking>();
    for (const b of bookings) {
      if (b.status === "cancelled") continue;
      const startHour = new Date(b.start).getHours();
      map.set(`${b.courtId}:${startHour}`, b);
    }
    return map;
  }, [bookings]);

  // mark hours covered by a multi-hour booking (so we don't render an open slot)
  const coveredHours = useMemo(() => {
    const set = new Set<string>();
    for (const b of bookings) {
      if (b.status === "cancelled") continue;
      const sh = new Date(b.start).getHours();
      const eh = new Date(b.end).getHours();
      const em = new Date(b.end).getMinutes();
      const lastHour = em > 0 ? eh : eh - 1;
      for (let h = sh + 1; h <= lastHour; h++) set.add(`${b.courtId}:${h}`);
    }
    return set;
  }, [bookings]);

  const activeCourts = courts.filter((c) => c.status !== "inactive");

  return (
    <div className="overflow-x-auto custom-scrollbar rounded-xl border border-gray-200 dark:border-gray-800">
      <div
        className="grid min-w-[760px]"
        style={{ gridTemplateColumns: `64px repeat(${activeCourts.length}, minmax(120px, 1fr))` }}
      >
        {/* header row */}
        <div className="sticky left-0 z-10 border-b border-r border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.03]" />
        {activeCourts.map((c) => (
          <div
            key={c.id}
            className="border-b border-gray-200 bg-gray-50 px-3 py-2.5 text-center dark:border-gray-800 dark:bg-white/[0.03]"
          >
            <div className="flex items-center justify-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
              <span className="truncate text-sm font-semibold text-gray-800 dark:text-white/90">
                {c.name}
              </span>
            </div>
            <p className="mt-0.5 text-[11px] capitalize text-gray-400 dark:text-gray-500">
              {c.environment} · {c.format}
            </p>
          </div>
        ))}

        {/* time rows */}
        {gridHours.map((hour) => (
          <React.Fragment key={hour}>
            <div className="sticky left-0 z-10 flex items-start justify-end border-r border-gray-200 bg-white px-2 py-1.5 text-[11px] font-medium text-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-500">
              {pad(hour)}:00
            </div>
            {activeCourts.map((c) => {
              const key = `${c.id}:${hour}`;
              const covered = coveredHours.has(key);
              if (covered) return <div key={key} className="border-b border-l border-gray-100 dark:border-gray-800/60" />;

              const b = byCourtHour.get(key);
              const peak = isPeakHour(hour, isWeekend);
              const maintenance = c.status === "maintenance";

              if (b) {
                const meta = bookingTypeMeta[b.type];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onBookingClick?.(b)}
                    className="group relative m-0.5 flex flex-col items-start gap-0.5 rounded-lg border-l-4 px-2 py-1.5 text-left transition-all hover:shadow-theme-sm"
                    style={{
                      borderLeftColor: meta.color,
                      background: `color-mix(in srgb, ${meta.color} 14%, transparent)`,
                    }}
                  >
                    <span className="truncate text-xs font-semibold text-gray-800 dark:text-white/90">
                      {b.customer}
                    </span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">
                      {formatTime(b.start)}–{formatTime(b.end)} · {meta.label}
                    </span>
                  </button>
                );
              }

              return (
                <button
                  key={key}
                  type="button"
                  disabled={maintenance}
                  onClick={() => onSlotClick?.(c, hour)}
                  className={[
                    "group relative border-b border-l border-gray-100 transition-colors dark:border-gray-800/60",
                    maintenance
                      ? "cursor-not-allowed bg-[repeating-linear-gradient(45deg,transparent,transparent_6px,rgba(245,158,11,0.12)_6px,rgba(245,158,11,0.12)_12px)]"
                      : "hover:bg-brand-50 dark:hover:bg-brand-500/10",
                  ].join(" ")}
                >
                  {!maintenance && (
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-gray-300 opacity-0 transition-opacity group-hover:opacity-100 dark:text-gray-600">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    </span>
                  )}
                  {peak && !maintenance && (
                    <span className="pointer-events-none absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-accent-400" title="Peak hour" />
                  )}
                </button>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default CourtGrid;
