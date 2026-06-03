"use client";

// PadelHub — member registration wizard (MANY inputs -> Stepper on a dedicated
// page per the project UI/UX rule). Adaptive 5-step flow; the "daily" walk-in
// tier collapses to identity + 1 booking today + pay (PT step hidden). All
// availability + ids are derived deterministically from inputs (no DB); the
// final member-no + temp password are the only random values. Court bookings
// and court-included PT sessions persist via useClubData.addBooking; the new
// member is pushed to localStorage 'padelhub-registered-members'.

import React, { useMemo, useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Card from "@/components/ui/card/Card";
import Button from "@/components/ui/button/Button";
import TextInput from "@/components/ui/input/TextInput";
import PhoneInput, { type Country } from "@/components/ui/input/PhoneInput";
import Stepper, { type StepItem } from "@/components/ui/stepper/Stepper";
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
  ptPackages,
  ptPackageById,
  COURT_FEE_PER_SESSION,
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
  pad,
  tierJoinFee,
  tierQuota,
  tierWaivesCoachFee,
} from "./register/types";

const countries = countriesData as Country[];
const tierOrder: MemberTier[] = ["daily", "casual", "pro", "elite"];

type StepKey = "identity" | "membership" | "court" | "pt" | "review";

const emailValid = (e: string) =>
  e.trim().length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

let draftSeq = 0;
const nextId = (p: string) => `${p}-${++draftSeq}`;

