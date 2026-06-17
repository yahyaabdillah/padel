"use client";

// Member ▸ Check-in (DB-backed). Direction follows the company "Staff scan
// booking" toggle:
//   ON  → this page DISPLAYS a signed booking-token QR for staff to scan.
//   OFF → this page shows a "Scan" button that opens the camera so the member
//         can scan the front-desk QR and self-check-in.

import React, { useCallback, useEffect, useState } from "react";
import { CalendarClock, History, MapPin } from "lucide-react";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import Tabs from "@/components/ui/tabs/Tabs";
import { Modal } from "@/components/ui/modal";
import RealQrCode from "@/components/checkin/RealQrCode";
import CameraScanner from "@/components/checkin/CameraScanner";
import { useToast } from "@/components/ui/toast/ToastContext";
import {
  getMyCheckinViewAction,
  mySelfCheckinAction,
  getMyBookingsAction,
  type MyCheckinView,
  type MyCheckinResult,
  type MyBookingsData,
  type MyBookingRow,
} from "./actions";

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });

const idr = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

type StatusMeta = { label: string; color: "success" | "primary" | "warning" | "error" | "neutral" };
const STATUS_META: Record<string, StatusMeta> = {
  confirmed: { label: "Terkonfirmasi", color: "primary" },
  checked_in: { label: "Sudah check-in", color: "success" },
  completed: { label: "Selesai", color: "neutral" },
  cancelled: { label: "Dibatalkan", color: "error" },
  pending: { label: "Menunggu", color: "warning" },
};

