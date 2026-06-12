"use client";

// PadelHub — shared Personal-Training booking form (single-page grouped form,
// no stepper). Used by BOTH the owner/staff page (/coaching/pt/book,
// mode="staff" with a client-select group) and the member self-book page
// (/me/pt -> mode="self", the client is the signed-in member so that group is
// hidden). Sections flow top-to-bottom and every input carries an info tooltip.
// Deterministic availability comes from coachAvailability() in
// @/data/padel/club/pt so the grid is SSR-safe and never double-books a coach.

import React, { ReactNode, useMemo, useState } from "react";
import Card from "@/components/ui/card/Card";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import RadioGroup from "@/components/ui/input/RadioGroup";
import UiSelect from "@/components/ui/select/Select";
import InputLabel from "@/components/ui/input/InputLabel";
import EngageAvatar from "@/components/club-engage/EngageAvatar";
import { formatIDR, formatDateLong } from "@/components/club-engage/format";
import { useToast } from "@/components/ui/toast/ToastContext";
import {
  coaches,
  coachById,
  type Coach,
  type PTSession,
} from "@/data/padel/engage/coaches";
import {
  ptPackages,
  ptPackageById,
  coachAvailability,
  coachFreeSlots,
  COURT_FEE_PER_SESSION,
} from "@/data/padel/club/pt";
import { mockCourts, courtById, type Court } from "@/data/padel/club/courts";
import { mockMembers, type MemberTier } from "@/data/padel/club/members";
import PromoReferralInput from "@/components/shared/PromoReferralInput";

/* ── Icons ── */
const StarIcon = () => (
  <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M9.05 2.93c.3-.92 1.6-.92 1.9 0l1.28 3.95a1 1 0 00.95.69h4.15c.97 0 1.37 1.24.59 1.81l-3.36 2.44a1 1 0 00-.36 1.12l1.28 3.95c.3.92-.75 1.69-1.54 1.12l-3.36-2.44a1 1 0 00-1.18 0l-3.36 2.44c-.79.57-1.84-.2-1.54-1.12l1.28-3.95a1 1 0 00-.36-1.12L2.32 9.38c-.78-.57-.38-1.81.59-1.81h4.15a1 1 0 00.95-.69l1.04-3.95z" />
  </svg>
);

/** Daily date keys offered for booking (from demo "today" forward). */
function nextDays(count: number): string[] {
  const out: string[] = [];
  const base = new Date("2026-06-02T00:00:00");
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function weekdayLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-GB", { weekday: "short" });
}

export type PtBookingMode = "staff" | "self";

export interface PtBookingResult {
  coachId: string;
  clientName: string;
  date: string;
  startTime: string;
  includeCourt: boolean;
  courtId: string | null;
  packageId: string;
  sessions: number;
  /** coach fee per session (from package) */
  coachFeePerSession: number;
  /** court fee per session (0 if excluded) */
  courtFeePerSession: number;
  /** grand total across all sessions in the package */
  total: number;
  players: 1 | 2;
}

export interface PtBookingStepperProps {
  mode: PtBookingMode;
  /** self mode: pre-filled signed-in member name (client = self) */
  selfName?: string;
  /** called on confirm with the resolved booking */
  onConfirm: (result: PtBookingResult) => void;
  /** Back / cancel out of the form */
  onCancel: () => void;
}

const onlyActiveCoaches: Coach[] = coaches.filter((c) => c.status === "active");
const dateOptions = nextDays(10);
/** members that can be picked as PT clients (exclude one-off daily walk-ins). */
const clientMembers = mockMembers.filter((m) => m.tier !== "daily");

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
          <h3 className="text-sm font-semibold text-[var(--text-heading)]">{title}</h3>
          {info && <InputLabel label="" tooltip={info} className="mb-0" />}
        </div>
        {description && (
          <p className="mt-0.5 text-xs text-[var(--text-caption)]">{description}</p>
        )}
      </div>
    </div>
    {children}
  </section>
);

