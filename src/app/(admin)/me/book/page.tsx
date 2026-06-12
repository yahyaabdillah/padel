"use client";

// Member ▸ Book a Court — daily calendar grid. Columns = courts, rows = hours.
// Each cell shows availability (open / booked / closed). Clicking an open slot
// opens the booking modal where the member picks duration & confirms. The day
// can be switched via the quick-strip or the date picker above the grid.

import React, { useMemo, useState } from "react";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import { ModalDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast/ToastContext";
import {
  memberCourts,
  bookableHours,
  buildSlotGrid,
  isPeakHour,
  courtById,
  idr,
  prettyDateLong,
  type SlotStatus,
} from "@/data/padel/member";
import { tierById } from "@/data/padel/member";
import { useRole } from "@/context/RoleContext";
import { useMembership } from "@/context/MembershipContext";
import { mockMembers } from "@/data/padel/club/members";
import DatePicker from "@/components/ui/datepicker/DatePicker";
import InputLabel from "@/components/ui/input/InputLabel";
import Tooltip from "@/components/ui/tooltip/Tooltip";
import { CheckIcon, ClockIcon } from "@/components/member/icons";
import PromoReferralInput from "@/components/shared/PromoReferralInput";
import type { MemberTier as ClubMemberTier } from "@/data/padel/club/members";

const pad2 = (n: number) => String(n).padStart(2, "0");
const toKey = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const TODAY_KEY = "2026-06-02";
/** Jam "sekarang" untuk demo (selaras dengan seed booking & check-in). */
const NOW_HOUR = 14;

function nextDays(count: number) {
  const out: string[] = [];
  const base = new Date("2026-06-02T00:00:00");
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    out.push(toKey(d));
  }
  return out;
}

