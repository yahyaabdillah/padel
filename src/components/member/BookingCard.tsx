"use client";

import React from "react";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import {
  idr,
  prettyDate,
  type MemberBooking,
  bookingStatusMeta,
  bookingKindMeta,
} from "@/data/padel/member";

interface BookingCardProps {
  booking: MemberBooking;
  onCancel?: (b: MemberBooking) => void;
  className?: string;
}

const BookingCard: React.FC<BookingCardProps> = ({ booking, onCancel, className = "" }) => {
  const statusMeta = bookingStatusMeta[booking.status];
  const kindMeta = bookingKindMeta[booking.kind];
  const canCancel = booking.status === "confirmed" || booking.status === "pending";

  return (
    <div
      className={`flex flex-col gap-4 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-4 transition-all duration-300 hover:shadow-theme-md sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-[var(--color-primary-light)] text-[var(--color-primary)]">
          <span className="text-lg font-bold leading-none">
            {new Date(booking.date + "T00:00:00").getDate()}
          </span>
          <span className="text-[10px] uppercase tracking-wide">
            {new Date(booking.date + "T00:00:00").toLocaleDateString("en-US", { month: "short" })}
          </span>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="truncate font-semibold text-[var(--text-heading)]">{booking.courtName}</h4>
            <Badge size="sm" variant="light" color="neutral">
              {booking.zone}
            </Badge>
          </div>
          <p className="mt-0.5 text-sm text-[var(--text-caption)]">
            {kindMeta.icon} {kindMeta.label} · {prettyDate(booking.date)} · {booking.startTime}–{booking.endTime}
          </p>
          <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
            {booking.partners.join(", ")}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:justify-center">
        <div className="text-right">
          <Badge size="sm" variant="light" color={statusMeta.tone === "neutral" ? "neutral" : statusMeta.tone}>
            {statusMeta.label}
          </Badge>
          <p className="mt-1 text-sm font-semibold text-[var(--text-heading)]">{idr(booking.price)}</p>
          <p className="text-[11px] text-[var(--text-muted)]">{booking.ref} · {booking.paidWith}</p>
        </div>
        {canCancel && onCancel && (
          <Button size="sm" variant="ghost" onClick={() => onCancel(booking)}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
};

export default BookingCard;
