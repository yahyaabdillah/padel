"use client";

// PadelHub — owner/staff "New booking" form (single-page grouped form, no
// stepper). Sections flow top-to-bottom like the member-registration form, and
// every field label carries an info tooltip. Consumes club-core ClubDataContext
// (courts + addBooking). Slot availability is computed live from existing
// bookings so a court/hour cannot be double-booked.

import React, { ReactNode, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/card/Card";
import Button from "@/components/ui/button/Button";
import UiSelect from "@/components/ui/select/Select";
import DatePicker from "@/components/ui/datepicker/DatePicker";
import TextInput from "@/components/ui/input/TextInput";
import InputLabel from "@/components/ui/input/InputLabel";
import Badge from "@/components/ui/badge/Badge";
import { useToast } from "@/components/ui/toast/ToastContext";
import { useClubData } from "@/components/club-core/ClubDataContext";
import { useMembership } from "@/context/MembershipContext";
import ToneBadge from "@/components/club-core/ToneBadge";
import { formatIDR } from "@/components/club-core/format";
import { isPeakHour } from "@/data/padel/club/courts";
import {
  type BookingType,
  bookingTypeMeta,
  dateKey,
  gridHours,
} from "@/data/padel/club/bookings";
import { mockMembers, memberTierMeta } from "@/data/padel/club/members";
import PromoReferralInput from "@/components/shared/PromoReferralInput";

const pad = (n: number) => String(n).padStart(2, "0");
const todayKey = "2026-06-02";
/** Jam "sekarang" untuk demo (selaras dengan seed booking & check-in). */
const NOW_HOUR = 14;

const durations = [
  { value: 60, label: "60 minutes" },
  { value: 90, label: "90 minutes" },
  { value: 120, label: "120 minutes" },
];

type CustomerKind = "member" | "walk_in";

/** Grouped section wrapper — numbered heading + optional info tooltip. */
const FormSection: React.FC<{
  step: number;
  title: string;
  description?: string;
  info?: ReactNode;
  children: ReactNode;
}> = ({ step, title, description, info, children }) => (
  <section className="border-b border-[var(--border-default)] pb-8 last:border-0 last:pb-0">
    <div className="mb-5 flex items-start gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-light)] text-xs font-bold text-[var(--color-primary)]">
        {step}
      </span>
      <div>
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-semibold text-[var(--text-heading)]">
            {title}
          </h3>
          {info && <InputLabel label="" tooltip={info} className="mb-0" />}
        </div>
        {description && (
          <p className="mt-0.5 text-xs text-[var(--text-caption)]">
            {description}
          </p>
        )}
      </div>
    </div>
    {children}
  </section>
);

interface NewBookingStepperProps {
  initialCourtId?: string;
  initialDateKey?: string;
  initialHour?: number;
}

export default function NewBookingStepper({
  initialCourtId,
  initialDateKey,
  initialHour,
}: NewBookingStepperProps) {
  const router = useRouter();
  const toast = useToast();
  const { courts, bookings, addBooking, isReady } = useClubData();
  const { getMembershipStatus, consumeCourtQuota } = useMembership();

  const activeCourts = useMemo(
    () => courts.filter((c) => c.status === "active"),
    [courts],
  );

  const [courtId, setCourtId] = useState(
    initialCourtId ?? activeCourts[0]?.id ?? "",
  );
  const [date, setDate] = useState<Date>(() => {
    // Never start on a past date, even if the URL passes one.
    const requested = new Date(`${initialDateKey ?? todayKey}T00:00:00`);
    const floor = new Date(`${todayKey}T00:00:00`);
    return requested < floor ? floor : requested;
  });
  const [hour, setHour] = useState<number | null>(
    initialHour !== undefined ? initialHour : null,
  );
  const [duration, setDuration] = useState(90);
  const [kind, setKind] = useState<CustomerKind>("member");
  const [memberId, setMemberId] = useState("");
  const [walkInName, setWalkInName] = useState("");
  const [confirmedRef, setConfirmedRef] = useState<string | null>(null);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const selectedKey = dateKey(date);
  const court = courts.find((c) => c.id === courtId);
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;

  // ── live slot availability for the chosen court + date ──
  const bookedHours = useMemo(() => {
    const set = new Set<number>();
    bookings
      .filter(
        (b) =>
          b.courtId === courtId &&
          b.status !== "cancelled" &&
          b.start.startsWith(selectedKey),
      )
      .forEach((b) => {
        const startH = Number(b.start.slice(11, 13));
        const endH = Number(b.end.slice(11, 13));
        const endM = Number(b.end.slice(14, 16));
        const lastH = endM > 0 ? endH : endH - 1;
        for (let h = startH; h <= lastH; h++) set.add(h);
      });
    return set;
  }, [bookings, courtId, selectedKey]);

  const occupiedByChoice = useMemo(() => {
    if (hour === null) return [] as number[];
    const span = Math.ceil(duration / 60);
    return Array.from({ length: span }, (_, i) => hour + i);
  }, [hour, duration]);

  const durationClashes = occupiedByChoice.some(
    (h) => bookedHours.has(h) || h > 22,
  );

  const price = useMemo(() => {
    if (!court || hour === null) return 0;
    const rate = isPeakHour(hour, isWeekend) ? court.pricePeak : court.priceOffPeak;
    return Math.round((rate * duration) / 60);
  }, [court, hour, duration, isWeekend]);

  const member = mockMembers.find((m) => m.id === memberId);
  const promoTier = kind === "member" ? member?.tier ?? "daily" : "daily";

  // ── membership quota / discount ──
  // A member's court booking is FREE while their plan quota remains (any court
  // & hour, peak included). Once quota is used up, the plan's court discount %
  // applies to the rate. Walk-ins never get quota.
  const membership =
    kind === "member" && memberId ? getMembershipStatus(memberId) : null;
  const quotaCovers =
    kind === "member" && !!membership && membership.quotaRemaining > 0;
  const planDiscountPct =
    kind === "member" && membership && !quotaCovers
      ? membership.courtDiscountPct
      : 0;

  const appliedPromo = Math.min(promoDiscount, price);
  // Effective court charge: free if quota covers it, else rate minus plan
  // discount, then minus promo.
  const priceAfterPlan = quotaCovers
    ? 0
    : Math.round(price * (1 - planDiscountPct / 100));
  const promoOnPlan = Math.min(appliedPromo, priceAfterPlan);
  const payable = Math.max(priceAfterPlan - promoOnPlan, 0);

  // ── validation ──
  const courtValid = !!court;
  // Tanggal booking tidak boleh sebelum hari ini.
  const dateValid = selectedKey >= todayKey;
  const timeValid = hour !== null && !durationClashes;
  const customerValid =
    kind === "member" ? !!memberId : walkInName.trim().length >= 2;
  const canSubmit = courtValid && dateValid && timeValid && customerValid;

  const reset = () => {
    setHour(null);
    setWalkInName("");
    setMemberId("");
    setConfirmedRef(null);
    setPromoDiscount(0);
    setSubmitted(false);
  };

  const finalize = () => {
    setSubmitted(true);
    if (!canSubmit || !court || hour === null) {
      toast.error("Lengkapi data booking sebelum menyimpan.", "Form belum lengkap");
      return;
    }
    const startIso = `${selectedKey}T${pad(hour)}:00:00`;
    const endH = hour + Math.floor(duration / 60);
    const endM = duration % 60;
    const endIso = `${selectedKey}T${pad(endH)}:${pad(endM)}:00`;

    const type: BookingType = kind === "member" ? "member" : "walk_in";
    const created = addBooking({
      courtId: court.id,
      start: startIso,
      end: endIso,
      type,
      status: "confirmed",
      customer:
        kind === "member"
          ? (member?.name ?? "Member")
          : `Walk-in · ${walkInName.trim()}`,
      memberId: kind === "member" ? memberId : undefined,
      partySize: court.format === "single" ? 2 : 4,
      price: payable,
      note: quotaCovers ? "Included in membership (kuota)" : undefined,
      createdBy: "Front desk",
    });
    // Burn one quota slot if this booking was covered by the membership.
    if (quotaCovers && memberId) consumeCourtQuota(memberId, 1);
    setConfirmedRef(created.id);
    toast.success(`Court reserved for ${created.customer}.`, "Booking confirmed");
  };

  // ── loading skeleton ──
  if (!isReady) {
    return (
      <Card padding="lg">
        <div className="space-y-4">
          <div className="h-10 w-full animate-pulse rounded-lg bg-gray-100 dark:bg-white/[0.04]" />
          <div className="h-40 w-full animate-pulse rounded-xl bg-gray-100 dark:bg-white/[0.04]" />
        </div>
      </Card>
    );
  }

  // ── success state ──
  if (confirmedRef) {
    return (
      <Card padding="lg">
        <div className="mx-auto max-w-md py-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/10">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-7 w-7">
              <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Booking confirmed
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {court?.name} · {selectedKey} · {pad(hour ?? 0)}:00 — ref{" "}
            <span className="font-mono font-semibold">{confirmedRef}</span>
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="outline" onClick={reset}>
              Book another
            </Button>
            <Button variant="primary" sheen onClick={() => router.push("/bookings")}>
              Back to bookings
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* ── Form ── */}
      <div className="lg:col-span-2">
        <Card padding="lg">
          <div className="space-y-8">
            {/* Court & date */}
            <FormSection
              step={1}
              title="Court & Tanggal"
              description="Pilih lapangan dan tanggal bermain"
              info="Tentukan lapangan dan tanggal. Ketersediaan jam dihitung otomatis dari booking yang sudah ada."
            >
              <div className="space-y-5">
                <div>
                  <InputLabel
                    label="Pilih lapangan"
                    tooltip="Setiap lapangan punya tarif off-peak & peak berbeda. Warna lapangan dipakai di kalender booking."
                  />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {activeCourts.map((c) => {
                      const active = c.id === courtId;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setCourtId(c.id);
                            setHour(null);
                          }}
                          className={[
                            "flex items-center gap-3 rounded-2xl border p-3 text-left transition-all",
                            active
                              ? "border-[var(--color-primary)] bg-[var(--color-primary-light)] ring-2 ring-[var(--color-primary)]/30"
                              : "border-[var(--border-default)] bg-[var(--surface-card)] hover:border-[var(--color-primary)]/40",
                          ].join(" ")}
                        >
                          <span
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                            style={{ background: c.color }}
                          >
                            {c.name.slice(0, 2).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-[var(--text-heading)]">
                              {c.name}
                            </p>
                            <p className="truncate text-xs text-[var(--text-caption)]">
                              {c.environment} · {formatIDR(c.priceOffPeak, true)}–
                              {formatIDR(c.pricePeak, true)}/h
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {submitted && !courtValid && (
                    <p className="mt-2 text-xs text-[var(--color-error,#ef4444)]">
                      Pilih lapangan terlebih dahulu.
                    </p>
                  )}
                </div>
                <div className="max-w-xs">
                  <DatePicker
                    label="Tanggal booking"
                    labelInfo="Tanggal bermain. Tidak bisa memilih tanggal di masa lalu."
                    mode="single"
                    value={date}
                    minDate={new Date(`${todayKey}T00:00:00`)}
                    hint="Pilih tanggal bermain"
                    onChange={(v) => {
                      if (v instanceof Date) {
                        setDate(v);
                        setHour(null);
                      }
                    }}
                  />
                  {!dateValid && (
                    <p className="mt-2 text-xs text-[var(--color-error,#ef4444)]">
                      Tidak bisa booking di tanggal yang sudah lewat.
                    </p>
                  )}
                </div>
              </div>
            </FormSection>

            {/* Time & duration */}
            <FormSection
              step={2}
              title="Jam & Durasi"
              description="Pilih durasi sewa dan jam mulai"
              info="Durasi menentukan berapa jam slot yang dipakai. Jam yang sudah ter-booking atau melebihi jam operasional tidak bisa dipilih."
            >
              <div className="space-y-5">
                <div className="max-w-xs">
                  <UiSelect
                    label="Durasi"
                    labelInfo="Lama sewa lapangan. Memengaruhi jam yang tersedia dan total harga."
                    options={durations.map((d) => ({ value: String(d.value), label: d.label }))}
                    value={String(duration)}
                    searchable
                    clearable={false}
                    hint="Durasi sewa lapangan"
                    onChange={(v) => {
                      setDuration(Number(v));
                      setHour(null);
                    }}
                  />
                </div>
                <div>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <InputLabel
                      label="Pilih jam mulai"
                      className="mb-0"
                      tooltip="Titik kuning menandakan jam peak (tarif lebih tinggi). Jam yang dicoret sudah ter-booking."
                    />
                    <div className="flex flex-wrap gap-3 text-xs text-[var(--text-muted)]">
                      <span className="flex items-center gap-1.5">
                        <span className="h-3 w-3 rounded border border-[var(--border-strong)]" /> Open
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-3 w-3 rounded bg-[var(--surface-muted)]" /> Booked
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block h-2 w-2 rounded-full bg-amber-400" /> Peak
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                    {gridHours.map((h) => {
                      const span = Math.ceil(duration / 60);
                      const wouldOverflow = h + span > 23;
                      // Jam yang sudah lewat (untuk booking hari ini) tidak bisa dipilih.
                      const isPast = selectedKey === todayKey && h < NOW_HOUR;
                      const clashes =
                        Array.from({ length: span }, (_, i) => h + i).some((x) =>
                          bookedHours.has(x),
                        ) || wouldOverflow || isPast;
                      const active = hour === h;
                      const peak = isPeakHour(h, isWeekend);
                      return (
                        <button
                          key={h}
                          type="button"
                          disabled={clashes}
                          onClick={() => setHour(h)}
                          className={[
                            "relative rounded-lg border py-2.5 text-sm font-medium transition-all",
                            active
                              ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-theme-sm"
                              : clashes
                                ? "cursor-not-allowed border-transparent bg-[var(--surface-muted)] text-[var(--text-muted)] line-through"
                                : "border-[var(--border-default)] text-[var(--text-body)] hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-primary-light)]",
                          ].join(" ")}
                        >
                          {pad(h)}:00
                          {peak && !clashes && !active && (
                            <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-amber-400" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {bookedHours.size === gridHours.length && (
                    <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                      Lapangan ini penuh pada {selectedKey}. Pilih lapangan atau tanggal lain.
                    </p>
                  )}
                  {submitted && !timeValid && bookedHours.size !== gridHours.length && (
                    <p className="mt-2 text-xs text-[var(--color-error,#ef4444)]">
                      Pilih slot jam yang tersedia.
                    </p>
                  )}
                </div>
              </div>
            </FormSection>

            {/* Customer */}
            <FormSection
              step={3}
              title="Pelanggan"
              description="Member terdaftar atau tamu walk-in"
              info="Member terdaftar terhubung ke wallet & tier. Walk-in ditagih sebagai tamu harian tanpa perlu keanggotaan."
            >
              <div className="space-y-5">
                <div>
                  <InputLabel
                    label="Tipe pelanggan"
                    tooltip="Pilih Member untuk pelanggan terdaftar, atau Walk-in untuk tamu harian."
                  />
                  <div className="flex flex-wrap gap-2">
                    {(["member", "walk_in"] as CustomerKind[]).map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setKind(k)}
                        className={[
                          "rounded-full px-3.5 py-1.5 text-sm font-medium transition-all",
                          kind === k
                            ? "text-white shadow-theme-xs"
                            : "bg-[var(--surface-muted)] text-[var(--text-body)] hover:opacity-80",
                        ].join(" ")}
                        style={kind === k ? { background: bookingTypeMeta[k].color } : undefined}
                      >
                        {bookingTypeMeta[k].label}
                      </button>
                    ))}
                  </div>
                </div>

                {kind === "member" ? (
                  <div className="max-w-md">
                    <UiSelect
                      label="Pilih member"
                      labelInfo="Cari member terdaftar berdasarkan nama. Tier & saldo wallet ditampilkan untuk referensi."
                      searchable
                      placeholder="Cari berdasarkan nama…"
                      options={mockMembers
                        .filter((m) => m.tier !== "daily")
                        .map((m) => ({
                          value: m.id,
                          label: m.name,
                          desc: `${memberTierMeta[m.tier].label} · ${formatIDR(m.walletBalance, true)} wallet`,
                        }))}
                      value={memberId}
                      onChange={(v) => setMemberId(v as string)}
                      hint="Cari berdasarkan nama member terdaftar"
                    />
                    {submitted && !customerValid && (
                      <p className="mt-2 text-xs text-[var(--color-error,#ef4444)]">
                        Pilih member terlebih dahulu.
                      </p>
                    )}
                    {membership && membership.hasActivePlan && (
                      <div
                        className={[
                          "mt-3 rounded-xl border p-3",
                          quotaCovers
                            ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10"
                            : "border-[var(--border-default)] bg-[var(--surface-muted)]",
                        ].join(" ")}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            size="sm"
                            color={quotaCovers ? "success" : "neutral"}
                            variant={quotaCovers ? "solid" : "light"}
                          >
                            {membership.plan?.name ?? "Member"}
                          </Badge>
                          <span className="text-xs text-[var(--text-body)]">
                            Kuota booking: {membership.quotaRemaining}/{membership.quotaTotal} tersisa
                          </span>
                          {membership.resetAt && (
                            <span className="text-xs text-[var(--text-muted)]">
                              · reset {membership.resetAt}
                            </span>
                          )}
                        </div>
                        <p className="mt-1.5 text-xs text-[var(--text-caption)]">
                          {quotaCovers
                            ? "Slot ini GRATIS — dipotong dari kuota membership (semua lapangan & jam, termasuk peak)."
                            : membership.quotaTotal > 0
                              ? `Kuota gratis habis. Booking dikenakan tarif${
                                  membership.courtDiscountPct > 0
                                    ? ` (diskon ${membership.courtDiscountPct}%)`
                                    : ""
                                }.`
                              : "Plan ini tidak termasuk kuota booking gratis."}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="max-w-md">
                    <TextInput
                      label="Nama walk-in (harian)"
                      labelInfo="Nama tamu untuk identifikasi di kalender. Ditagih sebagai tamu tier harian, tanpa keanggotaan."
                      value={walkInName}
                      onChange={setWalkInName}
                      placeholder="cth. Arif (rombongan 4)"
                      hint="Ditagih sebagai tamu harian. Tanpa keanggotaan."
                      error={submitted && walkInName.trim().length < 2}
                      errorText="Nama minimal 2 karakter"
                    />
                  </div>
                )}
              </div>
            </FormSection>

            {/* Promo */}
            <FormSection
              step={4}
              title="Promo / Referral"
              description="Opsional — terapkan potongan harga"
              info="Masukkan kode promo atau referral untuk memotong harga sewa lapangan."
            >
              <div className="max-w-md rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-4">
                <PromoReferralInput
                  scope="booking"
                  amount={price}
                  tier={promoTier}
                  onChange={(s) => setPromoDiscount(s.discount)}
                />
              </div>
            </FormSection>
          </div>

          {/* Submit */}
          <div className="mt-8 flex items-center justify-between border-t border-[var(--border-default)] pt-5">
            <Button variant="outline" onClick={() => router.push("/bookings")}>
              Cancel
            </Button>
            <Button
              variant="primary"
              sheen
              glow
              disabled={submitted && !canSubmit}
              onClick={finalize}
            >
              {`Konfirmasi · ${formatIDR(payable)}`}
            </Button>
          </div>
        </Card>
      </div>

      {/* ── Sticky summary ── */}
      <div className="lg:col-span-1">
        <div className="lg:sticky lg:top-24 space-y-4">
          <Card variant="accent-top" accentColor={court?.color} padding="md">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-[var(--text-heading)]">
                Ringkasan booking
              </span>
              <ToneBadge tone={bookingTypeMeta[kind].tone}>
                {bookingTypeMeta[kind].label}
              </ToneBadge>
            </div>
            <dl className="space-y-2.5 text-sm">
              <Row label="Lapangan" value={court?.name ?? "—"} />
              <Row label="Tanggal" value={selectedKey} />
              <Row
                label="Jam"
                value={
                  hour !== null
                    ? `${pad(hour)}:00 – ${pad(hour + Math.floor(duration / 60))}:${pad(duration % 60)}`
                    : "—"
                }
              />
              <Row label="Durasi" value={`${duration} menit`} />
              <Row
                label="Pelanggan"
                value={
                  kind === "member"
                    ? (member?.name ?? "—")
                    : walkInName.trim()
                      ? `Walk-in · ${walkInName.trim()}`
                      : "—"
                }
              />
              <Row
                label="Tarif"
                value={
                  hour !== null ? (
                    <ToneBadge tone={isPeakHour(hour, isWeekend) ? "warning" : "success"}>
                      {isPeakHour(hour, isWeekend) ? "Peak" : "Off-peak"}
                    </ToneBadge>
                  ) : (
                    "—"
                  )
                }
              />
            </dl>
          </Card>

          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-muted)] p-5">
            {(quotaCovers || planDiscountPct > 0 || promoOnPlan > 0) && (
              <div className="mb-3 space-y-1.5 border-b border-[var(--border-default)] pb-3 text-sm">
                <div className="flex items-center justify-between text-[var(--text-caption)]">
                  <span>Tarif lapangan</span>
                  <span>{formatIDR(price)}</span>
                </div>
                {quotaCovers && (
                  <div className="flex items-center justify-between font-medium text-emerald-600 dark:text-emerald-400">
                    <span>Kuota membership</span>
                    <span>−{formatIDR(price)}</span>
                  </div>
                )}
                {!quotaCovers && planDiscountPct > 0 && (
                  <div className="flex items-center justify-between font-medium text-emerald-600 dark:text-emerald-400">
                    <span>Diskon plan ({planDiscountPct}%)</span>
                    <span>−{formatIDR(price - priceAfterPlan)}</span>
                  </div>
                )}
                {promoOnPlan > 0 && (
                  <div className="flex items-center justify-between font-medium text-emerald-600 dark:text-emerald-400">
                    <span>Promo</span>
                    <span>−{formatIDR(promoOnPlan)}</span>
                  </div>
                )}
              </div>
            )}
            <p className="text-sm text-[var(--text-caption)]">Total bayar</p>
            <p className="mt-1 text-3xl font-bold text-brand-600 dark:text-brand-400">
              {formatIDR(payable)}
            </p>
            {quotaCovers ? (
              <p className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                Gratis dari kuota membership · sisa {membership!.quotaRemaining - 1}/{membership!.quotaTotal} setelah booking ini
              </p>
            ) : (
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                {court?.name} · {duration} menit ·{" "}
                {hour !== null && isPeakHour(hour, isWeekend) ? "peak" : "off-peak"} rate
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-[var(--text-caption)]">{label}</dt>
      <dd className="text-right font-medium text-[var(--text-heading)]">{value}</dd>
    </div>
  );
}