export default function MemberRegister() {
  const toast = useToast();
  const { courts, bookings, addBooking, isReady } = useClubData();

  // ── identity + tier ──
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [tier, setTier] = useState<MemberTier>("casual");

  // ── per-step assemblies ──
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [courtDrafts, setCourtDrafts] = useState<DraftBooking[]>([]);
  const [ptEnabled, setPtEnabled] = useState(false);
  const [packageId, setPackageId] = useState(ptPackages[0].id);
  const [ptSessions, setPtSessions] = useState<DraftPtSession[]>([]);

  const [step, setStep] = useState(0);
  const [done, setDone] = useState<null | { memberNo: string; password: string }>(null);

  // daily collapses: no PT step, single booking today
  const isDaily = tier === "daily";
  const quota = tierQuota[tier];
  const waived = tierWaivesCoachFee(tier);
  const pkg = ptPackageById(packageId) ?? ptPackages[0];
  const targetSessions = pkg.sessions;
  const coachFeePerSession = pkg.pricePerSession;

  // ── adaptive step model ──
  const stepKeys: StepKey[] = useMemo(
    () =>
      isDaily
        ? ["identity", "membership", "court", "review"]
        : ["identity", "membership", "court", "pt", "review"],
    [isDaily],
  );

  const stepItems: StepItem[] = useMemo(
    () =>
      stepKeys.map((k) => {
        switch (k) {
          case "identity":
            return { label: "Identitas", description: "Data diri" };
          case "membership":
            return { label: "Membership", description: "Pilih tier" };
          case "court":
            return { label: "Court", description: "Booking lapangan" };
          case "pt":
            return { label: "Pelatih", description: "Sesi PT" };
          case "review":
            return { label: "Review", description: "Konfirmasi & bayar" };
        }
      }),
    [stepKeys],
  );

  // clamp step when the model shrinks (e.g. switching to daily)
  React.useEffect(() => {
    setStep((s) => Math.min(s, stepKeys.length - 1));
  }, [stepKeys.length]);

  const key = stepKeys[step];
  const isLast = step === stepKeys.length - 1;

  // ── cost breakdown ──
  // PT "include" court sessions CONSUME the court quota (free while within quota).
  // PT "existing" court sessions use an already-booked court → Rp0 extra, no quota hit.
  // Total court slots = court bookings + PT-include-NEW-court sessions.
  const cost: CostBreakdown = useMemo(() => {
    const joinFee = tierJoinFee[tier];
    const appliedPromo = Math.min(promoDiscount, joinFee);

    // Only "include" (book new court) counts toward quota; "existing" is free (already in courtDrafts)
    const ptNewCourtCount = ptEnabled
      ? ptSessions.filter((s) => s.courtMode === "include").length
      : 0;

    // Shared quota pool: court bookings first, then PT NEW court slots
    const totalCourtSlots = courtDrafts.length + ptNewCourtCount;
    const courtIncluded = Math.min(totalCourtSlots, quota);
    const courtPaid = Math.max(totalCourtSlots - quota, 0);

    // Court bookings beyond quota (first N slots are court-drafts, overflow charged)
    const courtDraftsPaid = Math.max(courtDrafts.length - quota, 0);
    const courtFeeTotal = courtDrafts
      .slice(quota)
      .reduce((sum, d) => sum + d.price, 0);

    // PT NEW court slots that exceed remaining quota after court bookings
    const quotaAfterCourts = Math.max(quota - courtDrafts.length, 0);
    const ptCourtPaid = Math.max(ptNewCourtCount - quotaAfterCourts, 0);
    const ptCourtFeeTotal = ptCourtPaid * COURT_FEE_PER_SESSION;

    const ptCount = ptEnabled ? ptSessions.length : 0;
    const ptCoachFeeTotal = ptCount * coachFeePerSession;
    const chargedCoach = waived ? 0 : ptCoachFeeTotal;

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
      ptCourtFeeTotal,
      ptCoachWaived: waived && ptCount > 0,
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
    coachFeePerSession,
    waived,
  ]);

  // ── per-step validation ──
  const identityValid =
    name.trim().length >= 2 &&
    phone.replace(/\D/g, "").length >= 8 &&
    emailValid(email);
  const courtValid = isDaily ? courtDrafts.length === 1 : true;
  const ptValid = !ptEnabled || ptSessions.length === targetSessions;

  const canNext = (() => {
    switch (key) {
      case "identity":
        return identityValid;
      case "court":
        return courtValid;
      case "pt":
        return ptValid;
      default:
        return true;
    }
  })();

  // ── persistence ──
  const finalize = () => {
    if (!canNext) return;

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
    // reuses the court already persisted from step 3, "exclude" has no court.
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
          addBooking({
            courtId: s.courtId!,
            start: startIso,
            end: endIso,
            type: "coaching",
            status: "confirmed",
            customer: customerLabel,
            partySize: court?.format === "single" ? 2 : 4,
            price: (waived ? 0 : coachFeePerSession) + courtCharge,
            note: courtIncludedHere
              ? `PT w/ ${coach?.name ?? "coach"} · court included`
              : `PT w/ ${coach?.name ?? "coach"}`,
            createdBy: "Registration desk",
          });
        });
    }

    // member -> localStorage (onboarded=false; first-login onboarding fills the
    // optional player profile later).
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

  const goNext = () => {
    if (!canNext) return;
    if (isLast) finalize();
    else setStep((s) => s + 1);
  };

  const reset = () => {
    setName("");
    setPhone("");
    setEmail("");
    setTier("casual");
    setPromoDiscount(0);
    setCourtDrafts([]);
    setPtEnabled(false);
    setPackageId(ptPackages[0].id);
    setPtSessions([]);
    setStep(0);
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

  return (
    <div>
      <PageBreadcrumb pageTitle="Registrasi Member" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── Wizard ── */}
        <div className="lg:col-span-2">
          <Card padding="lg">
            <Stepper
              steps={stepItems}
              currentStep={step}
              onStepClick={(i) => i < step && setStep(i)}
            />

            <div className="mt-8">
              {/* Step: Identitas */}
              {key === "identity" && (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <TextInput
                      label="Nama Lengkap"
                      value={name}
                      onChange={setName}
                      placeholder="cth. Andi Wijaya"
                      required
                      hint="Nama lengkap sesuai identitas"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <PhoneInput
                      label="Nomor Telepon"
                      countries={countries}
                      value={phone}
                      onChange={(full) => setPhone(full)}
                      hint="Format: +62 8xx xxxx xxxx"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <TextInput
                      label="Email (opsional)"
                      type="email"
                      value={email}
                      onChange={setEmail}
                      placeholder="cth. andi@email.com"
                      validate
                      hint="Digunakan untuk login & notifikasi"
                    />
                  </div>
                </div>
              )}

              {/* Step: Membership */}
              {key === "membership" && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {tierOrder.map((t) => {
                      const meta = memberTierMeta[t];
                      const active = t === tier;
                      const q = tierQuota[t];
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
                              {tierJoinFee[t] === 0 ? "Gratis" : formatIDR(tierJoinFee[t])}
                            </span>
                          </div>
                          <p className="mt-2 text-xs text-[var(--text-caption)]">
                            {meta.perk}
                          </p>
                          <p className="mt-1 text-xs font-medium text-[var(--text-body)]">
                            {q > 0
                              ? `${q} court booking included`
                              : "Pay-as-you-play"}
                            {t === "elite" && " · free coaching"}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-4">
                    <p className="mb-3 text-xs font-medium text-[var(--text-caption)]">
                      Join fee {formatIDR(cost.joinFee)}
                    </p>
                    <PromoReferralInput
                      scope="membership"
                      amount={cost.joinFee}
                      tier={tier}
                      onChange={(s) => setPromoDiscount(s.discount)}
                    />
                  </div>
                </div>
              )}

              {/* Step: Court booking */}
              {key === "court" && (
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
              )}

              {/* Step: Pelatih / PT */}
              {key === "pt" && (
                <PtSessionStep
                  tier={tier}
                  enabled={ptEnabled}
                  onToggle={(v) => {
                    setPtEnabled(v);
                    if (!v) setPtSessions([]);
                  }}
                  packageId={packageId}
                  onPackageChange={(id) => {
                    setPackageId(id);
                    setPtSessions([]);
                  }}
                  targetSessions={targetSessions}
                  coachFeePerSession={coachFeePerSession}
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
              )}

              {/* Step: Review */}
              {key === "review" && (
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
                        {ptSessions.map((s) => {
                          const coach = coachById(s.coachId);
                          const c = s.courtId ? courtById(s.courtId) : undefined;
                          const lineFee =
                            (waived ? 0 : coachFeePerSession) +
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
              )}
            </div>

            {/* Footer nav */}
            <div className="mt-8 flex items-center justify-between border-t border-[var(--border-default)] pt-5">
              <Button
                variant="ghost"
                onClick={() => setStep((s) => Math.max(s - 1, 0))}
                disabled={step === 0}
              >
                Back
              </Button>
              <Button
                variant="primary"
                sheen
                glow={isLast}
                disabled={!canNext}
                onClick={goNext}
              >
                {isLast ? `Konfirmasi & Bayar · ${formatIDR(cost.grandTotal)}` : "Lanjut"}
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
