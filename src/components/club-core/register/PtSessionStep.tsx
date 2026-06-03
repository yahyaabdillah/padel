"use client";

// Step 4 — Personal training. Toggle "Pakai pelatih?"; when on, the user
// assembles N sessions. Each session: day -> coach -> time slot (only slots
// coachAvailability marks free, minus slots already taken by other chosen
// sessions for that coach+date) -> court include/exclude. Elite waives the
// coach fee (shown struck-through). Hidden entirely for tier=daily upstream.

import React, { useMemo, useState } from "react";
import DatePicker from "@/components/ui/datepicker/DatePicker";
import UiSelect from "@/components/ui/select/Select";
import Button from "@/components/ui/button/Button";
import RadioGroup from "@/components/ui/input/RadioGroup";
import Switch from "@/components/ui/switch/Switch";
import { formatIDR } from "@/components/club-core/format";
import { dateKey, type Booking } from "@/data/padel/club/bookings";
import { type Court } from "@/data/padel/club/courts";
import {
  coaches,
  coachById,
  type Coach,
} from "@/data/padel/engage/coaches";
import Badge from "@/components/ui/badge/Badge";
import {
  coachAvailability,
  COURT_FEE_PER_SESSION,
  ptPackages,
} from "@/data/padel/club/pt";
import type { MemberTier } from "@/data/padel/club/members";
import {
  type DraftPtSession,
  type DraftBooking,
  type PtCourtMode,
  tierWaivesCoachFee,
  TODAY_KEY,
} from "./types";

const activeCoaches: Coach[] = coaches.filter((c) => c.status === "active");

interface PtSessionStepProps {
  tier: MemberTier;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  packageId: string;
  onPackageChange: (id: string) => void;
  targetSessions: number;
  coachFeePerSession: number;
  courts: Court[];
  bookings: Booking[];
  /** court bookings already drafted in step 3 (block court+hour reuse) */
  courtDrafts: DraftBooking[];
  sessions: DraftPtSession[];
  onAdd: (s: Omit<DraftPtSession, "id">) => void;
  onRemove: (id: string) => void;
}

