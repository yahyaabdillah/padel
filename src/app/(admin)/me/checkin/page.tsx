"use client";

import React, { useMemo, useState } from "react";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import Switch from "@/components/ui/switch/Switch";
import StaticQrCode from "@/components/checkin/StaticQrCode";
import CheckinResult from "@/components/checkin/CheckinResult";
import { useRole } from "@/context/RoleContext";
import { useNotifications } from "@/context/NotificationContext";
import { resolveSeedMemberId } from "@/context/OnboardingContext";
import {
  STATIC_QR_TEXT,
  CHECKIN_WINDOW_MIN,
  validateCheckin,
  demoNow,
  type CheckinRecord,
} from "@/data/padel/club/checkin";
import { mockBookings, type Booking } from "@/data/padel/club/bookings";
import { memberById } from "@/data/padel/club/members";
import { courtById } from "@/data/padel/club/courts";

const genId = () =>
  `ci-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;

const timeRange = (b: Booking) => {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  return `${fmt(b.start)}–${fmt(b.end)}`;
};

type Phase = "idle" | "scanning" | "done";

export default function MemberCheckinPage() {
  const { club, currentUser } = useRole();
  const { push } = useNotifications();

  const now = demoNow;
  const memberId = resolveSeedMemberId(currentUser.id);
  const member = memberById(memberId);
  const qrText = STATIC_QR_TEXT(club.id);

  const [strict, setStrict] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [record, setRecord] = useState<CheckinRecord | null>(null);

  const validation = useMemo(
    () =>
      validateCheckin({ memberId, now, bookings: mockBookings, strict }),
    [memberId, now, strict],
  );

  const booking = validation.booking;
  const court = booking ? courtById(booking.courtId) : undefined;

  const handleScan = () => {
    setPhase("scanning");
    // simulate scanning the static front-desk QR, then resolve
    window.setTimeout(() => {
      const result = validateCheckin({
        memberId,
        now,
        bookings: mockBookings,
        strict,
      });
      const matchedCourt = result.booking
        ? courtById(result.booking.courtId)
        : undefined;
      const rec: CheckinRecord = {
        id: genId(),
        memberId,
        memberName: member?.name ?? currentUser.name,
        bookingId: result.booking?.id,
        courtName: matchedCourt?.name,
        method: "qr",
        at: now.toISOString(),
        result: result.ok ? "success" : "rejected",
        reason: result.ok ? undefined : result.reason,
      };
      setRecord(rec);
      setPhase("done");

      push({
        type: "checkin",
        title: result.ok ? "Check-in berhasil" : "Check-in ditolak",
        message: result.ok
          ? `Kamu check-in${matchedCourt ? ` di ${matchedCourt.name}` : ""}.`
          : `${result.reason}`,
        href: "/me/checkin",
      });
    }, 700);
  };

  const reset = () => {
    setPhase("idle");
    setRecord(null);
  };

  return (
    <div>
      <PageBreadCrumb pageTitle="Check-in Saya" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* booking status */}
        <ComponentCard
          title="Booking Hari Ini"
          desc="Status check-in untuk sesi kamu hari ini."
        >
          {booking ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {court?.name ?? "Court"}
                </p>
                <Badge color="primary" variant="light" size="sm">
                  {timeRange(booking)}
                </Badge>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {validation.ok
                  ? "Booking valid — siap check-in."
                  : validation.reason}
              </p>
              {!validation.ok && (
                <Badge color="warning" variant="light" size="sm">
                  Belum bisa check-in
                </Badge>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Tidak ada booking hari ini
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Pesan court dulu sebelum check-in.
              </p>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2.5 dark:bg-white/[0.03]">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                Jendela ketat (±{CHECKIN_WINDOW_MIN} menit)
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {strict ? "Aktif" : "Off — demo bisa kapan saja"}
              </p>
            </div>
            <Switch checked={strict} onChange={setStrict} />
          </div>
        </ComponentCard>

        {/* scan + confirm */}
        <ComponentCard
          title="Scan QR Front Desk"
          desc="Arahkan kamera ke QR statis di meja resepsionis."
        >
          <div className="flex flex-col items-center gap-4 text-center">
            {phase === "done" && record ? (
              <div className="w-full space-y-4">
                <CheckinResult record={record} />
                <Button size="sm" variant="outline" onClick={reset}>
                  Selesai
                </Button>
              </div>
            ) : (
              <>
                <div
                  className={
                    phase === "scanning"
                      ? "animate-pulse opacity-70"
                      : undefined
                  }
                >
                  <StaticQrCode text={qrText} size={200} />
                </div>
                <p className="break-all font-mono text-xs text-gray-400 dark:text-gray-500">
                  {qrText}
                </p>
                <Button
                  variant="primary"
                  disabled={phase === "scanning"}
                  onClick={handleScan}
                >
                  {phase === "scanning" ? "Memindai…" : "Simulasi scan & check-in"}
                </Button>
              </>
            )}
          </div>
        </ComponentCard>
      </div>
    </div>
  );
}
