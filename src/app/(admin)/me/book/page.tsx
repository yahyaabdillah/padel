"use client";

// Member ▸ Book a Court (DB-backed). Calendar grid: columns = courts, rows =
// hours. Tap an open slot → modal to pick duration + non-cash payment (QRIS /
// Transfer; cash is staff-only) → confirm. Booking is persisted with status
// "confirmed" for the logged-in member (no member-picker step). Membership
// quota/discount is applied automatically.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import { ModalDialog } from "@/components/ui/modal";
import InputLabel from "@/components/ui/input/InputLabel";
import DatePicker from "@/components/ui/datepicker/DatePicker";
import { useToast } from "@/components/ui/toast/ToastContext";
import { CheckIcon, ClockIcon } from "@/components/member/icons";
import {
  getMeBookDataAction,
  getMeOccupancyAction,
  createMyBookingAction,
} from "./actions";
import {
  MEMBER_PAYMENT_METHODS,
  type MeBookData,
  type MeCourt,
  type MemberPaymentMethod,
} from "./types";

const pad2 = (n: number) => String(n).padStart(2, "0");
const toKey = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const idr = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

const prettyDate = (key: string) =>
  new Date(`${key}T00:00:00`).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

/** Bookable whole-hours derived from a court's day schedule (non-closed). */
function courtHoursForDay(court: MeCourt, day: number): { hour: number; peak: boolean }[] {
  const sched = court.schedule.find((s) => s.day === day);
  if (!sched || !sched.available) return [];
  const out: { hour: number; peak: boolean }[] = [];
  for (let h = 0; h < 24; h++) {
    const slot = h * 2; // first 30-min slot of the hour
    const rate = sched.slots[slot];
    if (rate === "regular" || rate === "peak") out.push({ hour: h, peak: rate === "peak" });
  }
  return out;
}

interface Selection {
  court: MeCourt;
  hour: number;
  peak: boolean;
}

const DURATIONS = [1, 1.5, 2] as const;

