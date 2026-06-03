"use client";

// PadelHub — shared Personal-Training booking Stepper.
// Used by BOTH the owner/staff page (/coaching/pt/book, mode="staff" with a
// client-select step) and the member self-book page (/me/pt -> mode="self",
// the client is the signed-in member so that step is skipped).
//
// MANY inputs -> Stepper on a dedicated page (project UI rule). Deterministic
// availability comes from coachAvailability() in @/data/padel/club/pt so the
// grid is SSR-safe and never double-books a coach.

import React, { useMemo, useState } from "react";
import Card from "@/components/ui/card/Card";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import Stepper, { type StepItem } from "@/components/ui/stepper/Stepper";
import RadioGroup from "@/components/ui/input/RadioGroup";
import TextInput from "@/components/ui/input/TextInput";
import UiSelect from "@/components/ui/select/Select";
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
const ChevronRight = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);
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
  /** Back / cancel out of the stepper */
  onCancel: () => void;
}

const onlyActiveCoaches: Coach[] = coaches.filter((c) => c.status === "active");
const dateOptions = nextDays(10);
/** members that can be picked as PT clients (exclude one-off daily walk-ins). */
const clientMembers = mockMembers.filter((m) => m.tier !== "daily");

const PtBookingStepper: React.FC<PtBookingStepperProps> = ({
  mode,
  selfName,
  onConfirm,
  onCancel,
}) => {
  const toast = useToast();

  // Step list differs by mode (staff has an extra "Client" step at the front).
  const steps: StepItem[] = useMemo(() => {
    const core: StepItem[] = [
      { label: "Coach", description: "Pick a coach" },
      { label: "Schedule", description: "Date & time slot" },
      { label: "Court", description: "Include or coach-only" },
      { label: "Package", description: "Sessions & confirm" },
    ];
    return mode === "staff"
      ? [{ label: "Client", description: "Who is training" }, ...core]
      : core;
  }, [mode]);

  const [step, setStep] = useState(0);

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

  // ── Step index helpers (staff has +1 offset) ──
  const offset = mode === "staff" ? 1 : 0;
  const idxClient = mode === "staff" ? 0 : -1;
  const idxCoach = offset + 0;
  const idxSchedule = offset + 1;
  const idxCourt = offset + 2;
  const idxPackage = offset + 3;

  const coach = coachById(coachId);
  const clientName =
    mode === "self"
      ? selfName ?? "You"
      : clientMembers.find((m) => m.id === clientId)?.name ?? "";

  // Deterministic availability grid for the chosen coach+date.
  const slots = useMemo(() => coachAvailability(coachId, date), [coachId, date]);

  // Active courts only; greyed when in maintenance/inactive.
  const bookableCourts: Court[] = mockCourts.filter((c) => c.status === "active");
  const selectedCourt = includeCourt ? courtById(courtId) : undefined;

  // ── Pricing ──
  const pkg = ptPackageById(packageId);
  const coachFee = pkg?.pricePerSession ?? coach?.ratePerHour ?? 0;
  const courtFee = includeCourt ? COURT_FEE_PER_SESSION : 0;
  const perSession = coachFee + courtFee;
  const sessions = pkg?.sessions ?? 1;
  const total = perSession * sessions;

  // Promo applies to the package total; clamp so the charge never goes negative.
  const appliedPromo = Math.min(promoDiscount, total);
  const payable = Math.max(total - appliedPromo, 0);

  // Promo audience tier: selected member's tier (staff) or the self member's
  // tier matched by name; falls back to "casual" when unknown.
  const promoTier: MemberTier =
    mode === "staff"
      ? clientMembers.find((m) => m.id === clientId)?.tier ?? "casual"
      : mockMembers.find((m) => m.name === clientName)?.tier ?? "casual";

  // ── Per-step validity ──
  const canNext = (() => {
    if (step === idxClient) return Boolean(clientId);
    if (step === idxCoach) return Boolean(coachId);
    if (step === idxSchedule) return Boolean(time);
    if (step === idxCourt) return includeCourt ? Boolean(courtId) : true;
    return true;
  })();

  const isLast = step === idxPackage;

  const goNext = () => {
    if (!canNext) return;
    // Reset time when leaving coach step if coach changed mid-flow is handled
    // by the effect-free recompute; just advance.
    setStep((s) => Math.min(s + 1, steps.length - 1));
  };
  const goBack = () => {
    if (step === 0) {
      onCancel();
      return;
    }
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleConfirm = () => {
    if (includeCourt && !courtId) {
      toast.warning("Pick a court or switch to coach-only.");
      setStep(idxCourt);
      return;
    }
    if (!time) {
      toast.warning("Pick a time slot first.");
      setStep(idxSchedule);
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
      <div className="mb-8">
        <Stepper steps={steps} currentStep={step} onStepClick={(i) => i < step && setStep(i)} />
      </div>

      {/* ── STEP: Client (staff only) ── */}
      {step === idxClient && (
        <div className="animate-pop-in space-y-4">
          <div className="rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-muted)] p-4">
            <p className="text-sm text-[var(--text-body)]">
              Select an existing member to book this personal-training session for.
            </p>
          </div>
          <UiSelect
            label="Member"
            value={clientId}
            onChange={(v) => setClientId(v as string)}
            placeholder="Search a member"
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
        </div>
      )}

      {/* ── STEP: Coach ── */}
      {step === idxCoach && (
        <div className="animate-pop-in space-y-3">
          <p className="text-sm text-[var(--text-caption)]">
            Choose a coach. Rate shown is the standard hourly fee; package pricing applies at the
            final step.
          </p>
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
                    setTime(""); // reset slot — availability is coach-specific
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
                        {free} slots open
                      </span>
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── STEP: Schedule (date + time grid) ── */}
      {step === idxSchedule && (
        <div className="animate-pop-in space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text-body)]">Date</label>
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
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-sm font-medium text-[var(--text-body)]">
                Time slot · Coach {coach?.name.split(" ")[0]}
              </label>
              <span className="text-xs text-[var(--text-caption)]">
                Greyed slots are already booked
              </span>
            </div>
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
                No open slots for this coach on {formatDateLong(date)}. Try another date.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── STEP: Court include / exclude ── */}
      {step === idxCourt && (
        <div className="animate-pop-in space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text-body)]">
              Court arrangement
            </label>
            <RadioGroup
              value={includeCourt ? "include" : "exclude"}
              onChange={(v) => setIncludeCourt(v === "include")}
              options={[
                {
                  value: "include",
                  label: "Reserve a court (recommended)",
                  description: `Books a court alongside the coach. +${formatIDR(COURT_FEE_PER_SESSION)} / session.`,
                },
                {
                  value: "exclude",
                  label: "Coach only",
                  description: "Member already has a court booked, or brings their own slot.",
                },
              ]}
            />
          </div>

          {includeCourt && (
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--text-body)]">
                Pick a court
              </label>
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
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text-body)]">
              Players
            </label>
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
      )}

      {/* ── STEP: Package + review ── */}
      {step === idxPackage && (
        <div className="animate-pop-in space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text-body)]">
              Session package
            </label>
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
                      <span className="text-[var(--text-muted)]"> / session</span>
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Promo / referral — applies to the package total. */}
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-4">
            <PromoReferralInput
              scope="pt"
              amount={total}
              tier={promoTier}
              onChange={(s) => setPromoDiscount(s.discount)}
            />
          </div>

          {/* Review + price breakdown */}
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-muted)] p-4">
            <h4 className="mb-3 text-sm font-semibold text-[var(--text-heading)]">Review</h4>
            <dl className="space-y-2 text-sm">
              <Row label="Client" value={clientName} />
              <Row
                label="Coach"
                value={`${coach?.name ?? "—"} · ${coach?.level ?? ""}`}
              />
              <Row label="When" value={`${formatDateLong(date)} · ${time || "—"}`} />
              <Row
                label="Court"
                value={selectedCourt ? selectedCourt.name : "Coach only (no court)"}
              />
              <Row label="Players" value={players === 2 ? "Pair (1-on-2)" : "1-on-1"} />
              <Row label="Package" value={`${pkg?.label} (${sessions} session${sessions > 1 ? "s" : ""})`} />
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
                {formatIDR(perSession)} per session · {sessions} session
                {sessions > 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Footer nav ── */}
      <div className="mt-8 flex items-center justify-between border-t border-[var(--border-light)] pt-5">
        <Button variant="ghost" onClick={goBack}>
          {step === 0 ? "Cancel" : "Back"}
        </Button>
        {!isLast ? (
          <Button variant="primary" sheen disabled={!canNext} onClick={goNext} endIcon={<ChevronRight />}>
            Continue
          </Button>
        ) : (
          <Button variant="primary" glow sheen onClick={handleConfirm}>
            Confirm Booking · {formatIDR(payable)}
          </Button>
        )}
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
  const coach = coachById(r.coachId);
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
