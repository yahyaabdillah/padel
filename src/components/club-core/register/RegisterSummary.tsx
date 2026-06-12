"use client";

// Sticky price-breakdown summary, always visible alongside the wizard. Pure
// presentational — receives the computed cost object from MemberRegister.

import React from "react";
import { formatIDR } from "@/components/club-core/format";
import { memberTierMeta, type MemberTier } from "@/data/padel/club/members";

export interface CostBreakdown {
  joinFee: number;
  courtIncluded: number;
  courtPaid: number;
  courtFeeTotal: number;
  /** full coach fee for all sessions (no waiver) */
  ptCoachFeeTotal: number;
  /** coach fee actually charged after free-coaching waiver */
  ptCoachChargedTotal: number;
  /** coach fee waived by the tier benefit */
  ptCoachWaivedTotal: number;
  ptCourtFeeTotal: number;
  /** free coaching sessions granted by the tier */
  freeCoaching: number;
  /** free coaching sessions actually consumed */
  freeUsed: number;
  promoDiscount: number;
  grandTotal: number;
}

interface RegisterSummaryProps {
  name: string;
  tier: MemberTier;
  cost: CostBreakdown;
  courtCount: number;
  ptCount: number;
}

const Row: React.FC<{
  label: string;
  value: string;
  muted?: boolean;
  strike?: boolean;
  positive?: boolean;
}> = ({ label, value, muted, strike, positive }) => (
  <div className="flex items-center justify-between gap-3 text-sm">
    <span className="text-[var(--text-caption)]">{label}</span>
    <span
      className={[
        strike ? "line-through text-[var(--text-muted)]" : "",
        positive ? "text-emerald-500 font-medium" : "",
        !strike && !positive
          ? muted
            ? "font-medium text-[var(--text-body)]"
            : "font-semibold text-[var(--text-heading)]"
          : "",
      ].join(" ")}
    >
      {value}
    </span>
  </div>
);

const RegisterSummary: React.FC<RegisterSummaryProps> = ({
  name,
  tier,
  cost,
  courtCount,
  ptCount,
}) => {
  const meta = memberTierMeta[tier];
  return (
    <div className="lg:sticky lg:top-24">
      <div className="overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)]">
        <div
          className="flex items-center gap-3 px-5 py-4"
          style={{ background: `${meta.color}14` }}
        >
          <span
            className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white"
            style={{ background: meta.color }}
          >
            {(name.trim()[0] ?? "?").toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--text-heading)]">
              {name.trim() || "New member"}
            </p>
            <p className="text-xs text-[var(--text-caption)]">
              {meta.label} · {meta.perk}
            </p>
          </div>
        </div>

        <div className="space-y-2.5 px-5 py-4">
          <Row label="Join fee" value={formatIDR(cost.joinFee)} muted />

          {courtCount > 0 && (
            <>
              <div className="pt-1 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                Court bookings · {courtCount}
              </div>
              {cost.courtIncluded > 0 && (
                <Row
                  label={`Included × ${cost.courtIncluded}`}
                  value="Rp0"
                  positive
                />
              )}
              {cost.courtPaid > 0 && (
                <Row
                  label={`Paid × ${cost.courtPaid}`}
                  value={formatIDR(cost.courtFeeTotal)}
                  muted
                />
              )}
            </>
          )}

          {ptCount > 0 && (
            <>
              <div className="pt-1 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                Coaching · {ptCount}
              </div>
              <Row
                label={`Coach fee × ${ptCount}`}
                value={formatIDR(cost.ptCoachFeeTotal)}
                muted={cost.freeUsed === 0}
                strike={cost.freeUsed > 0 && cost.ptCoachChargedTotal === 0}
              />
              {cost.freeUsed > 0 && (
                <Row
                  label={`Free coaching × ${cost.freeUsed}`}
                  value={`−${formatIDR(cost.ptCoachWaivedTotal)}`}
                  positive
                />
              )}
              {cost.ptCourtFeeTotal > 0 && (
                <Row
                  label="PT court fees"
                  value={formatIDR(cost.ptCourtFeeTotal)}
                  muted
                />
              )}
            </>
          )}

          {cost.promoDiscount > 0 && (
            <Row
              label="Promo / referral"
              value={`−${formatIDR(cost.promoDiscount)}`}
              positive
            />
          )}

          <div className="mt-2 flex items-center justify-between border-t border-[var(--border-default)] pt-3">
            <span className="text-sm font-semibold text-[var(--text-heading)]">
              Total due
            </span>
            <span className="text-xl font-bold text-[var(--color-primary)]">
              {formatIDR(cost.grandTotal)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterSummary;
