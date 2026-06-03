"use client";

// PadelHub — member self-service Personal Training.
// Lists the signed-in member's own PT sessions and lets them book a new one
// via the SAME Stepper used by staff, in "self" mode (no client-select step —
// the member is the client). MANY inputs -> Stepper page (project UI rule).

import React, { useMemo, useState } from "react";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import Card from "@/components/ui/card/Card";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import Tabs from "@/components/ui/tabs/Tabs";
import EmptyState from "@/components/ui/feedback/EmptyState";
import EngageAvatar from "@/components/club-engage/EngageAvatar";
import { formatIDR, formatDateLong } from "@/components/club-engage/format";
import { useToast } from "@/components/ui/toast/ToastContext";
import { useRole } from "@/context/RoleContext";
import PtBookingStepper, {
  ptSessionFromResult,
  type PtBookingResult,
} from "@/components/club-engage/PtBookingStepper";
import {
  ptSessions as seedSessions,
  ptStatusMeta,
  coachById,
  type PTSession,
  type PTStatus,
} from "@/data/padel/engage/coaches";

const PlusIcon = () => <span className="text-base leading-none">+</span>;

export default function MemberPtPage() {
  const toast = useToast();
  const { currentUser } = useRole();

  // The signed-in member is the PT client. Demo member-001 == Andi Wijaya,
  // who already has seeded PT sessions under his client name.
  const myName = currentUser.name;
  const myAvatar = currentUser.avatar;

  const [booking, setBooking] = useState(false);
  const [filter, setFilter] = useState<"all" | PTStatus>("all");
  const [mine, setMine] = useState<PTSession[]>(() =>
    seedSessions.filter((s) => s.clientName === myName),
  );

  const filtered = useMemo(
    () => (filter === "all" ? mine : mine.filter((s) => s.status === filter)),
    [mine, filter],
  );

  const stats = useMemo(() => {
    const upcoming = mine.filter((s) => s.status === "confirmed" || s.status === "pending").length;
    const completed = mine.filter((s) => s.status === "completed").length;
    const spend = mine
      .filter((s) => s.status !== "cancelled")
      .reduce((sum, s) => sum + s.price, 0);
    return { upcoming, completed, spend };
  }, [mine]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: mine.length };
    (["confirmed", "pending", "completed", "cancelled"] as PTStatus[]).forEach(
      (st) => (c[st] = mine.filter((s) => s.status === st).length),
    );
    return c;
  }, [mine]);

  const handleConfirm = (result: PtBookingResult) => {
    const session = ptSessionFromResult({ ...result, clientName: myName }, myAvatar);
    setMine((prev) => [session, ...prev]);
    setBooking(false);
    setFilter("all");
    toast.success(
      `PT booked with Coach ${coachById(result.coachId)?.name.split(" ")[0]} on ${formatDateLong(result.date)}.`,
    );
  };

  return (
    <div>
      <PageBreadCrumb pageTitle="My Personal Training" />

      {booking ? (
        <div className="mx-auto max-w-3xl">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-[var(--text-caption)]">
              Booking a PT session for <span className="font-semibold text-[var(--text-heading)]">{myName}</span>.
            </p>
          </div>
          <PtBookingStepper
            mode="self"
            selfName={myName}
            onConfirm={handleConfirm}
            onCancel={() => setBooking(false)}
          />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-2xl text-sm text-[var(--text-caption)]">
              Your one-on-one coaching sessions. Track upcoming sessions and book more with our pro
              coaches.
            </p>
            <Button variant="primary" sheen startIcon={<PlusIcon />} onClick={() => setBooking(true)}>
              Book PT
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card padding="md">
              <p className="text-sm font-medium text-[var(--text-caption)]">Upcoming</p>
              <p className="mt-2 text-2xl font-bold text-[var(--text-heading)]">{stats.upcoming}</p>
            </Card>
            <Card padding="md">
              <p className="text-sm font-medium text-[var(--text-caption)]">Completed</p>
              <p className="mt-2 text-2xl font-bold text-[var(--text-heading)]">{stats.completed}</p>
            </Card>
            <Card padding="md">
              <p className="text-sm font-medium text-[var(--text-caption)]">Total Invested</p>
              <p className="mt-2 text-2xl font-bold text-[var(--color-primary)]">
                {formatIDR(stats.spend, true)}
              </p>
            </Card>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-base font-semibold text-[var(--text-heading)]">Sessions</h3>
            <Tabs
              variant="pill"
              size="sm"
              value={filter}
              onChange={(v) => setFilter(v as typeof filter)}
              items={[
                { value: "all", label: "All", badge: counts.all },
                { value: "confirmed", label: "Confirmed", badge: counts.confirmed },
                { value: "pending", label: "Pending", badge: counts.pending },
                { value: "completed", label: "Completed", badge: counts.completed },
                { value: "cancelled", label: "Cancelled", badge: counts.cancelled },
              ]}
            />
          </div>

          {filtered.length === 0 ? (
            <Card padding="lg">
              <EmptyState
                title="No PT sessions yet"
                description="You haven't booked any personal-training sessions in this view. Start with a single session or grab a money-saving pack."
                action={
                  <Button variant="primary" onClick={() => setBooking(true)}>
                    Book your first PT
                  </Button>
                }
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {filtered.map((s) => {
                const coach = coachById(s.coachId);
                const tone = ptStatusMeta[s.status];
                return (
                  <Card key={s.id} hover padding="md">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <EngageAvatar src={coach?.avatar} name={coach?.name ?? ""} size={44} />
                        <div>
                          <p className="font-semibold text-[var(--text-heading)]">
                            Coach {coach?.name}
                          </p>
                          <p className="text-xs text-[var(--text-caption)]">{s.focus}</p>
                        </div>
                      </div>
                      <Badge
                        size="sm"
                        color={tone.tone === "neutral" ? "neutral" : tone.tone}
                        variant="light"
                        dot
                      >
                        {tone.label}
                      </Badge>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">Date</p>
                        <p className="font-medium text-[var(--text-body)]">{formatDateLong(s.date)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">Time</p>
                        <p className="font-medium text-[var(--text-body)]">
                          {s.startTime} · {s.durationMin}m
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">Court</p>
                        <p className="font-medium text-[var(--text-body)]">{s.court}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">Price</p>
                        <p className="font-semibold text-[var(--color-primary)]">
                          {formatIDR(s.price, true)}
                        </p>
                      </div>
                    </div>

                    {s.players === 2 && (
                      <div className="mt-3 border-t border-[var(--border-light)] pt-3">
                        <Badge size="sm" color="info" variant="light">
                          Pair session (1-on-2)
                        </Badge>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