export default function MemberCheckinPage() {
  const toast = useToast();
  const [view, setView] = useState<MyCheckinView | null>(null);
  const [bookings, setBookings] = useState<MyBookingsData>({ upcoming: [], history: [] });
  const [loading, setLoading] = useState(true);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [bookingTab, setBookingTab] = useState<"upcoming" | "history">("upcoming");

  const load = useCallback(async () => {
    const [v, b] = await Promise.all([getMyCheckinViewAction(), getMyBookingsAction()]);
    setView(v);
    setBookings(b);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleScan = useCallback(
    async (text: string) => {
      if (busy) return;
      setBusy(true);
      const res = await mySelfCheckinAction(text);
      setBusy(false);
      setCameraOpen(false);
      report(res, toast);
      if (res.success) void load();
    },
    [busy, load, toast],
  );

  return (
    <div>
      <PageBreadCrumb pageTitle="Check-in Saya" />
      <div className="mx-auto max-w-2xl space-y-6">
        {loading || !view ? (
          <div className="h-64 animate-pulse rounded-2xl bg-[var(--surface-muted)]" />
        ) : !view.hasBookingToday ? (
          <ComponentCard title="Check-in" desc="Kamu belum punya booking hari ini.">
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <p className="text-sm font-medium text-[var(--text-body)]">
                Tidak ada booking untuk check-in
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                Booking lapangan dulu, lalu kembali ke sini saat hari main.
              </p>
            </div>
          </ComponentCard>
        ) : view.scanStaffBooking ? (
          /* ── member DISPLAYS QR for staff to scan ── */
          <ComponentCard
            title="Tunjukkan QR ini ke Staff"
            desc="Staff akan memindai QR ini untuk check-in booking kamu."
          >
            <div className="flex flex-col items-center gap-4 py-2 text-center">
              {view.booking?.alreadyCheckedIn ? (
                <Badge color="success" variant="light" size="md">
                  Sudah check-in
                </Badge>
              ) : view.bookingToken ? (
                <RealQrCode text={view.bookingToken} size={240} />
              ) : null}
              <BookingSummary booking={view.booking} />
            </div>
          </ComponentCard>
        ) : (
          /* ── member SCANS the front-desk QR ── */
          <ComponentCard
            title="Check-in"
            desc="Scan QR di meja resepsionis pakai kamera untuk konfirmasi kedatangan."
          >
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <BookingSummary booking={view.booking} />
              {view.booking?.alreadyCheckedIn ? (
                <Badge color="success" variant="light" size="md">
                  Sudah check-in
                </Badge>
              ) : (
                <Button variant="primary" size="md" glow onClick={() => setCameraOpen(true)}>
                  Buka Kamera & Scan
                </Button>
              )}
            </div>
          </ComponentCard>
        )}

        {/* ── Booking: aktif + riwayat (tab) ── */}
        {!loading && (
          <ComponentCard title="Booking Saya" desc="Booking aktif & riwayat.">
            <Tabs
              variant="segment"
              fullWidth
              className="mb-4"
              value={bookingTab}
              onChange={(v) => setBookingTab(v as "upcoming" | "history")}
              items={[
                {
                  value: "upcoming",
                  label: "Aktif",
                  icon: <CalendarClock className="h-4 w-4" />,
                  badge: bookings.upcoming.length || undefined,
                },
                {
                  value: "history",
                  label: "Riwayat",
                  icon: <History className="h-4 w-4" />,
                  badge: bookings.history.length || undefined,
                },
              ]}
            />

            {bookingTab === "upcoming" ? (
              bookings.upcoming.length === 0 ? (
                <EmptyRow icon={<CalendarClock className="h-5 w-5" />} text="Tidak ada booking aktif." />
              ) : (
                <ul className="space-y-2.5">
                  {bookings.upcoming.map((b) => (
                    <BookingItem key={b.id} row={b} />
                  ))}
                </ul>
              )
            ) : bookings.history.length === 0 ? (
              <EmptyRow icon={<History className="h-5 w-5" />} text="Belum ada riwayat booking." />
            ) : (
              <ul className="space-y-2.5">
                {bookings.history.map((b) => (
                  <BookingItem key={b.id} row={b} muted />
                ))}
              </ul>
            )}
          </ComponentCard>
        )}
      </div>

      <Modal isOpen={cameraOpen} onClose={() => setCameraOpen(false)} className="max-w-md p-6">
        <div className="space-y-4">
          <h3 className="text-center text-lg font-semibold text-[var(--text-heading)]">
            {busy ? "Memproses…" : "Pindai QR Front Desk"}
          </h3>
          <CameraScanner onDecode={handleScan} />
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => setCameraOpen(false)}>
              Batal
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

const BookingItem: React.FC<{ row: MyBookingRow; muted?: boolean }> = ({ row, muted }) => {
  const meta = STATUS_META[row.status] ?? { label: row.status, color: "neutral" as const };
  return (
    <li
      className={[
        "flex items-center justify-between gap-3 rounded-xl border border-[var(--border-default)] p-3",
        muted ? "bg-[var(--surface-muted)]/40" : "bg-[var(--surface-card)]",
      ].join(" ")}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" />
          <p className="truncate text-sm font-medium text-[var(--text-heading)]">
            {row.courtName ?? "Court"}
            {row.lines > 1 ? ` +${row.lines - 1}` : ""}
          </p>
        </div>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          {fmtDate(row.start)} · {fmtTime(row.start)}–{fmtTime(row.end)}
          {row.totalPrice > 0 ? ` · ${idr(row.totalPrice)}` : ""}
        </p>
      </div>
      <Badge color={meta.color} variant="light" size="sm">
        {meta.label}
      </Badge>
    </li>
  );
};

const EmptyRow: React.FC<{ icon: React.ReactNode; text: string }> = ({ icon, text }) => (
  <div className="flex flex-col items-center gap-2 py-8 text-center">
    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--text-muted)]">
      {icon}
    </span>
    <p className="text-xs text-[var(--text-muted)]">{text}</p>
  </div>
);

const BookingSummary: React.FC<{ booking: MyCheckinView["booking"] }> = ({ booking }) => {
  if (!booking) return null;
  return (
    <div className="text-center">
      <p className="text-sm font-medium text-[var(--text-heading)]">
        {booking.courtName ?? "Court"}
      </p>
      <Badge color="primary" variant="light" size="sm">
        {fmtTime(booking.start)}–{fmtTime(booking.end)}
      </Badge>
    </div>
  );
};

function report(res: MyCheckinResult, toast: ReturnType<typeof useToast>) {
  if (!res.success) {
    toast.error(res.error || "Gagal check-in.");
    return;
  }
  if (res.alreadyCheckedIn) {
    toast.info("Kamu sudah check-in sebelumnya.", "Sudah check-in");
    return;
  }
  if (res.result === "success") {
    toast.success(
      `Check-in berhasil${res.courtName ? ` di ${res.courtName}` : ""}.`,
      "Berhasil",
    );
  } else {
    toast.error(res.reason ?? "Check-in ditolak.", "Ditolak");
  }
}