const endTimeOf = (start: string, duration: number) => {
  const [h, m] = start.split(":").map(Number);
  const total = h * 60 + m + duration * 60;
  return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`;
};

interface SlotSelection {
  courtId: string;
  time: string;
}

/** key for a slot the user booked this session: `${date}|${courtId}|${time}` */
const slotKey = (date: string, courtId: string, time: string) =>
  `${date}|${courtId}|${time}`;

/** hourly slot labels covered by a booking that starts at `time` for `duration` hours */
const coveredSlots = (time: string, duration: number): string[] => {
  const startH = parseInt(time.slice(0, 2), 10);
  const span = Math.ceil(duration); // grid is hourly
  return Array.from({ length: span }, (_, i) => `${pad2(startH + i)}:00`);
};

export default function BookCourtPage() {
  const toast = useToast();
  const { currentUser } = useRole();
  const { getMembershipStatus, consumeCourtQuota } = useMembership();
  const days = useMemo(() => nextDays(10), []);
  const [date, setDate] = useState(days[0]);
  const [selection, setSelection] = useState<SlotSelection | null>(null);
  const [duration, setDuration] = useState(1.5);
  const [confirmStage, setConfirmStage] = useState(false);
  const [bookedRef, setBookedRef] = useState<string | null>(null);
  const [promoDiscount, setPromoDiscount] = useState(0);
  // Slots the user has successfully booked this session (so the grid marks them).
  const [myBookings, setMyBookings] = useState<Set<string>>(new Set());

  const grid = useMemo(() => buildSlotGrid(date), [date]);
  const isCustomDate = !days.includes(date);

  const tier = tierById((currentUser.membershipTier as "Pro") ?? "Casual");
  const promoTier: ClubMemberTier = (
    (currentUser.membershipTier as string) ?? "casual"
  ).toLowerCase() as ClubMemberTier;

  // Map the logged-in portal user to a club member record (by name) so we can
  // read their live membership quota from MembershipContext.
  const clubMemberId = useMemo(() => {
    const match = mockMembers.find(
      (m) => m.name.toLowerCase() === currentUser.name.toLowerCase(),
    );
    return match?.id ?? null;
  }, [currentUser.name]);

  const membership = clubMemberId ? getMembershipStatus(clubMemberId) : null;
  const quotaCovers = !!membership && membership.quotaRemaining > 0;

  // ── pricing for the active selection ──
  const court = selection ? courtById(selection.courtId) : null;
  const gross =
    selection && court
      ? (isPeakHour(selection.time) ? court.pricePeak : court.priceOffPeak) * duration
      : 0;
  // Quota covers the whole slot (any court/hour, peak included) → Rp0.
  const net = quotaCovers
    ? 0
    : Math.round(gross * (1 - tier.courtDiscountPct / 100));
  const appliedPromo = selection ? Math.min(promoDiscount, net) : 0;
  const payable = Math.max(net - appliedPromo, 0);

  const openSlot = (courtId: string, time: string) => {
    setSelection({ courtId, time });
    setDuration(1.5);
    setPromoDiscount(0);
    setConfirmStage(false);
  };

  const closeModal = () => {
    setSelection(null);
    setConfirmStage(false);
    setPromoDiscount(0);
  };

  const handleConfirm = () => {
    const ref = "SC-" + Math.random().toString(36).slice(2, 6).toUpperCase();
    if (quotaCovers && clubMemberId) consumeCourtQuota(clubMemberId, 1);
    // mark every hourly slot the booking covers as "mine"
    if (selection) {
      const keys = coveredSlots(selection.time, duration).map((t) =>
        slotKey(date, selection.courtId, t),
      );
      setMyBookings((prev) => {
        const next = new Set(prev);
        keys.forEach((k) => next.add(k));
        return next;
      });
    }
    setBookedRef(ref);
    toast.success(
      quotaCovers
        ? `Court booked gratis dari kuota! Ref ${ref}`
        : `Court booked! Reference ${ref}`,
      "Booking confirmed",
    );
    closeModal();
  };

  const activeDate = new Date(date + "T00:00:00");

  return (
    <div>
      <PageBreadCrumb pageTitle="Book a Court" />

      {/* ── Date switcher ── */}
      <div className="mb-5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-5">
        <div className="mb-3">
          <div className="flex items-center gap-1.5">
            <h4 className="font-semibold text-[var(--text-heading)]">
              {prettyDateLong(date)}
            </h4>
            <InputLabel
              label=""
              className="mb-0"
              tooltip="Kalender menampilkan ketersediaan lapangan untuk tanggal ini. Ganti tanggal lewat date picker atau strip hari di bawah."
            />
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Pilih slot kosong di kalender untuk booking
          </p>
          <div className="mt-3 w-full sm:w-56">
            <DatePicker
              mode="single"
              label="Pilih tanggal"
              labelInfo="Pilih tanggal main. Tanggal yang sudah lewat tidak bisa dipilih."
              placeholder="Tanggal lain…"
              minDate={new Date(days[0] + "T00:00:00")}
              value={isCustomDate ? activeDate : null}
              onChange={(v) => {
                if (v instanceof Date) setDate(toKey(v));
              }}
            />
          </div>
        </div>
        {membership && membership.hasActivePlan && membership.quotaTotal > 0 && (
          <div
            className={[
              "mb-3 flex flex-wrap items-center gap-2 rounded-xl border p-3",
              quotaCovers
                ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10"
                : "border-[var(--border-default)] bg-[var(--surface-muted)]",
            ].join(" ")}
          >
            <Tooltip
              content="Jumlah booking lapangan gratis dari membership kamu pada siklus ini."
              placement="top"
            >
              <Badge
                size="sm"
                color={quotaCovers ? "success" : "neutral"}
                variant={quotaCovers ? "solid" : "light"}
              >
                {membership.plan?.name ?? "Member"}
              </Badge>
            </Tooltip>
            <span className="text-xs text-[var(--text-body)]">
              Kuota booking gratis: {membership.quotaRemaining}/{membership.quotaTotal} tersisa
            </span>
            {membership.resetAt && (
              <span className="text-xs text-[var(--text-muted)]">
                · reset {membership.resetAt}
              </span>
            )}
            <span className="text-xs text-[var(--text-caption)]">
              {quotaCovers
                ? "— booking berikutnya GRATIS (semua lapangan & jam, termasuk peak)."
                : "— kuota habis, booking dikenakan tarif normal."}
            </span>
          </div>
        )}
        <div className="mb-1.5 flex items-center gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
            Hari cepat
          </span>
          <InputLabel
            label=""
            className="mb-0"
            tooltip="Pintasan 10 hari ke depan. Klik untuk lompat cepat ke tanggal tersebut."
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
          {days.map((d) => {
            const dt = new Date(d + "T00:00:00");
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
                  {dt.toLocaleDateString("en-US", { weekday: "short" })}
                </span>
                <span className="text-lg font-bold leading-tight">{dt.getDate()}</span>
                <span className="text-[10px]">
                  {dt.toLocaleDateString("en-US", { month: "short" })}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Calendar heading + legend ── */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <h4 className="text-sm font-semibold text-[var(--text-heading)]">
            Kalender ketersediaan
          </h4>
          <InputLabel
            label=""
            className="mb-0"
            tooltip="Kolom = lapangan, baris = jam. Klik sel hijau/kosong untuk booking. Arahkan kursor ke sel untuk melihat harga per jam."
          />
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-[var(--text-muted)]">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded border border-[var(--border-default)]" /> Tersedia
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-[var(--surface-muted)]" /> Terisi
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15" /> Booking saya
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-400" /> Jam peak
          </span>
        </div>
      </div>

      {/* ── Calendar grid ── */}
      <div className="overflow-x-auto custom-scrollbar rounded-2xl border border-[var(--border-default)]">
        <div
          className="grid min-w-[720px]"
          style={{ gridTemplateColumns: `64px repeat(${memberCourts.length}, minmax(110px, 1fr))` }}
        >
          {/* header row */}
          <div className="sticky left-0 z-10 border-b border-r border-[var(--border-default)] bg-[var(--surface-muted)]" />
          {memberCourts.map((c) => (
            <div
              key={c.id}
              className="border-b border-[var(--border-default)] bg-[var(--surface-muted)] px-3 py-2.5 text-center"
            >
              <p className="truncate text-sm font-semibold text-[var(--text-heading)]">
                {c.name}
              </p>
              <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                {c.zone} · {c.surface}
              </p>
            </div>
          ))}

          {/* time rows */}
          {bookableHours.map((time, hi) => (
            <React.Fragment key={time}>
              <div className="sticky left-0 z-10 flex items-start justify-end border-r border-[var(--border-default)] bg-[var(--surface-card)] px-2 py-2 text-[11px] font-medium text-[var(--text-muted)]">
                {time}
              </div>
              {memberCourts.map((c) => {
                const status: SlotStatus = grid[c.id]?.[hi] ?? "open";
                const peak = isPeakHour(time);
                const hourNum = parseInt(time.slice(0, 2), 10);
                const isPast = date === TODAY_KEY && hourNum < NOW_HOUR;
                const isMine = myBookings.has(slotKey(date, c.id, time));
                const disabled = isMine || status === "booked" || status === "closed" || isPast;
                const courtPrice = peak ? c.pricePeak : c.priceOffPeak;
                return (
                  <button
                    key={`${c.id}:${time}`}
                    type="button"
                    disabled={disabled}
                    onClick={() => openSlot(c.id, time)}
                    title={
                      isMine
                        ? "Kamu sudah booking slot ini"
                        : disabled
                          ? isPast
                            ? "Jam sudah lewat"
                            : status === "booked"
                              ? "Sudah ter-booking"
                              : "Tutup"
                          : `${c.name} · ${time} · ${idr(courtPrice)}/jam`
                    }
                    className={[
                      "group relative h-12 border-b border-l transition-colors",
                      isMine
                        ? "border-l-emerald-500 border-b-[var(--border-light)] bg-emerald-50 dark:bg-emerald-500/15"
                        : disabled
                          ? "cursor-not-allowed border-[var(--border-light)] bg-[var(--surface-muted)]"
                          : "border-[var(--border-light)] hover:bg-[var(--color-primary-light)]",
                    ].join(" ")}
                  >
                    {isMine ? (
                      <span className="pointer-events-none absolute inset-0 flex items-center justify-center gap-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckIcon className="h-3 w-3" />
                        Booking saya
                      </span>
                    ) : disabled ? (
                      <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[10px] text-[var(--text-muted)]">
                        {isPast ? "—" : status === "booked" ? "Terisi" : "—"}
                      </span>
                    ) : (
                      <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[var(--color-primary)] opacity-0 transition-opacity group-hover:opacity-100">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                      </span>
                    )}
                    {peak && !disabled && (
                      <span className="pointer-events-none absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-amber-400" />
                    )}
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {bookedRef && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
          <CheckIcon className="h-4 w-4" />
          Booking terakhir berhasil · ref {bookedRef}
        </div>
      )}

      {/* ── Booking modal ── */}
      <ModalDialog
        isOpen={!!selection}
        onClose={closeModal}
        title={confirmStage ? "Konfirmasi booking" : "Booking lapangan"}
        description={
          court
            ? `${court.name} · ${prettyDateLong(date)}`
            : undefined
        }
        footer={
          selection ? (
            <div className="flex justify-end gap-2">
              {confirmStage ? (
                <>
                  <Button variant="ghost" onClick={() => setConfirmStage(false)}>
                    Kembali
                  </Button>
                  <Button onClick={handleConfirm} glow>
                    {quotaCovers
                      ? "Konfirmasi (gratis kuota)"
                      : `Bayar ${idr(payable)} & konfirmasi`}
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
        {selection && court && (
          <div className="space-y-5">
            {/* Slot summary */}
            <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-muted)] p-3">
              <div>
                <p className="text-sm font-semibold text-[var(--text-heading)]">
                  {court.name}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {selection.time} – {endTimeOf(selection.time, duration)}
                </p>
              </div>
              <Badge
                variant="light"
                color={isPeakHour(selection.time) ? "warning" : "success"}
                size="sm"
              >
                {isPeakHour(selection.time) ? "Peak" : "Off-peak"}
              </Badge>
            </div>

            {!confirmStage && (
              <div>
                <InputLabel
                  label="Durasi"
                  tooltip="Lama sewa lapangan. Memengaruhi total harga dan jumlah jam yang dipakai di kalender."
                />
                <div className="flex items-center gap-1.5">
                  {[1, 1.5, 2].map((d) => (
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
              </div>
            )}

            {!confirmStage && !quotaCovers && (
              <div className="border-t border-[var(--border-light)] pt-4">
                <InputLabel
                  label="Kode promo / referral"
                  tooltip="Punya kode promo atau referral? Masukkan di sini untuk memotong harga sebelum bayar."
                />
                <PromoReferralInput
                  scope="booking"
                  amount={net}
                  tier={promoTier}
                  onChange={(s) => setPromoDiscount(s.discount)}
                />
              </div>
            )}

            {/* Price breakdown */}
            <div className="space-y-1.5 border-t border-[var(--border-light)] pt-4 text-sm">
              <Row label="Durasi" value={`${duration} jam`} />
              {quotaCovers ? (
                <>
                  <div className="flex items-center justify-between text-[var(--text-caption)]">
                    <span>Tarif lapangan</span>
                    <span className="line-through">{idr(gross)}</span>
                  </div>
                  <div className="flex items-center justify-between text-emerald-500">
                    <span>Kuota membership</span>
                    <span>−{idr(gross)}</span>
                  </div>
                </>
              ) : (
                <>
                  {tier.courtDiscountPct > 0 && (
                    <>
                      <div className="flex items-center justify-between text-[var(--text-caption)]">
                        <span>Subtotal</span>
                        <span className="line-through">{idr(gross)}</span>
                      </div>
                      <div className="flex items-center justify-between text-emerald-500">
                        <span>{tier.name} ({tier.courtDiscountPct}%)</span>
                        <span>−{idr(gross - net)}</span>
                      </div>
                    </>
                  )}
                  {appliedPromo > 0 && (
                    <div className="flex items-center justify-between text-emerald-500">
                      <span>Promo</span>
                      <span>−{idr(appliedPromo)}</span>
                    </div>
                  )}
                </>
              )}
              <div className="flex items-center justify-between border-t border-[var(--border-light)] pt-2">
                <span className="font-medium text-[var(--text-heading)]">Total</span>
                <span className="text-lg font-bold text-[var(--color-primary)]">
                  {idr(payable)}
                </span>
              </div>
              {quotaCovers && membership && (
                <p className="pt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  Gratis dari kuota · sisa {membership.quotaRemaining - 1}/{membership.quotaTotal} setelah booking ini
                </p>
              )}
            </div>

            {confirmStage && (
              <p className="text-xs text-[var(--text-muted)]">
                {quotaCovers
                  ? "Booking ini gratis memakai kuota membership — tidak ada potongan wallet."
                  : "Pembayaran akan dipotong dari wallet kamu."}
              </p>
            )}
          </div>
        )}
      </ModalDialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[var(--text-caption)]">{label}</span>
      <span className="text-right font-medium text-[var(--text-heading)]">{value}</span>
    </div>
  );
}
