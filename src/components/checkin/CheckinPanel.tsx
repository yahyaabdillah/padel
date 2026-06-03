"use client";

import React, { useMemo, useState } from "react";
import Select from "@/components/ui/select/Select";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import { memberById, type Member } from "@/data/padel/club/members";
import { courtById } from "@/data/padel/club/courts";
import {
  validateCheckin,
  type ValidateCheckinResult,
} from "@/data/padel/club/checkin";
import type { Booking } from "@/data/padel/club/bookings";

const ClockIcon = () => (
  <svg
    className="h-4 w-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
);

const timeRange = (b: Booking) => {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  return `${fmt(b.start)}–${fmt(b.end)}`;
};

interface CheckinPanelProps {
  /** member options for the searchable select */
  options: { value: string; label: string; desc?: string }[];
  bookings: Booking[];
  now: Date;
  strict: boolean;
  /** confirm a manual check-in for the given member + (optional) booking */
  onConfirm: (args: {
    member: Member;
    result: ValidateCheckinResult;
  }) => void;
}

/**
 * CheckinPanel — the front-desk manual check-in form (MEDIUM inputs → inline
 * panel, not a modal per the project UI rule). Pick a member, see their
 * matched booking + live validation, then confirm.
 */
const CheckinPanel: React.FC<CheckinPanelProps> = ({
  options,
  bookings,
  now,
  strict,
  onConfirm,
}) => {
  const [memberId, setMemberId] = useState<string>("");

  const member = memberId ? memberById(memberId) : undefined;

  const validation = useMemo<ValidateCheckinResult | null>(() => {
    if (!memberId) return null;
    return validateCheckin({ memberId, now, bookings, strict });
  }, [memberId, now, bookings, strict]);

  const matched = validation?.booking;
  const court = matched ? courtById(matched.courtId) : undefined;

  const handleConfirm = () => {
    if (!member || !validation) return;
    onConfirm({ member, result: validation });
    setMemberId("");
  };

  return (
    <div className="space-y-4">
      <Select
        label="Cari member"
        placeholder="Ketik nama / nomor HP member…"
        options={options}
        value={memberId}
        searchable
        onChange={(v) => setMemberId(v as string)}
      />

      {member && validation && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">
                {member.name}
              </p>
              <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                {member.phone || "Tanpa nomor"}
              </p>
            </div>
            <Badge
              color={validation.ok ? "success" : "error"}
              variant="light"
              size="sm"
            >
              {validation.ok ? "Siap check-in" : "Tidak bisa check-in"}
            </Badge>
          </div>

          {matched ? (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <Badge color="primary" variant="light" size="sm">
                {court?.name ?? "Court"}
              </Badge>
              <Badge
                color="neutral"
                variant="light"
                size="sm"
                startIcon={<ClockIcon />}
              >
                {timeRange(matched)}
              </Badge>
            </div>
          ) : (
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              Tidak ada booking yang cocok hari ini.
            </p>
          )}

          {!validation.ok && validation.reason && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">
              {validation.reason}
            </p>
          )}

          <div className="mt-4">
            <Button
              size="sm"
              variant={validation.ok ? "primary" : "outline"}
              disabled={!validation.ok}
              onClick={handleConfirm}
            >
              {validation.ok ? "Konfirmasi check-in" : "Booking tidak valid"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckinPanel;
