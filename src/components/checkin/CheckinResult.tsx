"use client";

import React from "react";
import Badge from "@/components/ui/badge/Badge";
import {
  checkinMethodMeta,
  type CheckinRecord,
} from "@/data/padel/club/checkin";

/* ── tiny inline icons (no new dep) ─────────────────────────── */
const CheckCircle = () => (
  <svg
    className="h-5 w-5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <path d="m9 11 3 3L22 4" />
  </svg>
);
const XCircle = () => (
  <svg
    className="h-5 w-5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="m15 9-6 6M9 9l6 6" />
  </svg>
);

const tone: Record<
  "primary" | "info" | "warning",
  "primary" | "info" | "warning"
> = { primary: "primary", info: "info", warning: "warning" };

const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

/**
 * CheckinResult — a single check-in feed row. Shared by the front-desk log and
 * the member confirmation screen.
 */
const CheckinResult: React.FC<{ record: CheckinRecord; compact?: boolean }> = ({
  record,
  compact = false,
}) => {
  const ok = record.result === "success";
  const method = checkinMethodMeta[record.method];

  return (
    <div
      className={[
        "flex items-start gap-3 rounded-xl border p-3 transition",
        ok
          ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-500/20 dark:bg-emerald-500/10"
          : "border-red-200 bg-red-50/60 dark:border-red-500/20 dark:bg-red-500/10",
      ].join(" ")}
    >
      <span
        className={[
          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          ok
            ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
            : "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400",
        ].join(" ")}
      >
        {ok ? <CheckCircle /> : <XCircle />}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">
            {record.memberName}
          </p>
          <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">
            {timeOf(record.at)}
          </span>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <Badge size="sm" color={tone[method.tone]} variant="light">
            {method.label}
          </Badge>
          {record.courtName && (
            <Badge size="sm" color="neutral" variant="light">
              {record.courtName}
            </Badge>
          )}
          <Badge
            size="sm"
            color={ok ? "success" : "error"}
            variant="light"
          >
            {ok ? "Berhasil" : "Ditolak"}
          </Badge>
        </div>

        {!compact && !ok && record.reason && (
          <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
            {record.reason}
          </p>
        )}
      </div>
    </div>
  );
};

export default CheckinResult;