const PtSessionStep: React.FC<PtSessionStepProps> = ({
  tier,
  enabled,
  onToggle,
  packageId,
  onPackageChange,
  targetSessions,
  coachFeePerSession,
  courts,
  bookings,
  courtDrafts,
  sessions,
  onAdd,
  onRemove,
}) => {
  const waived = tierWaivesCoachFee(tier);
  const activeCourts = useMemo(
    () => courts.filter((c) => c.status === "active"),
    [courts],
  );

  const [date, setDate] = useState<Date>(new Date(`${TODAY_KEY}T00:00:00`));
  const [coachId, setCoachId] = useState(activeCoaches[0]?.id ?? "");
  const [time, setTime] = useState<string>("");
  const [courtMode, setCourtMode] = useState<PtCourtMode>("include");
  const [courtId, setCourtId] = useState(activeCourts[0]?.id ?? "");

  const selectedKey = dateKey(date);

  // Coach's deterministic availability minus slots already chosen for that
  // coach+date in this registration (no coach double-book).
  const takenByCoach = useMemo(() => {
    const set = new Set<string>();
    sessions
      .filter((s) => s.coachId === coachId && s.dateKey === selectedKey)
      .forEach((s) => set.add(s.time));
    return set;
  }, [sessions, coachId, selectedKey]);

  const slots = useMemo(
    () =>
      coachAvailability(coachId, selectedKey).map((s) => ({
        ...s,
        available: s.available && !takenByCoach.has(s.time),
      })),
    [coachId, selectedKey, takenByCoach],
  );

  // Courts free at the chosen hour (existing bookings + drafts + PT includes).
  const courtFreeAt = (cId: string): boolean => {
    if (!time) return true;
    const hour = Number(time.slice(0, 2));
    const busyExisting = bookings.some(
      (b) =>
        b.courtId === cId &&
        b.status !== "cancelled" &&
        b.start.startsWith(selectedKey) &&
        Number(b.start.slice(11, 13)) <= hour &&
        Number(b.end.slice(11, 13)) > hour,
    );
    const busyCourtDraft = courtDrafts.some((d) => {
      if (d.courtId !== cId || d.dateKey !== selectedKey) return false;
      const span = Math.ceil(d.duration / 60);
      return hour >= d.hour && hour < d.hour + span;
    });
    const busyPtDraft = sessions.some(
      (s) =>
        s.includeCourt &&
        s.courtId === cId &&
        s.dateKey === selectedKey &&
        s.time === time,
    );
    return !busyExisting && !busyCourtDraft && !busyPtDraft;
  };

  const courtOk =
    courtMode === "exclude" ||
    courtMode === "existing" ||
    (courtId !== "" && courtFreeAt(courtId));
  const full = sessions.length >= targetSessions;
  const canAdd = !!coachId && !!time && courtOk && !full;

  const handleAdd = () => {
    if (!canAdd) return;
    const hour = time ? Number(time.slice(0, 2)) : -1;
    const overlapping = courtDrafts.find((d) => {
      if (d.dateKey !== selectedKey || hour < 0) return false;
      const span = Math.ceil(d.duration / 60);
      return hour >= d.hour && hour < d.hour + span;
    });
    onAdd({
      dateKey: selectedKey,
      coachId,
      time,
      courtMode,
      includeCourt: courtMode === "include",
      courtId:
        courtMode === "include"
          ? courtId
          : courtMode === "existing"
            ? overlapping?.courtId ?? null
            : null,
      existingDraftId: courtMode === "existing" ? overlapping?.id : undefined,
    });
    setTime("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-4">
        <div>
          <p className="text-sm font-semibold text-[var(--text-heading)]">
            Pakai pelatih?
          </p>
          <p className="text-xs text-[var(--text-caption)]">
            Add private coaching sessions to this membership.
            {waived && " Elite — coach fee waived."}
          </p>
        </div>
        <Switch checked={enabled} onChange={onToggle} />
      </div>

      {enabled && (
        <>
          {/* Package = number of sessions */}
          <div>
            <span className="mb-2 block text-xs font-medium text-[var(--text-caption)]">
              How many sessions?
            </span>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {ptPackages.map((p) => {
                const active = p.id === packageId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onPackageChange(p.id)}
                    className={[
                      "rounded-2xl border p-3 text-left transition-all",
                      active
                        ? "border-[var(--color-primary)] bg-[var(--color-primary-light)] ring-2 ring-[var(--color-primary)]/30"
                        : "border-[var(--border-default)] bg-[var(--surface-card)] hover:border-[var(--color-primary)]/40",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between">
                      <Badge size="sm" color="info" variant="light">
                        {p.sessions}x
                      </Badge>
                    </div>
                    <p className="mt-1.5 truncate text-xs text-[var(--text-caption)]">
                      {p.label}
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-[var(--color-primary)]">
                      {formatIDR(p.pricePerSession)}/sesi
                    </p>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-[var(--text-caption)]">
              Added {sessions.length} of {targetSessions} session
              {targetSessions > 1 ? "s" : ""}.
            </p>
          </div>

          {/* Session editor */}
          <div className="space-y-5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-muted)] p-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DatePicker
                label="Day"
                mode="single"
                value={date}
                minDate={new Date(`${TODAY_KEY}T00:00:00`)}
                onChange={(v) => {
                  if (v instanceof Date) {
                    setDate(v);
                    setTime("");
                  }
                }}
              />
              <UiSelect
                label="Coach"
                searchable
                options={activeCoaches.map((c) => ({
                  value: c.id,
                  label: c.name,
                  desc: c.level,
                }))}
                value={coachId}
                clearable={false}
                onChange={(v) => {
                  setCoachId(v as string);
                  setTime("");
                }}
              />
            </div>

            {/* Time-slot grid */}
            <div>
              <span className="mb-2 block text-xs font-medium text-[var(--text-caption)]">
                Time slot
              </span>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {slots.map((s) => {
                  const active = time === s.time;
                  return (
                    <button
                      key={s.time}
                      type="button"
                      disabled={!s.available}
                      onClick={() => setTime(s.time)}
                      className={[
                        "rounded-lg border py-2 text-sm font-medium transition-all",
                        active
                          ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-theme-sm"
                          : !s.available
                            ? "cursor-not-allowed border-transparent bg-[var(--surface-card)] text-[var(--text-muted)] line-through"
                            : "border-[var(--border-default)] text-[var(--text-body)] hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-primary-light)]",
                      ].join(" ")}
                    >
                      {s.time}
                    </button>
                  );
                })}
              </div>
              {slots.every((s) => !s.available) && (
                <p className="mt-2 text-xs text-rose-500">
                  No open slots for this coach on {selectedKey}. Try another day.
                </p>
              )}
            </div>

            {/* Court arrangement — 3 options */}
            <div>
              <span className="mb-2 block text-xs font-medium text-[var(--text-caption)]">
                Court arrangement
              </span>
              {(() => {
                // Detect overlapping court drafts at same date+hour
                const hour = time ? Number(time.slice(0, 2)) : -1;
                const overlapping = courtDrafts.filter((d) => {
                  if (d.dateKey !== selectedKey || hour < 0) return false;
                  const span = Math.ceil(d.duration / 60);
                  return hour >= d.hour && hour < d.hour + span;
                });
                const hasExisting = overlapping.length > 0;
                const existingCourt = hasExisting
                  ? courts.find((c) => c.id === overlapping[0].courtId)
                  : undefined;

                const options = [
                  ...(hasExisting
                    ? [
                        {
                          value: "existing" as const,
                          label: `Pakai court yang sudah di-book`,
                          description: `${existingCourt?.name ?? "Court"} · ${selectedKey} · ${time} (sudah dibayar/included — Rp0 tambahan)`,
                        },
                      ]
                    : []),
                  {
                    value: "include" as const,
                    label: "Reserve court baru",
                    description: `Book court terpisah untuk sesi PT. +${formatIDR(COURT_FEE_PER_SESSION)} / session (atau gratis jika masih dalam kuota).`,
                  },
                  {
                    value: "exclude" as const,
                    label: "Coach only (tanpa court)",
                    description: "Member sudah punya court sendiri, atau latihan tanpa lapangan.",
                  },
                ];

                // Auto-switch to "existing" when overlap detected and user hasn't explicitly chosen
                if (hasExisting && courtMode === "include") {
                  // keep include as-is — user may want a separate court
                }

                return (
                  <>
                    <RadioGroup
                      value={courtMode}
                      onChange={(v) => {
                        const m = v as PtCourtMode;
                        setCourtMode(m);
                        if (m === "existing" && overlapping.length > 0) {
                          setCourtId(overlapping[0].courtId);
                        }
                      }}
                      options={options}
                    />
                    {hasExisting && courtMode !== "existing" && (
                      <p className="mt-1.5 text-xs text-amber-500">
                        Kamu sudah punya booking di {existingCourt?.name} jam {time}. Pilih &quot;Pakai court yang sudah di-book&quot; agar tidak double-charge.
                      </p>
                    )}
                  </>
                );
              })()}
            </div>

            {courtMode === "include" && (
              <div>
                <span className="mb-2 block text-xs font-medium text-[var(--text-caption)]">
                  Pick a court
                </span>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {activeCourts.map((c) => {
                    const active = c.id === courtId;
                    const free = !time || courtFreeAt(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        disabled={!free}
                        onClick={() => setCourtId(c.id)}
                        className={[
                          "flex items-center gap-3 rounded-2xl border p-3 text-left transition-all",
                          active
                            ? "border-[var(--color-primary)] bg-[var(--color-primary-light)] ring-2 ring-[var(--color-primary)]/30"
                            : !free
                              ? "cursor-not-allowed border-[var(--border-default)] opacity-50"
                              : "border-[var(--border-default)] bg-[var(--surface-card)] hover:border-[var(--color-primary)]/40",
                        ].join(" ")}
                      >
                        <span
                          className="h-9 w-9 shrink-0 rounded-xl"
                          style={{ background: c.color }}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[var(--text-heading)]">
                            {c.name}
                          </p>
                          <p className="truncate text-xs text-[var(--text-caption)]">
                            {free ? c.environment : "Busy at this time"}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-[var(--text-caption)]">
                Coach fee{" "}
                {waived ? (
                  <span className="line-through">{formatIDR(coachFeePerSession)}</span>
                ) : (
                  <span className="font-medium text-[var(--text-body)]">
                    {formatIDR(coachFeePerSession)}
                  </span>
                )}
                {courtMode === "include" && ` + court ${formatIDR(COURT_FEE_PER_SESSION)}`}
                {courtMode === "existing" && " + court Rp0 (sudah di-book)"}
              </p>
              <Button variant="outline" size="sm" disabled={!canAdd} onClick={handleAdd}>
                + Add session
              </Button>
            </div>
          </div>

          {/* Added sessions */}
          {sessions.length > 0 && (
            <div className="space-y-2">
              <span className="block text-xs font-medium text-[var(--text-caption)]">
                Coaching sessions
              </span>
              {sessions.map((s) => {
                const coach = coachById(s.coachId);
                const court = s.courtId
                  ? courts.find((c) => c.id === s.courtId)
                  : undefined;
                const courtLabel =
                  s.courtMode === "existing"
                    ? `Pakai booking: ${court?.name ?? "—"}`
                    : s.courtMode === "include"
                      ? `Court: ${court?.name ?? "—"}`
                      : "Coach only";
                const lineFee =
                  (waived ? 0 : coachFeePerSession) +
                  (s.courtMode === "include" ? COURT_FEE_PER_SESSION : 0);
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--text-heading)]">
                        {coach?.name ?? "Coach"} · {s.dateKey} · {s.time}
                      </p>
                      <p className="truncate text-xs text-[var(--text-caption)]">
                        {courtLabel}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-sm font-semibold text-[var(--text-heading)]">
                        {formatIDR(lineFee)}
                      </span>
                      <button
                        type="button"
                        onClick={() => onRemove(s.id)}
                        className="text-[var(--text-muted)] transition-colors hover:text-rose-500"
                        aria-label="Remove session"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PtSessionStep;
