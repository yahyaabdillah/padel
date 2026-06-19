"use client";

// Member ▸ My Bookings (DB-backed). Lists the member's upcoming + past
// bookings with per-session detail. A future, not-yet-cancelled session can be
// cancelled here (no monetary refund — quota is restored and the slot freed).

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import Tabs from "@/components/ui/tabs/Tabs";
import { ModalDialog } from "@/components/ui/modal";
import EmptyState from "@/components/ui/feedback/EmptyState";
import { useToast } from "@/components/ui/toast/ToastContext";
import { PlusIcon } from "@/components/member/icons";
import {
  getMyBookingsAction,
  type MyBookingsData,
  type MyBookingRow,
} from "../checkin/actions";
import { cancelMyBookingAction } from "../book/actions";

const idr = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { weekday: "short", day: "2-digit", month: "short" });
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

const STATUS_META: Record<string, { label: string; color: "success" | "primary" | "warning" | "error" | "neutral" }> = {
  confirmed: { label: "Terkonfirmasi", color: "primary" },
  checked_in: { label: "Sudah check-in", color: "success" },
  completed: { label: "Selesai", color: "neutral" },
  cancelled: { label: "Dibatalkan", color: "error" },
  pending: { label: "Menunggu", color: "warning" },
};

type CancelTarget = { detailId: string; label: string };

export default function MyBookingsPage() {
  const toast = useToast();
  const [data, setData] = useState<MyBookingsData>({ upcoming: [], history: [] });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("upcoming");
  const [toCancel, setToCancel] = useState<CancelTarget | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await getMyBookingsAction());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const confirmCancel = async () => {
    if (!toCancel || saving) return;
    setSaving(true);
    const res = await cancelMyBookingAction(toCancel.detailId);
    setSaving(false);
    if (!res.success) {
      toast.error(res.error || "Gagal membatalkan booking.");
      return;
    }
    toast.success("Sesi dibatalkan.", "Berhasil");
    setToCancel(null);
    void load();
  };

  const list = tab === "upcoming" ? data.upcoming : data.history;

  const renderBooking = (b: MyBookingRow, allowCancel: boolean) => {
    const meta = STATUS_META[b.status] ?? STATUS_META.confirmed;
    return (
      <div
        key={b.id}
        className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-4"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-[var(--text-heading)]">
              {b.courtName ?? "Booking"}
              {b.lines > 1 && <span className="text-[var(--text-muted)]"> +{b.lines - 1} sesi</span>}
            </p>
            <p className="text-xs text-[var(--text-muted)]">{fmtDate(b.start)}</p>
          </div>
          <Badge variant="light" color={meta.color} size="sm">
            {meta.label}
          </Badge>
        </div>

        <ul className="mt-3 space-y-1.5 border-t border-[var(--border-light)] pt-3">
          {b.sessions.map((s) => {
            const future = new Date(s.start).getTime() > Date.now();
            const cancellable = allowCancel && future && s.status !== "cancelled";
            const sm = STATUS_META[s.status] ?? STATUS_META.confirmed;
            return (
              <li key={s.detailId} className="flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <span className="text-[var(--text-body)]">
                    {s.courtName ?? "—"} · {fmtTime(s.start)}–{fmtTime(s.end)}
                  </span>
                  {s.status === "cancelled" && (
                    <Badge variant="light" color="error" size="sm" className="ml-2">
                      {sm.label}
                    </Badge>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-[var(--text-muted)]">
                    {s.price === 0 ? "Gratis" : idr(s.price)}
                  </span>
                  {cancellable && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="!px-2 !text-rose-500"
                      onClick={() =>
                        setToCancel({
                          detailId: s.detailId,
                          label: `${s.courtName ?? ""} ${fmtDate(s.start)} ${fmtTime(s.start)}`,
                        })
                      }
                    >
                      Batalkan
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <div className="mt-3 flex items-center justify-between border-t border-[var(--border-light)] pt-3 text-sm">
          <span className="text-[var(--text-caption)]">Total</span>
          <span className="font-semibold text-[var(--text-heading)]">{idr(b.totalPrice)}</span>
        </div>
      </div>
    );
  };

  return (
    <div>
      <PageBreadCrumb pageTitle="Booking Saya" />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Tabs
          variant="segment"
          items={[
            { value: "upcoming", label: "Mendatang", badge: data.upcoming.length },
            { value: "history", label: "Riwayat", badge: data.history.length },
          ]}
          value={tab}
          onChange={setTab}
        />
        <Link href="/me/book">
          <Button size="sm" startIcon={<PlusIcon className="h-4 w-4" />}>
            Booking baru
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-[var(--surface-muted)]" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)]">
          <EmptyState
            title={tab === "upcoming" ? "Belum ada booking mendatang" : "Belum ada riwayat"}
            description={
              tab === "upcoming"
                ? "Pesan lapangan dan akan muncul di sini."
                : "Sesi yang selesai dan dibatalkan akan muncul di sini."
            }
            action={
              tab === "upcoming" ? (
                <Link href="/me/book">
                  <Button size="sm">Booking lapangan</Button>
                </Link>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="space-y-3">{list.map((b) => renderBooking(b, tab === "upcoming"))}</div>
      )}

      <ModalDialog
        isOpen={!!toCancel}
        onClose={() => setToCancel(null)}
        title="Batalkan sesi ini?"
        description={toCancel ? toCancel.label : ""}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setToCancel(null)} disabled={saving}>
              Jangan batalkan
            </Button>
            <Button
              className="!bg-rose-500 hover:!bg-rose-600"
              onClick={confirmCancel}
              disabled={saving}
            >
              {saving ? "Memproses…" : "Ya, batalkan"}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-[var(--text-caption)]">
          Sesi akan dibatalkan dan slot dilepas. Kuota gratis (jika dipakai) dikembalikan. Tidak ada
          pengembalian dana untuk pembayaran non-tunai.
        </p>
      </ModalDialog>
    </div>
  );
}
