"use client";

// Member ▸ Check-in. The MEMBER scans the front-desk QR with their camera, so
// this page shows NO QR code. It has just: a primary "open camera" scan button
// and a list of today's bookings that still need check-in (each with its own
// check-in button that opens the same camera). Scanning is simulated, then the
// shared validator resolves success/failure.

import React, { useMemo, useState } from "react";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import { Modal } from "@/components/ui/modal";
import CheckinResult from "@/components/checkin/CheckinResult";
import { useRole } from "@/context/RoleContext";
import { useNotifications } from "@/context/NotificationContext";
import { resolveSeedMemberId } from "@/context/OnboardingContext";
import {
  validateCheckin,
  todayKey,
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

type Phase = "scanning" | "done";

export default function MemberCheckinPage() {
  const { currentUser } = useRole();
  const { push } = useNotifications();

  const now = demoNow;
  const memberId = resolveSeedMemberId(currentUser.id);
  const member = memberById(memberId);

  // ── camera modal state ──
  const [cameraOpen, setCameraOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("scanning");
  const [record, setRecord] = useState<CheckinRecord | null>(null);
  // booking ids checked in during this session (so the list updates live)
  const [checkedIn, setCheckedIn] = useState<string[]>([]);

  // Today's member bookings still needing check-in.
  const pending = useMemo(
    () =>
      mockBookings
        .filter(
          (b) =>
            b.memberId === memberId &&
            b.start.startsWith(todayKey) &&
            b.status !== "cancelled" &&
            b.status !== "checked_in" &&
            !checkedIn.includes(b.id),
        )
        .sort((a, b) => a.start.localeCompare(b.start)),
    [memberId, checkedIn],
  );

  const openCamera = () => {
    setRecord(null);
    setPhase("scanning");
    setCameraOpen(true);
    // simulate the camera reading the front-desk QR, then resolve check-in
    window.setTimeout(() => {
      const result = validateCheckin({
        memberId,
        now,
        bookings: mockBookings,
        strict: false,
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
      if (result.ok && result.booking) {
        setCheckedIn((prev) =>
          prev.includes(result.booking!.id) ? prev : [...prev, result.booking!.id],
        );
      }
      push({
        type: "checkin",
        title: result.ok ? "Check-in berhasil" : "Check-in ditolak",
        message: result.ok
          ? `Kamu check-in${matchedCourt ? ` di ${matchedCourt.name}` : ""}.`
          : `${result.reason}`,
        href: "/me/checkin",
      });
    }, 1500);
  };

  const closeCamera = () => {
    setCameraOpen(false);
    setRecord(null);
    setPhase("scanning");
  };

  return (
    <div>
      <PageBreadCrumb pageTitle="Check-in Saya" />

      <div className="mx-auto max-w-2xl space-y-6">
        {/* Scan CTA */}
        <ComponentCard
          title="Check-in"
          desc="Scan QR di meja resepsionis pakai kamera untuk konfirmasi kedatangan."
        >
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-primary-light)] text-[var(--color-primary)]">
              <CameraIcon className="h-8 w-8" />
            </span>
            <p className="max-w-sm text-sm text-gray-500 dark:text-gray-400">
              Tekan tombol di bawah untuk membuka kamera dan memindai QR check-in
              yang ada di front desk.
            </p>
            <Button
              variant="primary"
              size="md"
              glow
              startIcon={<CameraIcon className="h-5 w-5" />}
              onClick={openCamera}
            >
              Buka Kamera & Scan
            </Button>
          </div>
        </ComponentCard>

        {/* Pending bookings */}
        <ComponentCard
          title="Booking Belum Check-in"
          desc="Sesi kamu hari ini yang masih menunggu konfirmasi kedatangan."
        >
          {pending.length > 0 ? (
            <ul className="space-y-3">
              {pending.map((b) => {
                const court = courtById(b.courtId);
                return (
                  <li
                    key={b.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">
                        {court?.name ?? "Court"}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Badge color="primary" variant="light" size="sm">
                          {timeRange(b)}
                        </Badge>
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          Belum check-in
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      startIcon={<CameraIcon className="h-4 w-4" />}
                      onClick={openCamera}
                    >
                      Check in
                    </Button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Tidak ada booking yang perlu check-in
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Semua sesi hari ini sudah check-in, atau kamu belum punya booking.
              </p>
            </div>
          )}
        </ComponentCard>
      </div>

      {/* Camera modal */}
      <Modal isOpen={cameraOpen} onClose={closeCamera} className="max-w-md p-6">
        {phase === "scanning" ? (
          <div className="flex flex-col items-center gap-5 text-center">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Memindai QR…
            </h3>
            {/* faux camera viewport */}
            <div className="relative aspect-square w-full max-w-[260px] overflow-hidden rounded-2xl bg-gray-900">
              <div className="absolute inset-0 flex items-center justify-center">
                <CameraIcon className="h-12 w-12 text-white/30" />
              </div>
              {/* scan frame */}
              <div className="absolute inset-8 rounded-xl border-2 border-white/70" />
              {/* scan line */}
              <div className="animate-qr-scan absolute inset-x-8 top-8 h-0.5 bg-[var(--color-primary)] shadow-[0_0_12px_var(--color-primary)]" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Arahkan kamera ke QR di meja front desk.
            </p>
            <Button variant="ghost" size="sm" onClick={closeCamera}>
              Batal
            </Button>
          </div>
        ) : record ? (
          <div className="space-y-4">
            <h3 className="text-center text-lg font-semibold text-gray-800 dark:text-white/90">
              {record.result === "success" ? "Check-in Berhasil" : "Check-in Ditolak"}
            </h3>
            <CheckinResult record={record} />
            <div className="flex justify-end gap-2">
              {record.result === "rejected" && (
                <Button variant="outline" size="sm" onClick={openCamera}>
                  Coba lagi
                </Button>
              )}
              <Button variant="primary" size="sm" onClick={closeCamera}>
                Selesai
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

const CameraIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);