export default function BookCourtPage() {
  const toast = useToast();
  const [data, setData] = useState<MeBookData | null>(null);
  const [occupied, setOccupied] = useState<Map<string, Set<number>>>(new Map());
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(() => toKey(new Date()));
  const [selection, setSelection] = useState<Selection | null>(null);
  const [duration, setDuration] = useState<number>(1);
  const [method, setMethod] = useState<MemberPaymentMethod>("QRIS");
  const [confirmStage, setConfirmStage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastRef, setLastRef] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const d = await getMeBookDataAction();
    setData(d);
    setLoading(false);
  }, []);

  const loadOccupancy = useCallback(async (key: string) => {
    const rows = await getMeOccupancyAction(key);
    setOccupied(new Map(rows.map((r) => [r.courtId, new Set(r.slots)])));
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    void loadOccupancy(date);
  }, [date, loadOccupancy]);

  const days = useMemo(() => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    return Array.from({ length: 10 }, (_, i) => {
      const d = new Date(base);
      d.setDate(d.getDate() + i);
      return toKey(d);
    });
  }, []);

  const weekday = new Date(`${date}T00:00:00`).getDay();
  const todayKey = toKey(new Date());
  const nowHour = new Date().getHours();

  // union of bookable hours across courts (for the row axis)
  const hourAxis = useMemo(() => {
    if (!data) return [];
    const set = new Set<number>();
    for (const c of data.courts) {
      for (const h of courtHoursForDay(c, weekday)) set.add(h.hour);
    }
    return [...set].sort((a, b) => a - b);
  }, [data, weekday]);

  const openSlot = (court: MeCourt, hour: number, peak: boolean) => {
    setSelection({ court, hour, peak });
    setDuration(1);
    setMethod("QRIS");
    setConfirmStage(false);
  };

  const closeModal = () => {
    setSelection(null);
    setConfirmStage(false);
  };

  // ── price preview (mirror server benefit) ──
  const pricePreview = useMemo(() => {
    if (!selection || !data) return { base: 0, payable: 0, coveredByQuota: false, discountPct: 0 };
    const { court, hour } = selection;
    const sched = court.schedule.find((s) => s.day === weekday);
    const slotSpan = Math.ceil((duration * 60) / 30);
    let base = 0;
    let valid = true;
    for (let i = 0; i < slotSpan; i++) {
      const slot = hour * 2 + i;
      const rate = sched?.slots[slot];
      if (rate === "closed" || !rate) {
        valid = false;
        break;
      }
      base += ((rate === "peak" ? court.pricePeak : court.priceOffPeak) * 30) / 60;
    }
    base = Math.round(base);
    const m = data.membership;
    const coveredByQuota = m.quotaRemaining > 0;
    let payable = base;
    let discountPct = 0;
    if (coveredByQuota) payable = 0;
    else if (m.courtDiscountPct > 0) {
      discountPct = m.courtDiscountPct;
      payable = Math.round(base * (1 - m.courtDiscountPct / 100));
    }
    return { base, payable, coveredByQuota, discountPct, valid };
  }, [selection, data, duration, weekday]);

  // does the selected duration fit (no closed slot, no overlap, not past)?
  const selectionValid = useMemo(() => {
    if (!selection) return false;
    if (pricePreview.valid === false) return false;
    const occ = occupied.get(selection.court.id) ?? new Set<number>();
    const slotSpan = Math.ceil((duration * 60) / 30);
    for (let i = 0; i < slotSpan; i++) {
      if (occ.has(selection.hour * 2 + i)) return false;
    }
    if (date === todayKey && selection.hour < nowHour) return false;
    return true;
  }, [selection, duration, occupied, pricePreview, date, todayKey, nowHour]);

  const confirm = async () => {
    if (!selection || saving) return;
    setSaving(true);
    const res = await createMyBookingAction({
      courtId: selection.court.id,
      dateKey: date,
      startHour: selection.hour,
      durationHours: duration,
      partySize: selection.court.format === "single" ? 2 : 4,
      paymentMethod: method,
    });
    setSaving(false);
    if (!res.success) {
      toast.error(res.error || "Gagal booking.");
      return;
    }
    toast.success(
      res.coveredByQuota
        ? "Booking gratis dari kuota membership!"
        : `Booking dikonfirmasi · ${idr(res.payable ?? 0)}`,
      "Berhasil",
    );
    setLastRef(res.id ?? null);
    closeModal();
    void loadOccupancy(date);
    void loadData(); // refresh quota
  };

  const endHourLabel = (start: number, dur: number) => {
    const total = start * 60 + dur * 60;
    return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`;
  };

  if (loading || !data) {
    return (
      <div>
        <PageBreadCrumb pageTitle="Book a Court" />
        <div className="h-[420px] animate-pulse rounded-2xl bg-[var(--surface-muted)]" />
      </div>
    );
  }

  const m = data.membership;

  return (
    <div>
      <PageBreadCrumb pageTitle="Book a Court" />

      {/* Date + membership strip */}
      <div className="mb-5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-5">
        <h4 className="font-semibold text-[var(--text-heading)]">{prettyDate(date)}</h4>
        <p className="text-xs text-[var(--text-muted)]">Pilih slot kosong di kalender untuk booking.</p>

        {m.planName && m.quotaTotal > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-muted)] p-3">
            <Badge size="sm" color={m.quotaRemaining > 0 ? "success" : "neutral"} variant="light">
              {m.planName}
            </Badge>
            <span className="text-xs text-[var(--text-body)]">
              Kuota gratis: {m.quotaRemaining}/{m.quotaTotal} tersisa
            </span>
            {m.resetAt && <span className="text-xs text-[var(--text-muted)]">· reset {m.resetAt}</span>}
            <span className="text-xs text-[var(--text-caption)]">
              {m.quotaRemaining > 0
                ? "— booking berikutnya GRATIS (semua lapangan & jam)."
                : m.courtDiscountPct > 0
                  ? `— kuota habis, diskon ${m.courtDiscountPct}% berlaku.`
                  : "— kuota habis, tarif normal."}
            </span>
          </div>
        )}

        <div className="mt-3 w-full sm:w-56">
          <DatePicker
            mode="single"
            label="Pilih tanggal"
            placeholder="Tanggal lain…"
            minDate={new Date(`${todayKey}T00:00:00`)}
            value={new Date(`${date}T00:00:00`)}
            onChange={(v) => {
              if (v instanceof Date) setDate(toKey(v));
            }}
          />
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
          {days.map((d) => {
            const dt = new Date(`${d}T00:00:00`);
            const active = d === date;
            return (
              <button
                key={d}
                onClick={() => setDate(d)}
                className={`flex min-w-[64px] flex-col items-center rounded-xl border px-3 py-2 transition-all ${
                  active
                    ? "border-transparent bg-[var(--color-primary)] text-white shadow-theme-sm"
                    : "border-[var(--border-default)] text-[var(--text-body)] hover:border-[var(--color-primary)]"
                }`}
              >
                <span className="text-[11px] uppercase">
                  {dt.toLocaleDateString("id-ID", { weekday: "short" })}
                </span>
                <span className="text-lg font-bold leading-tight">{dt.getDate()}</span>
                <span className="text-[10px]">{dt.toLocaleDateString("id-ID", { month: "short" })}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* legend */}
      <div className="mb-3 flex flex-wrap gap-4 text-xs text-[var(--text-muted)]">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-[var(--border-default)]" /> Tersedia
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-[var(--surface-muted)]" /> Terisi
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-400" /> Jam peak
        </span>
      </div>

      {/* grid */}
      {hourAxis.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-10 text-center text-sm text-[var(--text-muted)]">
          Tidak ada lapangan yang buka di tanggal ini.
        </div>
      ) : (
        <div className="overflow-x-auto custom-scrollbar rounded-2xl border border-[var(--border-default)]">
          <div
            className="grid min-w-[640px]"
            style={{ gridTemplateColumns: `64px repeat(${data.courts.length}, minmax(110px, 1fr))` }}
          >
            <div className="sticky left-0 z-10 border-b border-r border-[var(--border-default)] bg-[var(--surface-muted)]" />
            {data.courts.map((c) => (
              <div
                key={c.id}
                className="border-b border-[var(--border-default)] bg-[var(--surface-muted)] px-3 py-2.5 text-center"
              >
                <p className="truncate text-sm font-semibold text-[var(--text-heading)]">{c.name}</p>
                <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                  {c.environment} · {c.format}
                </p>
              </div>
            ))}

            {hourAxis.map((hour) => (
              <React.Fragment key={hour}>
                <div className="sticky left-0 z-10 flex items-start justify-end border-r border-[var(--border-default)] bg-[var(--surface-card)] px-2 py-2 text-[11px] font-medium text-[var(--text-muted)]">
                  {pad2(hour)}:00
                </div>
                {data.courts.map((c) => {
                  const hoursForCourt = courtHoursForDay(c, weekday);
                  const slotInfo = hoursForCourt.find((h) => h.hour === hour);
                  const occ = occupied.get(c.id) ?? new Set<number>();
                  const isBooked = occ.has(hour * 2);
                  const isPast = date === todayKey && hour < nowHour;
                  const closed = !slotInfo;
                  const disabled = closed || isBooked || isPast;
                  return (
                    <button
                      key={`${c.id}:${hour}`}
                      type="button"
                      disabled={disabled}
                      onClick={() => slotInfo && openSlot(c, hour, slotInfo.peak)}
                      title={
                        closed
                          ? "Tutup"
                          : isBooked
                            ? "Sudah ter-booking"
                            : isPast
                              ? "Jam sudah lewat"
                              : `${c.name} · ${pad2(hour)}:00 · ${idr(slotInfo!.peak ? c.pricePeak : c.priceOffPeak)}/jam`
                      }
                      className={[
                        "group relative h-12 border-b border-l transition-colors",
                        disabled
                          ? "cursor-not-allowed border-[var(--border-light)] bg-[var(--surface-muted)]"
                          : "border-[var(--border-light)] hover:bg-[var(--color-primary-light)]",
                      ].join(" ")}
                    >
                      {disabled ? (
                        <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[10px] text-[var(--text-muted)]">
                          {closed ? "—" : isBooked ? "Terisi" : "—"}
                        </span>
                      ) : (
                        <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[var(--color-primary)] opacity-0 transition-opacity group-hover:opacity-100">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                          </svg>
                        </span>
                      )}
                      {slotInfo?.peak && !disabled && (
                        <span className="pointer-events-none absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-amber-400" />
                      )}
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {lastRef && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
          <CheckIcon className="h-4 w-4" />
          Booking terakhir berhasil dikonfirmasi.
        </div>
      )}

      {/* modal */}
      <ModalDialog
        isOpen={!!selection}
        onClose={closeModal}
        title={confirmStage ? "Konfirmasi booking" : "Booking lapangan"}
        description={selection ? `${selection.court.name} · ${prettyDate(date)}` : undefined}
        footer={
          selection ? (
            <div className="flex justify-end gap-2">
              {confirmStage ? (
                <>
                  <Button variant="ghost" onClick={() => setConfirmStage(false)}>
                    Kembali
                  </Button>
                  <Button onClick={confirm} glow disabled={saving || !selectionValid}>
                    {saving
                      ? "Memproses…"
                      : pricePreview.coveredByQuota
                        ? "Konfirmasi (gratis kuota)"
                        : `Bayar ${idr(pricePreview.payable)} & konfirmasi`}
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" onClick={closeModal}>
                    Batal
                  </Button>
                  <Button
                    onClick={() => setConfirmStage(true)}
                    glow
                    disabled={!selectionValid}
                    startIcon={<ClockIcon className="h-4 w-4" />}
                  >
                    Lanjut
                  </Button>
                </>
              )}
            </div>
          ) : undefined
        }
      >
        {selection && (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-muted)] p-3">
              <div>
                <p className="text-sm font-semibold text-[var(--text-heading)]">{selection.court.name}</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {pad2(selection.hour)}:00 – {endHourLabel(selection.hour, duration)}
                </p>
              </div>
              <Badge variant="light" color={selection.peak ? "warning" : "success"} size="sm">
                {selection.peak ? "Peak" : "Off-peak"}
              </Badge>
            </div>

            {!confirmStage && (
              <>
                <div>
                  <InputLabel label="Durasi" tooltip="Lama sewa lapangan." />
                  <div className="flex items-center gap-1.5">
                    {DURATIONS.map((d) => (
                      <Button
                        key={d}
                        variant="chip"
                        size="sm"
                        active={duration === d}
                        onClick={() => setDuration(d)}
                      >
                        {d}h
                      </Button>
                    ))}
                  </div>
                  {!selectionValid && (
                    <p className="mt-2 text-xs text-rose-500">
                      Durasi ini bentrok dengan slot lain / di luar jam operasional. Pilih durasi lebih pendek atau slot lain.
                    </p>
                  )}
                </div>

                <div>
                  <InputLabel label="Metode pembayaran" tooltip="Pembayaran tunai hanya bisa di front desk (lewat staff)." />
                  <div className="grid grid-cols-2 gap-2">
                    {MEMBER_PAYMENT_METHODS.map((pm) => (
                      <button
                        key={pm}
                        type="button"
                        onClick={() => setMethod(pm)}
                        className={[
                          "rounded-xl border px-3 py-2.5 text-sm font-medium transition-all",
                          method === pm
                            ? "border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)]"
                            : "border-[var(--border-default)] text-[var(--text-body)] hover:border-[var(--color-primary)]/40",
                        ].join(" ")}
                      >
                        {pm}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* price breakdown */}
            <div className="space-y-1.5 border-t border-[var(--border-light)] pt-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-caption)]">Durasi</span>
                <span className="font-medium text-[var(--text-heading)]">{duration} jam</span>
              </div>
              {pricePreview.coveredByQuota ? (
                <>
                  <div className="flex items-center justify-between text-[var(--text-caption)]">
                    <span>Tarif lapangan</span>
                    <span className="line-through">{idr(pricePreview.base)}</span>
                  </div>
                  <div className="flex items-center justify-between text-emerald-500">
                    <span>Kuota membership</span>
                    <span>−{idr(pricePreview.base)}</span>
                  </div>
                </>
              ) : pricePreview.discountPct > 0 ? (
                <>
                  <div className="flex items-center justify-between text-[var(--text-caption)]">
                    <span>Subtotal</span>
                    <span className="line-through">{idr(pricePreview.base)}</span>
                  </div>
                  <div className="flex items-center justify-between text-emerald-500">
                    <span>Diskon {pricePreview.discountPct}%</span>
                    <span>−{idr(pricePreview.base - pricePreview.payable)}</span>
                  </div>
                </>
              ) : null}
              <div className="flex items-center justify-between border-t border-[var(--border-light)] pt-2">
                <span className="font-medium text-[var(--text-heading)]">Total</span>
                <span className="text-lg font-bold text-[var(--color-primary)]">
                  {idr(pricePreview.payable)}
                </span>
              </div>
            </div>

            {confirmStage && (
              <p className="text-xs text-[var(--text-muted)]">
                {pricePreview.coveredByQuota
                  ? "Booking ini gratis memakai kuota membership."
                  : `Bayar via ${method}. Booking langsung terkonfirmasi.`}
              </p>
            )}
          </div>
        )}
      </ModalDialog>
    </div>
  );
}
