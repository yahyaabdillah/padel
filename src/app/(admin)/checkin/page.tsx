"use client";

import React, { useMemo, useState } from "react";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import Switch from "@/components/ui/switch/Switch";
import Select from "@/components/ui/select/Select";
import TextInput from "@/components/ui/input/TextInput";
import StaticQrCode from "@/components/checkin/StaticQrCode";
import CheckinPanel from "@/components/checkin/CheckinPanel";
import CheckinResult from "@/components/checkin/CheckinResult";
import { useRole } from "@/context/RoleContext";
import { useNotifications } from "@/context/NotificationContext";
import {
  STATIC_QR_TEXT,
  CHECKIN_WINDOW_MIN,
  demoNow,
  mockCheckins,
  type CheckinRecord,
} from "@/data/padel/club/checkin";
import { mockBookings, type Booking } from "@/data/padel/club/bookings";
import { mockMembers, type Member } from "@/data/padel/club/members";
import { courtById, mockCourts } from "@/data/padel/club/courts";
import type { ValidateCheckinResult } from "@/data/padel/club/checkin";

const genId = () =>
  `ci-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;

/* Members eligible for the manual search (exclude one-time daily walk-ins). */
const rosterOptions = mockMembers
  .filter((m) => !m.isDaily)
  .map((m) => ({ value: m.id, label: m.name, desc: m.phone }));

export default function CheckinPage() {
  const { club } = useRole();
  const { push } = useNotifications();

  const now = demoNow;
  const qrText = STATIC_QR_TEXT(club.id);

  const [strict, setStrict] = useState(false);
  const [log, setLog] = useState<CheckinRecord[]>(mockCheckins);

  // local walk-in roster created at the desk (kept out of the shared seed)
  const [walkInMembers, setWalkInMembers] = useState<Member[]>([]);
  const [walkInName, setWalkInName] = useState("");
  const [walkInCourt, setWalkInCourt] = useState("");

  const activeCourts = useMemo(
    () => mockCourts.filter((c) => c.status === "active"),
    [],
  );
  const bookings: Booking[] = mockBookings;

  const successCount = log.filter((r) => r.result === "success").length;
  const rejectCount = log.filter((r) => r.result === "rejected").length;

  /* ── manual member check-in (from CheckinPanel) ───────────── */
  const handleManualConfirm = ({
    member,
    result,
  }: {
    member: Member;
    result: ValidateCheckinResult;
  }) => {
    const court = result.booking
      ? courtById(result.booking.courtId)
      : undefined;
    const record: CheckinRecord = {
      id: genId(),
      memberId: member.id,
      memberName: member.name,
      bookingId: result.booking?.id,
      courtName: court?.name,
      method: "manual",
      at: now.toISOString(),
      result: result.ok ? "success" : "rejected",
      reason: result.ok ? undefined : result.reason,
    };
    setLog((prev) => [record, ...prev]);

    if (result.ok) {
      push({
        type: "checkin",
        title: "Check-in berhasil",
        message: `${member.name} check-in${
          court ? ` di ${court.name}` : ""
        }.`,
        href: "/checkin",
      });
    } else {
      push({
        type: "checkin",
        title: "Check-in ditolak",
        message: `${member.name}: ${record.reason}`,
        href: "/checkin",
      });
    }
  };

  /* ── daily walk-in quick action ───────────────────────────── */
  const handleWalkIn = () => {
    const name = walkInName.trim();
    if (!name) return;
    const court = walkInCourt ? courtById(walkInCourt) : undefined;

    const member: Member = {
      id: `mbr-w${Date.now().toString(36).slice(-4)}`,
      name,
      email: "",
      phone: "",
      avatar: "/images/user/user-13.jpg",
      tier: "daily",
      status: "active",
      walletBalance: 0,
      rating: 1000,
      position: "both",
      joinedAt: now.toISOString().slice(0, 10),
      lastVisit: now.toISOString().slice(0, 10),
      totalBookings: 1,
      totalSpend: 0,
      matchesPlayed: 0,
      wins: 0,
      city: club.city,
      history: [],
      onboarded: false,
      isDaily: true,
    };
    setWalkInMembers((prev) => [member, ...prev]);

    const record: CheckinRecord = {
      id: genId(),
      memberId: member.id,
      memberName: member.name,
      courtName: court?.name,
      method: "walkin",
      at: now.toISOString(),
      result: "success",
    };
    setLog((prev) => [record, ...prev]);

    push({
      type: "checkin",
      title: "Walk-in check-in",
      message: `${name} (harian) check-in${
        court ? ` di ${court.name}` : ""
      }.`,
      href: "/checkin",
    });

    setWalkInName("");
    setWalkInCourt("");
  };

  return (
    <div>
      <PageBreadCrumb pageTitle="Check-in" />

      {/* stat strip */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Check-in hari ini" value={successCount} tone="success" />
        <StatCard label="Ditolak" value={rejectCount} tone="error" />
        <StatCard
          label="Walk-in baru"
          value={walkInMembers.length}
          tone="warning"
        />
        <StatCard
          label="Jendela ketat"
          value={`±${CHECKIN_WINDOW_MIN}m`}
          tone="neutral"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* LEFT — static QR */}
        <ComponentCard
          title="QR Check-in Statis"
          desc="Tempel di front desk. Member scan dari aplikasi untuk check-in mandiri."
          className="lg:col-span-1"
        >
          <div className="flex flex-col items-center gap-4 text-center">
            <StaticQrCode text={qrText} size={220} />
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                {club.name}
              </p>
              <p className="mt-0.5 break-all font-mono text-xs text-gray-500 dark:text-gray-400">
                {qrText}
              </p>
            </div>
            <Badge color="primary" variant="light" size="sm">
              Berlaku selama jam operasional
            </Badge>
          </div>
        </ComponentCard>

        {/* MIDDLE — manual + walk-in */}
        <div className="space-y-6 lg:col-span-1">
          <ComponentCard
            title="Check-in Manual"
            desc="Cari member dan validasi booking-nya."
          >
            <div className="mb-4 flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2.5 dark:bg-white/[0.03]">
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  Jendela ketat (±{CHECKIN_WINDOW_MIN} menit)
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {strict
                    ? "Hanya booking yang mulai dalam jendela"
                    : "Off — demo bisa check-in kapan saja"}
                </p>
              </div>
              <Switch checked={strict} onChange={setStrict} />
            </div>

            <CheckinPanel
              options={rosterOptions}
              bookings={bookings}
              now={now}
              strict={strict}
              onConfirm={handleManualConfirm}
            />
          </ComponentCard>

          <ComponentCard
            title="Walk-in Harian"
            desc="Tamu sekali main — daftar cepat + langsung check-in."
          >
            <div className="space-y-4">
              <TextInput
                label="Nama tamu"
                placeholder="cth. Tegar Saputra"
                value={walkInName}
                onChange={setWalkInName}
              />
              <Select
                label="Court (opsional)"
                placeholder="Pilih court…"
                searchable
                options={activeCourts.map((c) => ({
                  value: c.id,
                  label: c.name,
                }))}
                value={walkInCourt}
                onChange={(v) => setWalkInCourt(v as string)}
              />
              <Button
                size="sm"
                variant="primary"
                disabled={!walkInName.trim()}
                onClick={handleWalkIn}
              >
                Daftar &amp; check-in
              </Button>
            </div>
          </ComponentCard>
        </div>

        {/* RIGHT — today's log */}
        <ComponentCard
          title="Log Check-in Hari Ini"
          desc={`${log.length} aktivitas`}
          className="lg:col-span-1"
        >
          {log.length === 0 ? (
            <EmptyLog />
          ) : (
            <div className="max-h-[560px] space-y-2.5 overflow-y-auto pr-1">
              {log.map((record) => (
                <CheckinResult key={record.id} record={record} />
              ))}
            </div>
          )}
        </ComponentCard>
      </div>
    </div>
  );
}

const toneStyles: Record<
  "success" | "error" | "warning" | "neutral",
  string
> = {
  success: "text-emerald-600 dark:text-emerald-400",
  error: "text-red-600 dark:text-red-400",
  warning: "text-amber-600 dark:text-amber-400",
  neutral: "text-gray-700 dark:text-gray-300",
};

const StatCard: React.FC<{
  label: string;
  value: React.ReactNode;
  tone: "success" | "error" | "warning" | "neutral";
}> = ({ label, value, tone }) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
    <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
    <p className={`mt-1 text-2xl font-semibold ${toneStyles[tone]}`}>{value}</p>
  </div>
);

const EmptyLog: React.FC = () => (
  <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-white/5">
      <svg
        className="h-6 w-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    </span>
    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
      Belum ada check-in
    </p>
    <p className="text-xs text-gray-500 dark:text-gray-400">
      Check-in member atau walk-in akan muncul di sini.
    </p>
  </div>
);
