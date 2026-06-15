"use client";

import React, { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg, DateSelectArg, EventInput } from "@fullcalendar/core";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import Button from "@/components/ui/button/Button";
import Tabs from "@/components/ui/tabs/Tabs";
import { useToast } from "@/components/ui/toast/ToastContext";
import { ClubDataProvider, useClubData } from "@/components/club-core/ClubDataContext";
import CourtGrid from "@/components/club-core/CourtGrid";
import BookingModal from "@/components/club-core/BookingModal";
import ToneBadge from "@/components/club-core/ToneBadge";
import type { Court } from "@/data/padel/club/courts";
import {
  type Booking,
  bookingTypeMeta,
  bookingStatusMeta,
} from "@/data/padel/club/bookings";

const isWeekendKey = (key: string) => {
  const d = new Date(key + "T12:00:00");
  return d.getDay() === 0 || d.getDay() === 6;
};

function BookingsInner() {
  const { courts, bookings, cancelBooking } = useClubData();
  const toast = useToast();
  const router = useRouter();
  const calendarRef = useRef<FullCalendar>(null);

  const [view, setView] = useState<"calendar" | "grid">("calendar");
  const [gridDate, setGridDate] = useState("2026-06-02");

  // BookingModal is now view/cancel only — create lives on /bookings/new (Stepper page).
  const [modalOpen, setModalOpen] = useState(false);
  const [existing, setExisting] = useState<Booking | null>(null);

  // calendar events
  const events: EventInput[] = useMemo(
    () =>
      bookings
        .filter((b) => b.status !== "cancelled")
        .map((b) => {
          const court = courts.find((c) => c.id === b.courtId);
          const meta = bookingTypeMeta[b.type];
          return {
            id: b.id,
            title: `${court?.name ?? "Court"} · ${b.customer}`,
            start: b.start,
            end: b.end,
            backgroundColor: meta.color,
            borderColor: meta.color,
            textColor: b.type === "event" ? "#1a2e05" : "#ffffff",
          };
        }),
    [bookings, courts],
  );

  // Create flow -> dedicated New Booking search page.
  const openCreate = () => router.push("/bookings/search");

  const handleSlotClick = (court: Court, hour: number) => {
    router.push(`/bookings/new?court=${court.id}&date=${gridDate}&hour=${hour}`);
  };

  const handleBookingClick = (b: Booking) => {
    setExisting(b);
    setModalOpen(true);
  };

  const handleEventClick = (arg: EventClickArg) => {
    const b = bookings.find((x) => x.id === arg.event.id);
    if (b) handleBookingClick(b);
  };

  const handleDateSelect = (sel: DateSelectArg) => {
    const d = sel.start;
    const pad = (n: number) => String(n).padStart(2, "0");
    const courtId = courts.find((c) => c.status === "active")?.id ?? "";
    const dateKey = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    router.push(`/bookings/new?court=${courtId}&date=${dateKey}&hour=${d.getHours()}`);
    sel.view.calendar.unselect();
  };

  const gridBookings = useMemo(
    () => bookings.filter((b) => b.start.startsWith(gridDate)),
    [bookings, gridDate],
  );

  const todayStats = useMemo(() => {
    const day = bookings.filter((b) => b.start.startsWith(gridDate) && b.status !== "cancelled");
    return {
      total: day.length,
      member: day.filter((b) => b.type === "member").length,
      walkIn: day.filter((b) => b.type === "walk_in").length,
      revenue: day.reduce((s, b) => s + b.price, 0),
    };
  }, [bookings, gridDate]);

  return (
    <div>
      <PageBreadcrumb pageTitle="Bookings" />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Tabs
          items={[
            { value: "calendar", label: "Calendar" },
            { value: "grid", label: "Court grid" },
          ]}
          value={view}
          onChange={(v) => setView(v as "calendar" | "grid")}
          variant="segment"
        />
        <div className="flex flex-wrap items-center gap-3">
          {/* legend */}
          <div className="hidden items-center gap-3 sm:flex">
            {Object.entries(bookingTypeMeta).map(([k, m]) => (
              <span key={k} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: m.color }} />
                {m.label}
              </span>
            ))}
          </div>
          <Button variant="primary" sheen glow onClick={openCreate} startIcon={<span className="text-base leading-none">+</span>}>
            New booking
          </Button>
        </div>
      </div>

      {view === "calendar" ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-2 dark:border-gray-800 dark:bg-white/[0.03] sm:p-4">
          <div className="custom-calendar">
            <FullCalendar
              ref={calendarRef}
              plugins={[timeGridPlugin, dayGridPlugin, listPlugin, interactionPlugin]}
              initialView="timeGridWeek"
              initialDate="2026-06-02"
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "timeGridWeek,timeGridDay,listWeek",
              }}
              slotMinTime="07:00:00"
              slotMaxTime="23:00:00"
              allDaySlot={false}
              nowIndicator
              height="auto"
              expandRows
              events={events}
              selectable
              select={handleDateSelect}
              eventClick={handleEventClick}
              slotDuration="01:00:00"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* grid day controls + day summary */}
          <ComponentCard
            title="Court grid"
            desc="Click an open slot to book, or a booking to view & cancel."
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Date</label>
                <input
                  type="date"
                  value={gridDate}
                  onChange={(e) => setGridDate(e.target.value)}
                  className="h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600 dark:bg-white/5 dark:text-gray-300">
                  {todayStats.total} bookings
                </span>
                <span className="rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                  {todayStats.member} member
                </span>
                <span className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                  {todayStats.walkIn} walk-in
                </span>
              </div>
            </div>
            <CourtGrid
              courts={courts}
              bookings={gridBookings}
              dateKey={gridDate}
              isWeekend={isWeekendKey(gridDate)}
              onSlotClick={handleSlotClick}
              onBookingClick={handleBookingClick}
            />
          </ComponentCard>

          {/* day list */}
          <ComponentCard title="Bookings list" desc={`All bookings on ${gridDate}`}>
            {gridBookings.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">No bookings on this date.</p>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {[...gridBookings]
                  .sort((a, b) => (a.start < b.start ? -1 : 1))
                  .map((b) => {
                    const court = courts.find((c) => c.id === b.courtId);
                    const tMeta = bookingTypeMeta[b.type];
                    const sMeta = bookingStatusMeta[b.status];
                    return (
                      <li
                        key={b.id}
                        onClick={() => handleBookingClick(b)}
                        className="flex cursor-pointer items-center gap-3 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.03]"
                      >
                        <span className="h-8 w-1 rounded-full" style={{ background: tMeta.color }} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">{b.customer}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            {court?.name} · {b.start.slice(11, 16)}–{b.end.slice(11, 16)}
                          </p>
                        </div>
                        <ToneBadge tone={tMeta.tone}>{tMeta.label}</ToneBadge>
                        <ToneBadge tone={sMeta.tone}>{sMeta.label}</ToneBadge>
                      </li>
                    );
                  })}
              </ul>
            )}
          </ComponentCard>
        </div>
      )}

      {/* View / cancel only — booking creation lives on /bookings/new. */}
      <BookingModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        courts={courts}
        prefill={null}
        existing={existing}
        isWeekend={isWeekendKey(gridDate)}
        onCreate={() => {}}
        onCancel={(id) => {
          cancelBooking(id);
          toast.info("Booking cancelled");
        }}
      />
    </div>
  );
}

export default function BookingsPage() {
  return (
    <ClubDataProvider>
      <BookingsInner />
    </ClubDataProvider>
  );
}