const PtBookingStepper: React.FC<PtBookingStepperProps> = ({
  mode,
  selfName,
  onConfirm,
  onCancel,
}) => {
  const toast = useToast();
  const isStaff = mode === "staff";

  // ── Form state ──
  const [clientId, setClientId] = useState<string>(clientMembers[0]?.id ?? "");
  const [coachId, setCoachId] = useState<string>(onlyActiveCoaches[0]?.id ?? "");
  const [date, setDate] = useState<string>(dateOptions[1] ?? dateOptions[0]);
  const [time, setTime] = useState<string>("");
  const [includeCourt, setIncludeCourt] = useState<boolean>(true);
  const [courtId, setCourtId] = useState<string>("");
  const [packageId, setPackageId] = useState<string>(ptPackages[1]?.id ?? ptPackages[0].id);
  const [players, setPlayers] = useState<1 | 2>(1);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const coach = coachById(coachId);
  const clientName =
    mode === "self"
      ? selfName ?? "You"
      : clientMembers.find((m) => m.id === clientId)?.name ?? "";

  // Deterministic availability grid for the chosen coach+date.
  const slots = useMemo(() => coachAvailability(coachId, date), [coachId, date]);

  const bookableCourts: Court[] = mockCourts.filter((c) => c.status === "active");
  const selectedCourt = includeCourt ? courtById(courtId) : undefined;

  // ── Pricing ──
  const pkg = ptPackageById(packageId);
  const coachFee = pkg?.pricePerSession ?? coach?.ratePerHour ?? 0;
  const courtFee = includeCourt ? COURT_FEE_PER_SESSION : 0;
  const perSession = coachFee + courtFee;
  const sessions = pkg?.sessions ?? 1;
  const total = perSession * sessions;

  const appliedPromo = Math.min(promoDiscount, total);
  const payable = Math.max(total - appliedPromo, 0);

  const promoTier: MemberTier =
    mode === "staff"
      ? clientMembers.find((m) => m.id === clientId)?.tier ?? "casual"
      : mockMembers.find((m) => m.name === clientName)?.tier ?? "casual";

  // ── Validation ──
  const clientValid = !isStaff || Boolean(clientId);
  const coachValid = Boolean(coachId);
  const timeValid = Boolean(time);
  const courtValid = includeCourt ? Boolean(courtId) : true;
  const canSubmit = clientValid && coachValid && timeValid && courtValid;

  let sectionNo = 0;

  const handleConfirm = () => {
    setSubmitted(true);
    if (!canSubmit) {
      if (!timeValid) toast.warning("Pilih slot waktu dulu.");
      else if (!courtValid) toast.warning("Pilih lapangan atau ganti ke coach-only.");
      else toast.warning("Lengkapi data booking dulu.");
      return;
    }
    onConfirm({
      coachId,
      clientName,
      date,
      startTime: time,
      includeCourt,
      courtId: includeCourt ? courtId : null,
      packageId,
      sessions,
      coachFeePerSession: coachFee,
      courtFeePerSession: courtFee,
      total: payable,
      players,
    });
  };

  return (
    <Card padding="lg" variant="premium">
      <div className="space-y-8">
        {/* ── Client (staff only) ── */}
        {isStaff && (
          <FormSection
            step={++sectionNo}
            title="Klien"
            description="Member yang akan latihan"
            info="Pilih member terdaftar yang akan mengikuti sesi personal training ini."
          >
            <div className="max-w-md space-y-3">
              <UiSelect
                label="Member"
                labelInfo="Cari member berdasarkan nama. Daily walk-in tidak bisa dipilih untuk PT."
                value={clientId}
                onChange={(v) => setClientId(v as string)}
                placeholder="Cari member"
                searchable
                options={clientMembers.map((m) => ({
                  value: m.id,
                  label: m.name,
                  desc: `${m.phone} · ${m.city}`,
                }))}
              />
              {clientId && (
                <div className="flex items-center gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-3">
                  <EngageAvatar
                    src={clientMembers.find((m) => m.id === clientId)?.avatar}
                    name={clientName}
                    size={40}
                  />
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-heading)]">{clientName}</p>
                    <p className="text-xs text-[var(--text-caption)]">
                      {clientMembers.find((m) => m.id === clientId)?.city}
                    </p>
                  </div>
                </div>
              )}
              {submitted && !clientValid && (
                <p className="text-xs text-[var(--color-error,#ef4444)]">
                  Pilih member terlebih dahulu.
                </p>
              )}
            </div>
          </FormSection>
        )}

        {/* ── Coach ── */}
        <FormSection
          step={++sectionNo}
          title="Pelatih"
          description="Pilih coach untuk sesi ini"
          info="Tarif yang tampil adalah tarif per jam standar; harga final mengikuti paket yang dipilih di bawah. Jumlah slot kosong mengikuti tanggal yang dipilih."
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {onlyActiveCoaches.map((c) => {
              const active = c.id === coachId;
              const free = coachFreeSlots(c.id, date);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setCoachId(c.id);
                    setTime("");
                  }}
                  className={[
                    "flex items-start gap-3 rounded-2xl border p-4 text-left transition-all",
                    active
                      ? "border-[var(--color-primary)] bg-[var(--color-primary-light)] ring-2 ring-[var(--color-primary)]/30"
                      : "border-[var(--border-default)] bg-[var(--surface-card)] hover:border-[var(--color-primary)]/40 hover:-translate-y-0.5",
                  ].join(" ")}
                >
                  <EngageAvatar src={c.avatar} name={c.name} size={48} ring={active} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-semibold text-[var(--text-heading)]">{c.name}</p>
                      <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-amber-500">
                        <StarIcon />
                        {c.rating}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-caption)]">{c.level}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {c.specialties.slice(0, 2).map((s) => (
                        <Badge key={s} size="sm" color="info" variant="light">
                          {s}
                        </Badge>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-[var(--text-caption)]">
                      <span className="font-semibold text-[var(--color-primary)]">
                        {formatIDR(c.ratePerHour)}
                      </span>
                      /hr ·{" "}
                      <span className={free > 0 ? "text-emerald-500" : "text-rose-500"}>
                        {free} slot kosong
                      </span>
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </FormSection>

        {/* ── Schedule ── */}
        <FormSection
          step={++sectionNo}
          title="Jadwal"
          description="Tanggal & slot waktu"
          info="Pilih tanggal lalu slot waktu. Slot yang dicoret/abu-abu sudah ter-booking untuk coach ini."
        >
          <div className="space-y-5">
            <div>
              <InputLabel
                label="Tanggal"
                tooltip="10 hari ke depan dari hari ini. Mengubah tanggal akan memuat ulang ketersediaan coach."
              />
              <div className="flex flex-wrap gap-2">
                {dateOptions.map((d) => {
                  const active = d === date;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        setDate(d);
                        setTime("");
                      }}
                      className={[
                        "flex min-w-[64px] flex-col items-center rounded-xl border px-3 py-2 text-center transition-all",
                        active
                          ? "border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)]"
                          : "border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-body)] hover:border-[var(--color-primary)]/40",
                      ].join(" ")}
                    >
                      <span className="text-[11px] uppercase tracking-wide opacity-70">
                        {weekdayLabel(d)}
                      </span>
                      <span className="text-sm font-semibold">{d.slice(8, 10)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <InputLabel
                label={`Slot waktu · Coach ${coach?.name.split(" ")[0] ?? ""}`}
                tooltip="Slot abu-abu/dicoret sudah ter-booking. Pilih satu slot yang tersedia."
              />
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {slots.map((s) => {
                  const active = s.time === time;
                  return (
                    <button
                      key={s.time}
                      type="button"
                      disabled={!s.available}
                      onClick={() => setTime(s.time)}
                      className={[
                        "rounded-lg border px-2 py-2 text-sm font-medium transition-all",
                        !s.available
                          ? "cursor-not-allowed border-[var(--border-light)] bg-[var(--surface-muted)] text-[var(--text-muted)] line-through"
                          : active
                            ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-text)] shadow-theme-sm"
                            : "border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-body)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]",
                      ].join(" ")}
                    >
                      {s.time}
                    </button>
                  );
                })}
              </div>
              {slots.every((s) => !s.available) && (
                <p className="mt-3 text-sm text-rose-500">
                  Tidak ada slot kosong untuk coach ini pada {formatDateLong(date)}. Coba tanggal lain.
                </p>
              )}
              {submitted && !timeValid && slots.some((s) => s.available) && (
                <p className="mt-2 text-xs text-[var(--color-error,#ef4444)]">
                  Pilih slot waktu terlebih dahulu.
                </p>
              )}
            </div>
          </div>
        </FormSection>

        {/* ── Court & players ── */}
        <FormSection
          step={++sectionNo}
          title="Lapangan & Pemain"
          description="Sewa lapangan atau coach-only"
          info="Pilih apakah ingin sekalian booking lapangan, lalu tentukan jumlah pemain."
        >
          <div className="space-y-5">
            <div>
              <InputLabel
                label="Pengaturan lapangan"
                tooltip={`Reserve court menambah biaya ${formatIDR(COURT_FEE_PER_SESSION)}/sesi. Pilih coach-only jika member sudah punya lapangan sendiri.`}
              />
              <RadioGroup
                value={includeCourt ? "include" : "exclude"}
                onChange={(v) => setIncludeCourt(v === "include")}
                options={[
                  {
                    value: "include",
                    label: "Reserve lapangan (disarankan)",
                    description: `Booking lapangan sekalian dengan coach. +${formatIDR(COURT_FEE_PER_SESSION)} / sesi.`,
                  },
                  {
                    value: "exclude",
                    label: "Coach only",
                    description: "Member sudah punya lapangan, atau bawa slot sendiri.",
                  },
                ]}
              />
            </div>

            {includeCourt && (
              <div>
                <InputLabel
                  label="Pilih lapangan"
                  tooltip="Hanya lapangan aktif yang ditampilkan. Warna = warna lapangan di kalender."
                />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {bookableCourts.map((c) => {
                    const active = c.id === courtId;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCourtId(c.id)}
                        className={[
                          "flex items-center gap-3 rounded-2xl border p-3 text-left transition-all",
                          active
                            ? "border-[var(--color-primary)] bg-[var(--color-primary-light)] ring-2 ring-[var(--color-primary)]/30"
                            : "border-[var(--border-default)] bg-[var(--surface-card)] hover:border-[var(--color-primary)]/40",
                        ].join(" ")}
                      >
                        <span
                          className="h-10 w-10 shrink-0 rounded-xl"
                          style={{ backgroundColor: c.color }}
                        />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-[var(--text-heading)]">
                            {c.name}
                          </p>
                          <p className="text-xs text-[var(--text-caption)]">
                            {c.environment === "indoor" ? "Indoor" : "Outdoor"} · {c.wall === "glass" ? "Glass" : "Mesh"}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {submitted && !courtValid && (
                  <p className="mt-2 text-xs text-[var(--color-error,#ef4444)]">
                    Pilih lapangan atau ganti ke coach-only.
                  </p>
                )}
              </div>
            )}

            <div>
              <InputLabel
                label="Jumlah pemain"
                tooltip="1-on-1 = privat dengan coach. Pair = 1 coach untuk 2 pemain."
              />
              <RadioGroup
                direction="horizontal"
                value={String(players)}
                onChange={(v) => setPlayers(Number(v) === 2 ? 2 : 1)}
                options={[
                  { value: "1", label: "1-on-1" },
                  { value: "2", label: "Pair (1-on-2)" },
                ]}
              />
            </div>
          </div>
        </FormSection>

        {/* ── Package + review ── */}
        <FormSection
          step={++sectionNo}
          title="Paket & Ringkasan"
          description="Pilih paket sesi, promo, lalu konfirmasi"
          info="Paket menentukan jumlah sesi dan tarif per sesi. Promo memotong total sebelum bayar."
        >
          <div className="space-y-5">
            <div>
              <InputLabel
                label="Paket sesi"
                tooltip="Makin banyak sesi, makin hemat tarif per sesinya."
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {ptPackages.map((p) => {
                  const active = p.id === packageId;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPackageId(p.id)}
                      className={[
                        "rounded-2xl border p-4 text-left transition-all",
                        active
                          ? "border-[var(--color-primary)] bg-[var(--color-primary-light)] ring-2 ring-[var(--color-primary)]/30"
                          : "border-[var(--border-default)] bg-[var(--surface-card)] hover:border-[var(--color-primary)]/40",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-[var(--text-heading)]">{p.label}</p>
                        <Badge size="sm" color="info" variant="light">
                          {p.sessions}x
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-[var(--text-caption)]">{p.note}</p>
                      <p className="mt-2 text-sm">
                        <span className="font-semibold text-[var(--color-primary)]">
                          {formatIDR(p.pricePerSession)}
                        </span>
                        <span className="text-[var(--text-muted)]"> / sesi</span>
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Promo / referral — applies to the package total. */}
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-4">
              <InputLabel
                label="Kode promo / referral"
                tooltip="Punya kode promo atau referral? Masukkan untuk memotong total paket."
              />
              <PromoReferralInput
                scope="pt"
                amount={total}
                tier={promoTier}
                onChange={(s) => setPromoDiscount(s.discount)}
              />
            </div>

            {/* Review + price breakdown */}
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-muted)] p-4">
              <h4 className="mb-3 text-sm font-semibold text-[var(--text-heading)]">Ringkasan</h4>
              <dl className="space-y-2 text-sm">
                <Row label="Klien" value={clientName || "—"} />
                <Row label="Coach" value={`${coach?.name ?? "—"} · ${coach?.level ?? ""}`} />
                <Row label="Waktu" value={`${formatDateLong(date)} · ${time || "—"}`} />
                <Row
                  label="Lapangan"
                  value={selectedCourt ? selectedCourt.name : "Coach only (tanpa lapangan)"}
                />
                <Row label="Pemain" value={players === 2 ? "Pair (1-on-2)" : "1-on-1"} />
                <Row label="Paket" value={`${pkg?.label} (${sessions} sesi)`} />
              </dl>

              <div className="mt-4 space-y-2 border-t border-[var(--border-default)] pt-3 text-sm">
                <Row label={`Coach fee × ${sessions}`} value={formatIDR(coachFee * sessions)} muted />
                {includeCourt && (
                  <Row label={`Court fee × ${sessions}`} value={formatIDR(courtFee * sessions)} muted />
                )}
                {appliedPromo > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-caption)]">Promo</span>
                    <span className="font-medium text-emerald-500">−{formatIDR(appliedPromo)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-[var(--border-default)] pt-2">
                  <span className="text-sm font-semibold text-[var(--text-heading)]">Total</span>
                  <span className="text-xl font-bold text-[var(--color-primary)]">
                    {formatIDR(payable)}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">
                  {formatIDR(perSession)} per sesi · {sessions} sesi
                </p>
              </div>
            </div>
          </div>
        </FormSection>
      </div>

      {/* ── Footer nav ── */}
      <div className="mt-8 flex items-center justify-between border-t border-[var(--border-light)] pt-5">
        <Button variant="ghost" onClick={onCancel}>
          Batal
        </Button>
        <Button
          variant="primary"
          glow
          sheen
          disabled={submitted && !canSubmit}
          onClick={handleConfirm}
        >
          Konfirmasi Booking · {formatIDR(payable)}
        </Button>
      </div>
    </Card>
  );
};

/** Small review row. */
const Row: React.FC<{ label: string; value: string; muted?: boolean }> = ({
  label,
  value,
  muted,
}) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-[var(--text-caption)]">{label}</span>
    <span
      className={
        muted
          ? "font-medium text-[var(--text-body)]"
          : "font-semibold text-[var(--text-heading)]"
      }
    >
      {value}
    </span>
  </div>
);

/** Build a PTSession (legacy shape) from a booking result for list display. */
export function ptSessionFromResult(
  r: PtBookingResult,
  clientAvatar = "/images/user/user-04.jpg",
): PTSession {
  return {
    id: `pt-${Date.now()}`,
    coachId: r.coachId,
    clientName: r.clientName,
    clientAvatar,
    date: r.date,
    startTime: r.startTime,
    durationMin: 60,
    court: r.courtId ? courtById(r.courtId)?.name ?? "—" : "Coach only",
    focus: `${ptPackageById(r.packageId)?.label ?? "PT"} · ${r.players === 2 ? "Pair" : "1-on-1"}`,
    players: r.players,
    price: r.total,
    status: "confirmed",
  };
}

export default PtBookingStepper;
