"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ModalDialog } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import ToneBadge from "./ToneBadge";
import { formatIDR, formatTimeRange, formatDate } from "./format";
import type { Court } from "@/data/padel/club/courts";
import { isPeakHour } from "@/data/padel/club/courts";
import {
  type Booking,
  type BookingType,
  bookingTypeMeta,
  bookingStatusMeta,
} from "@/data/padel/club/bookings";
import { mockMembers } from "@/data/padel/club/members";

const inputCls =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800";
const labelCls = "mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  courts: Court[];
  /** prefill when opening from a grid slot */
  prefill?: { courtId: string; hour: number; dateKey: string } | null;
  /** existing booking to view/cancel */
  existing?: Booking | null;
  isWeekend: boolean;
  onCreate: (booking: Omit<Booking, "id">) => void;
  onCancel: (id: string) => void;
}

const pad = (n: number) => String(n).padStart(2, "0");

const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  courts,
  prefill,
  existing,
  isWeekend,
  onCreate,
  onCancel,
}) => {
  const activeCourts = courts.filter((c) => c.status === "active");
  const [courtId, setCourtId] = useState(activeCourts[0]?.id ?? "");
  const [date, setDate] = useState("2026-06-02");
  const [hour, setHour] = useState(18);
  const [duration, setDuration] = useState(60);
  const [type, setType] = useState<BookingType>("member");
  const [memberId, setMemberId] = useState(mockMembers[0]?.id ?? "");
  const [walkInName, setWalkInName] = useState("");

  useEffect(() => {
    if (prefill) {
      setCourtId(prefill.courtId);
      setHour(prefill.hour);
      setDate(prefill.dateKey);
    }
  }, [prefill]);

  const court = courts.find((c) => c.id === courtId);

  const price = useMemo(() => {
    if (!court) return 0;
    const rate = isPeakHour(hour, isWeekend) ? court.pricePeak : court.priceOffPeak;
    return Math.round((rate * duration) / 60);
  }, [court, hour, duration, isWeekend]);

  const handleCreate = () => {
    if (!court) return;
    const startIso = `${date}T${pad(hour)}:00:00`;
    const endHour = hour + Math.floor(duration / 60);
    const endMin = duration % 60;
    const endIso = `${date}T${pad(endHour)}:${pad(endMin)}:00`;
    const member = mockMembers.find((m) => m.id === memberId);
    onCreate({
      courtId,
      start: startIso,
      end: endIso,
      type,
      status: "confirmed",
      customer:
        type === "member"
          ? (member?.name ?? "Member")
          : type === "walk_in"
            ? walkInName || "Walk-in Guest"
            : type === "coaching"
              ? "Coaching session"
              : "Open Play",
      memberId: type === "member" ? memberId : undefined,
      partySize: court.format === "single" ? 2 : 4,
      price,
      createdBy: "Front desk",
    });
    onClose();
  };

  // ── VIEW EXISTING ──────────────────────────────────────
  if (existing) {
    const court = courts.find((c) => c.id === existing.courtId);
    const meta = bookingTypeMeta[existing.type];
    const sMeta = bookingStatusMeta[existing.status];
    return (
      <ModalDialog
        isOpen={isOpen}
        onClose={onClose}
        title="Booking details"
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            {existing.status !== "cancelled" && existing.status !== "completed" && (
              <Button
                variant="primary"
                className="!bg-red-500 hover:!bg-red-600"
                onClick={() => {
                  onCancel(existing.id);
                  onClose();
                }}
              >
                Cancel booking
              </Button>
            )}
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span
              className="flex h-12 w-12 items-center justify-center rounded-xl text-sm font-bold text-white"
              style={{ background: meta.color }}
            >
              {court?.name.slice(0, 2).toUpperCase()}
            </span>
            <div>
              <p className="text-base font-semibold text-gray-900 dark:text-white">{existing.customer}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{court?.name}</p>
            </div>
            <div className="ml-auto flex flex-col items-end gap-1">
              <ToneBadge tone={meta.tone}>{meta.label}</ToneBadge>
              <ToneBadge tone={sMeta.tone}>{sMeta.label}</ToneBadge>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-3 rounded-xl bg-gray-50 p-4 text-sm dark:bg-white/[0.03]">
            <div>
              <dt className="text-gray-400 dark:text-gray-500">Date</dt>
              <dd className="font-medium text-gray-800 dark:text-white/90">{formatDate(existing.start)}</dd>
            </div>
            <div>
              <dt className="text-gray-400 dark:text-gray-500">Time</dt>
              <dd className="font-medium text-gray-800 dark:text-white/90">{formatTimeRange(existing.start, existing.end)}</dd>
            </div>
            <div>
              <dt className="text-gray-400 dark:text-gray-500">Party size</dt>
              <dd className="font-medium text-gray-800 dark:text-white/90">{existing.partySize} players</dd>
            </div>
            <div>
              <dt className="text-gray-400 dark:text-gray-500">Total</dt>
              <dd className="font-semibold text-brand-600 dark:text-brand-400">{formatIDR(existing.price)}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-gray-400 dark:text-gray-500">Booked by</dt>
              <dd className="font-medium text-gray-800 dark:text-white/90">{existing.createdBy}</dd>
            </div>
            {existing.note && (
              <div className="col-span-2">
                <dt className="text-gray-400 dark:text-gray-500">Note</dt>
                <dd className="font-medium text-gray-800 dark:text-white/90">{existing.note}</dd>
              </div>
            )}
          </dl>
        </div>
      </ModalDialog>
    );
  }

  // ── CREATE ─────────────────────────────────────────────
  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title="New booking"
      description="Reserve a court slot — walk-in or member."
      size="lg"
      footer={
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm">
            <span className="text-gray-400 dark:text-gray-500">Total · </span>
            <span className="text-base font-bold text-brand-600 dark:text-brand-400">{formatIDR(price)}</span>
            {court && (
              <span className="ml-2 text-xs text-gray-400">
                {isPeakHour(hour, isWeekend) ? "Peak rate" : "Off-peak rate"}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" sheen onClick={handleCreate}>
              Confirm booking
            </Button>
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <span className={labelCls}>Booking type</span>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(bookingTypeMeta) as BookingType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={[
                  "rounded-full px-3.5 py-1.5 text-sm font-medium transition-all",
                  type === t
                    ? "text-white shadow-theme-xs"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10",
                ].join(" ")}
                style={type === t ? { background: bookingTypeMeta[t].color } : undefined}
              >
                {bookingTypeMeta[t].label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelCls}>Court</label>
          <select className={inputCls} value={courtId} onChange={(e) => setCourtId(e.target.value)}>
            {activeCourts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.environment}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>Date</label>
          <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <div>
          <label className={labelCls}>Start time</label>
          <select className={inputCls} value={hour} onChange={(e) => setHour(Number(e.target.value))}>
            {Array.from({ length: 16 }, (_, i) => i + 7).map((h) => (
              <option key={h} value={h}>
                {pad(h)}:00 {isPeakHour(h, isWeekend) ? "· peak" : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>Duration</label>
          <select className={inputCls} value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
            <option value={60}>60 minutes</option>
            <option value={90}>90 minutes</option>
            <option value={120}>120 minutes</option>
          </select>
        </div>

        {type === "member" ? (
          <div className="sm:col-span-2">
            <label className={labelCls}>Member</label>
            <select className={inputCls} value={memberId} onChange={(e) => setMemberId(e.target.value)}>
              {mockMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} · {m.tier} · {formatIDR(m.walletBalance, true)} wallet
                </option>
              ))}
            </select>
          </div>
        ) : type === "walk_in" ? (
          <div className="sm:col-span-2">
            <label className={labelCls}>Guest name</label>
            <input
              type="text"
              className={inputCls}
              placeholder="e.g. Arif (group of 4)"
              value={walkInName}
              onChange={(e) => setWalkInName(e.target.value)}
            />
          </div>
        ) : null}
      </div>
    </ModalDialog>
  );
};

export default BookingModal;
