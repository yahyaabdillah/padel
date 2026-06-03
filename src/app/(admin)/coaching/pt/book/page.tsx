"use client";

// PadelHub — owner/staff PT booking via a dedicated Stepper PAGE.
// MANY inputs (client / coach / schedule / court / package) -> Stepper on a
// dedicated page per the project-wide UI rule (never a modal).
// Replaces the inline ModalDialog flow that still lives on /coaching/pt.

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import PageScaffold from "@/components/club-engage/PageScaffold";
import PtBookingStepper, {
  ptSessionFromResult,
  type PtBookingResult,
} from "@/components/club-engage/PtBookingStepper";
import Card from "@/components/ui/card/Card";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import EngageAvatar from "@/components/club-engage/EngageAvatar";
import { formatIDR, formatDateLong } from "@/components/club-engage/format";
import { useToast } from "@/components/ui/toast/ToastContext";
import { coachById } from "@/data/padel/engage/coaches";

const CheckCircle = () => (
  <svg className="h-9 w-9" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default function PtBookPage() {
  const router = useRouter();
  const toast = useToast();
  const [done, setDone] = useState<PtBookingResult | null>(null);

  const handleConfirm = (result: PtBookingResult) => {
    // No DB — confirmation screen + toast (the list page seeds from mock data).
    const session = ptSessionFromResult(result);
    void session; // shape kept for parity with the PT list model
    setDone(result);
    toast.success(
      `PT booked: ${result.clientName} with Coach ${coachById(result.coachId)?.name.split(" ")[0]}.`,
    );
  };

  return (
    <PageScaffold
      title="Book PT Session"
      subtitle="Schedule a one-on-one or pair personal-training session for a member."
      requireAny={["coaching.view"]}
      actions={
        <Button variant="outline" onClick={() => router.push("/coaching/pt")}>
          Back to PT
        </Button>
      }
    >
      <div className="mx-auto max-w-3xl">
        {done ? (
          <Card padding="lg" variant="gradient-border" className="overflow-hidden">
            <div className="flex flex-col items-center px-4 py-6 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
                <CheckCircle />
              </div>
              <h2 className="text-xl font-bold text-[var(--text-heading)]">PT Session Booked</h2>
              <p className="mt-1 text-sm text-[var(--text-caption)]">
                {done.clientName} is scheduled with Coach{" "}
                {coachById(done.coachId)?.name.split(" ")[0]}.
              </p>

              <div className="mt-6 w-full rounded-2xl border border-[var(--border-default)] bg-[var(--surface-muted)] p-5 text-left">
                <div className="flex items-center gap-3">
                  <EngageAvatar
                    src={coachById(done.coachId)?.avatar}
                    name={coachById(done.coachId)?.name ?? ""}
                    size={44}
                  />
                  <div>
                    <p className="font-semibold text-[var(--text-heading)]">
                      {coachById(done.coachId)?.name}
                    </p>
                    <p className="text-xs text-[var(--text-caption)]">
                      {formatDateLong(done.date)} · {done.startTime}
                    </p>
                  </div>
                  <Badge className="ml-auto" color="success" variant="light" dot>
                    Confirmed
                  </Badge>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">Court</dt>
                    <dd className="font-medium text-[var(--text-body)]">
                      {done.courtId ? "Reserved" : "Coach only"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">Sessions</dt>
                    <dd className="font-medium text-[var(--text-body)]">{done.sessions}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">Players</dt>
                    <dd className="font-medium text-[var(--text-body)]">
                      {done.players === 2 ? "Pair (1-on-2)" : "1-on-1"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">Total</dt>
                    <dd className="font-semibold text-[var(--color-primary)]">{formatIDR(done.total)}</dd>
                  </div>
                </dl>
              </div>

              <div className="mt-6 flex w-full flex-col gap-3 sm:flex-row">
                <Button variant="primary" fullWidth sheen onClick={() => router.push("/coaching/pt")}>
                  View all PT sessions
                </Button>
                <Button variant="outline" fullWidth onClick={() => setDone(null)}>
                  Book another
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <PtBookingStepper
            mode="staff"
            onConfirm={handleConfirm}
            onCancel={() => router.push("/coaching/pt")}
          />
        )}
      </div>
    </PageScaffold>
  );
}
