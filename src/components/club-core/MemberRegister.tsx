"use client";

// PadelHub — member registration (single-page grouped form, no stepper).
// All sections render top-to-bottom in grouped cards; every field label carries
// an info tooltip. The "daily" walk-in tier books like a normal customer (no
// free quota, always pays) and hides the coaching section's free benefit; it
// can still add paid coaching. Coaching is ad-hoc/casual (no fixed package) —
// each session is priced at the coach's own rate, with the first N sessions
// waived for tiers that bundle free coaching. Availability + ids are derived
// deterministically from inputs (no DB); the final member-no + temp password
// are the only random values. Court bookings and court-included PT sessions
// persist via useClubData.addBooking; the new member is pushed to localStorage
// 'padelhub-registered-members'.

import React, { ReactNode, useMemo, useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Card from "@/components/ui/card/Card";
import Button from "@/components/ui/button/Button";
import TextInput from "@/components/ui/input/TextInput";
import PhoneInput, { type Country } from "@/components/ui/input/PhoneInput";
import InputLabel from "@/components/ui/input/InputLabel";
import Badge from "@/components/ui/badge/Badge";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast/ToastContext";
import { useClubData } from "@/components/club-core/ClubDataContext";
import { formatIDR } from "@/components/club-core/format";
import countriesData from "@/data/countries.json";
import {
  memberTierMeta,
  type MemberTier,
} from "@/data/padel/club/members";
import { courtById } from "@/data/padel/club/courts";
import {
  COURT_FEE_PER_SESSION,
  ptPackages,
  ptPackageById,
} from "@/data/padel/club/pt";
import { coachById } from "@/data/padel/engage/coaches";
import PromoReferralInput from "@/components/shared/PromoReferralInput";
import CourtBookingStep from "./register/CourtBookingStep";
import PtSessionStep from "./register/PtSessionStep";
import RegisterSummary, {
  type CostBreakdown,
} from "./register/RegisterSummary";
import {
  type DraftBooking,
  type DraftPtSession,
  type CoachingMode,
  pad,
  tierJoinFee,
  tierQuota,
  tierFreeCoaching,
  registrableTiers,
} from "./register/types";

const countries = countriesData as Country[];

const coachRate = (coachId: string): number =>
  coachById(coachId)?.ratePerHour ?? 0;

const emailValid = (e: string) =>
  e.trim().length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

let draftSeq = 0;
const nextId = (p: string) => `${p}-${++draftSeq}`;

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
          {info && (
            <InputLabel label="" tooltip={info} className="mb-0" />
          )}
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

export default function MemberRegister() {
  const toast = useToast();
  const { courts, bookings, addBooking, isReady } = useClubData();

  // ── identity + tier ──
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [tier, setTier] = useState<MemberTier>("pro");

  // ── per-section assemblies ──
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [courtDrafts, setCourtDrafts] = useState<DraftBooking[]>([]);
  const [ptEnabled, setPtEnabled] = useState(false);
  const [coachingMode, setCoachingMode] = useState<CoachingMode>("package");
  const [packageId, setPackageId] = useState(ptPackages[0].id);
  const [ptSessions, setPtSessions] = useState<DraftPtSession[]>([]);

  const [submitted, setSubmitted] = useState(false);
  const [done, setDone] = useState<null | { memberNo: string; password: string }>(null);

  // daily walk-in: books & pays like a normal customer, no free quota
  const isDaily = tier === "daily";
  const quota = tierQuota[tier];
  const freeCoaching = tierFreeCoaching[tier];

  // Package mode fixes the per-session coach fee; casual uses the coach's rate.
  const pkg = ptPackageById(packageId) ?? ptPackages[0];
  const isPackage = coachingMode === "package";
  const coachFeeFor = (coachId: string): number =>
    isPackage ? pkg.pricePerSession : coachRate(coachId);

  // ── cost breakdown ──
  // PT "include" court sessions CONSUME the court quota (free while within quota).
  // PT "existing" court sessions use an already-booked court → Rp0 extra, no quota hit.
  // Total court slots = court bookings + PT-include-NEW-court sessions.
  // Coaching is priced per coach rate; the first `freeCoaching` sessions have
  // their coach fee waived (court fee, if any, still applies).
  const cost: CostBreakdown = useMemo(() => {
    const joinFee = tierJoinFee[tier];
    const appliedPromo = Math.min(promoDiscount, joinFee);

    const ptNewCourtCount = ptEnabled
      ? ptSessions.filter((s) => s.courtMode === "include").length
      : 0;

    const totalCourtSlots = courtDrafts.length + ptNewCourtCount;
    const courtIncluded = Math.min(totalCourtSlots, quota);
    const courtPaid = Math.max(totalCourtSlots - quota, 0);

    const courtFeeTotal = courtDrafts
      .slice(quota)
      .reduce((sum, d) => sum + d.price, 0);

    const quotaAfterCourts = Math.max(quota - courtDrafts.length, 0);
    const ptCourtPaid = Math.max(ptNewCourtCount - quotaAfterCourts, 0);
    const ptCourtFeeTotal = ptCourtPaid * COURT_FEE_PER_SESSION;

    const activePtSessions = ptEnabled ? ptSessions : [];
    const ptCount = activePtSessions.length;
    // Per-session coach fee: fixed by package, or the coach's own rate (casual).
    const memoPkg = ptPackageById(packageId) ?? ptPackages[0];
    const feeFor = (cId: string) =>
      coachingMode === "package" ? memoPkg.pricePerSession : coachRate(cId);
    // Full coach-fee total (no waiver) for display.
    const ptCoachFeeTotal = activePtSessions.reduce(
      (sum, s) => sum + feeFor(s.coachId),
      0,
    );
    // Charged coach fee: first `freeCoaching` sessions waived.
    const chargedCoach = activePtSessions
      .slice(freeCoaching)
      .reduce((sum, s) => sum + feeFor(s.coachId), 0);
    const ptCoachWaivedTotal = ptCoachFeeTotal - chargedCoach;
    const freeUsed = Math.min(ptCount, freeCoaching);

    const grandTotal =
      Math.max(joinFee - appliedPromo, 0) +
      courtFeeTotal +
      chargedCoach +
      ptCourtFeeTotal;

    return {
      joinFee,
      courtIncluded,
      courtPaid,
      courtFeeTotal,
      ptCoachFeeTotal,
      ptCoachChargedTotal: chargedCoach,
      ptCoachWaivedTotal,
      ptCourtFeeTotal,
      freeCoaching,
      freeUsed,
      promoDiscount: appliedPromo,
      grandTotal,
    };
  }, [
    tier,
    promoDiscount,
    courtDrafts,
    quota,
    ptEnabled,
    ptSessions,
    freeCoaching,
    coachingMode,
    packageId,
  ]);

  // ── validation ──
  const identityValid =
    name.trim().length >= 2 &&
    phone.replace(/\D/g, "").length >= 8 &&
    emailValid(email);
  const courtValid = isDaily ? courtDrafts.length === 1 : true;
  // Package mode: must schedule exactly the package's session count.
  // Casual mode: at least one session.
  const ptValid =
    !ptEnabled ||
    (isPackage
      ? ptSessions.length === pkg.sessions
      : ptSessions.length > 0);
  const canSubmit = identityValid && courtValid && ptValid;

  // ── persistence ──
  const finalize = () => {
    setSubmitted(true);
    if (!canSubmit) {
      toast.error(
        "Lengkapi data wajib sebelum menyimpan.",
        "Form belum lengkap",
      );
      return;
    }

    const customerLabel = isDaily ? `Walk-in · ${name.trim()}` : name.trim();

    // court bookings
    courtDrafts.forEach((d) => {
      const court = courtById(d.courtId);
      const startIso = `${d.dateKey}T${pad(d.hour)}:00:00`;
      const endH = d.hour + Math.floor(d.duration / 60);
      const endM = d.duration % 60;
      const endIso = `${d.dateKey}T${pad(endH)}:${pad(endM)}:00`;
      const idx = courtDrafts.indexOf(d);
      const charged = idx < quota ? 0 : d.price;
      addBooking({
        courtId: d.courtId,
        start: startIso,
        end: endIso,
        type: isDaily ? "walk_in" : "member",
        status: "confirmed",
        customer: customerLabel,
        partySize: court?.format === "single" ? 2 : 4,
        price: charged,
        note: idx < quota ? "Included in membership" : undefined,
        createdBy: "Registration desk",
      });
    });

    // PT sessions — only "include" (new court) creates a booking; "existing"
    // reuses the court already persisted, "exclude" has no court. The first
    // `freeCoaching` sessions (across all sessions, in order) have the coach
    // fee waived.
    if (ptEnabled) {
      const quotaAfterCourts = Math.max(quota - courtDrafts.length, 0);
      let ptCourtUsed = 0;
      ptSessions
        .filter((s) => s.courtMode === "include" && s.courtId)
        .forEach((s) => {
          const court = courtById(s.courtId!);
          const hour = Number(s.time.slice(0, 2));
          const startIso = `${s.dateKey}T${pad(hour)}:00:00`;
          const endIso = `${s.dateKey}T${pad(hour + 1)}:00:00`;
          const coach = coachById(s.coachId);
          const courtIncludedHere = ptCourtUsed < quotaAfterCourts;
          ptCourtUsed++;
          const courtCharge = courtIncludedHere ? 0 : COURT_FEE_PER_SESSION;
          // free-coaching applies by overall session order
          const sessionIndex = ptSessions.indexOf(s);
          const coachIsFree = sessionIndex < freeCoaching;
          const coachCharge = coachIsFree ? 0 : coachFeeFor(s.coachId);
          addBooking({
            courtId: s.courtId!,
            start: startIso,
            end: endIso,
            type: "coaching",
            status: "confirmed",
            customer: customerLabel,
            partySize: court?.format === "single" ? 2 : 4,
            price: coachCharge + courtCharge,
            note: courtIncludedHere
              ? `PT w/ ${coach?.name ?? "coach"} · court included`
              : `PT w/ ${coach?.name ?? "coach"}`,
            createdBy: "Registration desk",
          });
        });
    }

    const memberNo = isDaily
      ? `PHB-DAY-${String(100 + Math.floor(Math.random() * 899))}`
      : `PHB-2026-${String(1000 + Math.floor(Math.random() * 8999))}`;
    const password = Math.random().toString(36).slice(2, 8).toUpperCase();
    try {
      const KEY = "padelhub-registered-members";
      const prev = JSON.parse(window.localStorage.getItem(KEY) || "[]");
      prev.push({
        memberNo,
        name: name.trim(),
        phone,
        email: email.trim(),
        tier,
        coachingInterest: ptEnabled,
        coachingMode: ptEnabled ? coachingMode : undefined,
        coachingPackage: ptEnabled && isPackage ? packageId : undefined,
        isDaily,
        courtBookings: courtDrafts.length,
        ptSessions: ptEnabled ? ptSessions.length : 0,
        totalPaid: cost.grandTotal,
        onboarded: false,
        createdAt: new Date().toISOString(),
      });
      window.localStorage.setItem(KEY, JSON.stringify(prev));
    } catch {
      /* ignore */
    }

    setDone({ memberNo, password });
    toast.success(
      `${name.trim()} terdaftar${isDaily ? " sebagai walk-in harian" : ""}.`,
      "Registrasi berhasil",
    );
  };

  const reset = () => {
    setName("");
    setPhone("");
    setEmail("");
    setTier("pro");
    setPromoDiscount(0);
    setCourtDrafts([]);
    setPtEnabled(false);
    setCoachingMode("package");
    setPackageId(ptPackages[0].id);
    setPtSessions([]);
    setSubmitted(false);
    setDone(null);
  };

  // ── loading skeleton ──
  if (!isReady) {
    return (
      <div>
        <PageBreadcrumb pageTitle="Registrasi Member" />
        <Card padding="lg">
          <div className="space-y-4">
            <div className="h-10 w-full animate-pulse rounded-lg bg-[var(--surface-muted)]" />
            <div className="h-40 w-full animate-pulse rounded-xl bg-[var(--surface-muted)]" />
          </div>
        </Card>
      </div>
    );
  }

  let sectionNo = 0;

  return (
    <div>
      <PageBreadcrumb pageTitle="Registrasi Member" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── Form ── */}
        <div className="lg:col-span-2">
          <Card padding="lg">
            <div className="space-y-8">
              {/* Identitas */}
              <FormSection
                step={++sectionNo}
                title="Identitas"
                description="Data diri member"
                info="Informasi dasar untuk membuat akun member dan menghubungi mereka."
              >
                <div className="grid grid-cols-1 gap-5">
                  <TextInput
                    label="Nama Lengkap"
                    labelInfo="Nama lengkap sesuai kartu identitas. Akan tampil di profil & invoice."
                    value={name}
                    onChange={setName}
                    placeholder="cth. Andi Wijaya"
                    required
                    error={submitted && name.trim().length < 2}
                    errorText="Nama minimal 2 karakter"
                  />
                  <PhoneInput
                    label="Nomor Telepon"
                    labelInfo="Nomor aktif untuk notifikasi booking & WhatsApp. Format: +62 8xx xxxx xxxx."
                    required
                    countries={countries}
                    value={phone}
                    onChange={(full) => setPhone(full)}
                    error={submitted && phone.replace(/\D/g, "").length < 8}
                    hint={
                      submitted && phone.replace(/\D/g, "").length < 8
                        ? "Nomor telepon belum valid"
                        : "Format: +62 8xx xxxx xxxx"
                    }
                  />
                  <TextInput
                    label="Email (opsional)"
                    labelInfo="Digunakan untuk login ke member portal & notifikasi email. Boleh dikosongkan."
                    type="email"
                    value={email}
                    onChange={setEmail}
                    placeholder="cth. andi@email.com"
                    validate
                    hint="Digunakan untuk login & notifikasi"
                  />
                </div>
              </FormSection>

              {/* Membership */}
              <FormSection
                step={++sectionNo}
                title="Membership"
                description="Pilih tier keanggotaan"
                info="Tier menentukan join fee, kuota court gratis, dan jatah coaching gratis."
              >
                <div className="space-y-5">
                  <div>
                    <InputLabel
                      label="Tier Membership"
                      tooltip="Daily Walk-in = booking sekali main, bayar seperti biasa, tanpa join fee. Pro/Elite punya kuota court included & jatah coaching gratis."
                    />
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {registrableTiers.map((t) => {
                        const meta = memberTierMeta[t];
                        const active = t === tier;
                        const q = tierQuota[t];
                        const free = tierFreeCoaching[t];
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setTier(t)}
                            className={[
                              "rounded-2xl border p-4 text-left transition-all",
                              active
                                ? "border-[var(--color-primary)] bg-[var(--color-primary-light)] ring-2 ring-[var(--color-primary)]/30"
                                : "border-[var(--border-default)] bg-[var(--surface-card)] hover:border-[var(--color-primary)]/40",
                            ].join(" ")}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
                                style={{ background: meta.color }}
                              >
                                {meta.label}
                              </span>
                              <span className="text-sm font-bold text-[var(--text-heading)]">
                                {tierJoinFee[t] === 0 ? "Tanpa join fee" : formatIDR(tierJoinFee[t])}
                              </span>
                            </div>
                            <p className="mt-2 text-xs text-[var(--text-caption)]">
                              {meta.perk}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {q > 0 && (
                                <Badge size="sm" color="info" variant="light">
                                  {q}x court included
                                </Badge>
                              )}
                              {free > 0 && (
                                <Badge size="sm" color="success" variant="light">
                                  Free coaching {free}x
                                </Badge>
                              )}
                              {t === "daily" && (
                                <Badge size="sm" color="warning" variant="light">
                                  Bayar per main
                                </Badge>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-4">
                    <div className="mb-3 flex items-center gap-1.5">
                      <p className="text-xs font-medium text-[var(--text-caption)]">
                        Join fee {formatIDR(cost.joinFee)}
                      </p>
                      <InputLabel
                        label=""
                        className="mb-0"
                        tooltip="Masukkan kode promo atau referral untuk memotong join fee."
                      />
                    </div>
                    <PromoReferralInput
                      scope="membership"
                      amount={cost.joinFee}
                      tier={tier}
                      onChange={(s) => setPromoDiscount(s.discount)}
                    />
                  </div>
                </div>
              </FormSection>

              {/* Court booking */}
              <FormSection
                step={++sectionNo}
                title="Booking Court"
                description={
                  isDaily
                    ? "Walk-in wajib memilih 1 slot court hari ini"
                    : "Opsional — booking court untuk member baru"
                }
                info={
                  isDaily
                    ? "Member harian harus memesan tepat 1 slot court untuk hari ini."
                    : "Tambahkan booking court. Slot dalam kuota tier dihitung gratis, sisanya dikenakan tarif."
                }
              >
                <CourtBookingStep
                  tier={tier}
                  courts={courts}
                  bookings={bookings}
                  drafts={courtDrafts}
                  onAdd={(b) =>
                    setCourtDrafts((prev) => [...prev, { ...b, id: nextId("cb") }])
                  }
                  onRemove={(id) =>
                    setCourtDrafts((prev) => prev.filter((d) => d.id !== id))
                  }
                />
                {submitted && !courtValid && (
                  <p className="mt-3 text-xs text-[var(--color-error,#ef4444)]">
                    Member harian wajib memilih tepat 1 slot court hari ini.
                  </p>
                )}
              </FormSection>

              {/* Pelatih / PT — tersedia untuk semua tier (daily tetap bayar) */}
              <FormSection
                step={++sectionNo}
                title="Pelatih (Personal Training)"
                description="Opsional — pilih paket atau bayar per sesi"
                info="Aktifkan jika member ingin sesi latihan privat. Pilih model Paket (tarif tetap, jumlah sesi sesuai paket) atau Casual (bayar per sesi sesuai tarif coach). Tier dengan benefit free coaching otomatis menggratiskan beberapa sesi pertama."
              >
                <PtSessionStep
                  enabled={ptEnabled}
                  onToggle={(v) => {
                    setPtEnabled(v);
                    if (!v) setPtSessions([]);
                  }}
                  mode={coachingMode}
                  onModeChange={(m) => {
                    setCoachingMode(m);
                    setPtSessions([]);
                  }}
                  packageId={packageId}
                  onPackageChange={(id) => {
                    setPackageId(id);
                    setPtSessions([]);
                  }}
                  freeCoaching={freeCoaching}
                  courts={courts}
                  bookings={bookings}
                  courtDrafts={courtDrafts}
                  sessions={ptSessions}
                  onAdd={(s) =>
                    setPtSessions((prev) => [...prev, { ...s, id: nextId("pt") }])
                  }
                  onRemove={(id) =>
                    setPtSessions((prev) => prev.filter((x) => x.id !== id))
                  }
                />
                {submitted && ptEnabled && !ptValid && (
                  <p className="mt-3 text-xs text-[var(--color-error,#ef4444)]">
                    {isPackage
                      ? `Jadwalkan tepat ${pkg.sessions} sesi sesuai paket yang dipilih.`
                      : "Tambahkan minimal 1 sesi coaching atau matikan opsi pelatih."}
                  </p>
                )}
              </FormSection>

              {/* Ringkasan */}
              <FormSection
                step={++sectionNo}
                title="Ringkasan"
                description="Periksa kembali sebelum menyimpan"
                info="Pastikan semua data sudah benar. Klik konfirmasi untuk menyimpan member & memproses pembayaran."
              >
                <div className="space-y-5">
                  <div>
                    <h4 className="mb-3 text-sm font-semibold text-[var(--text-heading)]">
                      Member
                    </h4>
                    <dl className="space-y-2 text-sm">
                      <ReviewRow label="Nama" value={name.trim() || "—"} />
                      <ReviewRow label="Telepon" value={phone || "—"} />
                      <ReviewRow label="Email" value={email.trim() || "—"} />
                      <ReviewRow label="Tier" value={memberTierMeta[tier].label} />
                    </dl>
                  </div>

                  {courtDrafts.length > 0 && (
                    <div>
                      <h4 className="mb-3 text-sm font-semibold text-[var(--text-heading)]">
                        Court bookings
                      </h4>
                      <div className="space-y-2">
                        {courtDrafts.map((d, i) => {
                          const c = courtById(d.courtId);
                          const free = i < quota;
                          return (
                            <div
                              key={d.id}
                              className="flex items-center justify-between gap-3 text-sm"
                            >
                              <span className="text-[var(--text-body)]">
                                {c?.name} · {d.dateKey} · {pad(d.hour)}:00 · {d.duration}m
                              </span>
                              <span
                                className={
                                  free
                                    ? "font-medium text-emerald-500"
                                    : "font-semibold text-[var(--text-heading)]"
                                }
                              >
                                {free ? "Included" : formatIDR(d.price)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {ptEnabled && ptSessions.length > 0 && (
                    <div>
                      <h4 className="mb-3 text-sm font-semibold text-[var(--text-heading)]">
                        Coaching sessions
                      </h4>
                      <div className="space-y-2">
                        {ptSessions.map((s, idx) => {
                          const coach = coachById(s.coachId);
                          const c = s.courtId ? courtById(s.courtId) : undefined;
                          const isFree = idx < freeCoaching;
                          const lineFee =
                            (isFree ? 0 : coachFeeFor(s.coachId)) +
                            (s.courtMode === "include" ? COURT_FEE_PER_SESSION : 0);
                          const courtLabel =
                            s.courtMode === "existing"
                              ? `${c?.name ?? "Court"} (sudah di-book)`
                              : s.courtMode === "include"
                                ? c?.name ?? "Court"
                                : "Coach only";
                          return (
                            <div
                              key={s.id}
                              className="flex items-center justify-between gap-3 text-sm"
                            >
                              <span className="text-[var(--text-body)]">
                                {coach?.name} · {s.dateKey} · {s.time} ·{" "}
                                {courtLabel}
                                {isFree && (
                                  <span className="ml-1 font-medium text-emerald-500">
                                    · gratis
                                  </span>
                                )}
                              </span>
                              <span className="font-semibold text-[var(--text-heading)]">
                                {formatIDR(lineFee)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </FormSection>
            </div>

            {/* Submit */}
            <div className="mt-8 flex items-center justify-end border-t border-[var(--border-default)] pt-5">
              <Button
                variant="primary"
                sheen
                glow
                disabled={submitted && !canSubmit}
                onClick={finalize}
              >
                {`Konfirmasi & Bayar · ${formatIDR(cost.grandTotal)}`}
              </Button>
            </div>
          </Card>
        </div>

        {/* ── Sticky summary ── */}
        <div className="lg:col-span-1">
          <RegisterSummary
            name={name}
            tier={tier}
            cost={cost}
            courtCount={courtDrafts.length}
            ptCount={ptEnabled ? ptSessions.length : 0}
          />
        </div>
      </div>

      {/* ── Success modal ── */}
      <Modal
        isOpen={!!done}
        onClose={reset}
        showCloseButton={false}
        className="max-w-md p-6 sm:p-8"
      >
        {done && (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-7 w-7">
                <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[var(--text-heading)]">
              Registrasi berhasil
            </h3>
            <p className="mt-1 text-sm text-[var(--text-caption)]">
              {name.trim()} terdaftar sebagai member {memberTierMeta[tier].label}.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-muted)] p-3">
                <p className="text-xs text-[var(--text-caption)]">Member No</p>
                <p className="mt-0.5 font-mono text-sm font-bold text-[var(--text-heading)]">
                  {done.memberNo}
                </p>
              </div>
              <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-muted)] p-3">
                <p className="text-xs text-[var(--text-caption)]">Password sementara</p>
                <p className="mt-0.5 font-mono text-sm font-bold text-[var(--text-heading)]">
                  {done.password}
                </p>
              </div>
            </div>
            <p className="mt-4 text-xs text-[var(--text-muted)]">
              Total dibayar {formatIDR(cost.grandTotal)}. Member melengkapi profil
              padel saat login pertama (onboarding).
            </p>
            <div className="mt-6">
              <Button variant="primary" sheen onClick={reset} className="w-full">
                Daftar member lain
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

const ReviewRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-[var(--text-caption)]">{label}</span>
    <span className="font-medium text-[var(--text-heading)]">{value}</span>
  </div>
);
