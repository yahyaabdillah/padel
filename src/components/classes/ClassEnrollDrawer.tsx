"use client";

import React, { useEffect, useMemo, useState } from "react";
import Drawer from "@/components/ui/drawer/Drawer";
import Button from "@/components/ui/button/Button";
import Select from "@/components/ui/select/Select";
import Badge from "@/components/ui/badge/Badge";
import EngageAvatar from "@/components/club-engage/EngageAvatar";
import EmptyState from "@/components/ui/feedback/EmptyState";
import PromoReferralInput, {
  type PromoReferralChange,
} from "@/components/shared/PromoReferralInput";
import { formatIDR } from "@/components/club-engage/format";
import { coachById, dayFull, type ManagedClass } from "@/data/padel/engage/classes";
import {
  memberOptions,
  memberById,
  memberTierMeta,
} from "@/data/padel/club/members";

/* Enroll a member into a class. Picks the member (tier drives audience-gated
 * promos), runs the shared <PromoReferralInput scope="class" .../> to discount
 * the per-session price, then commits a seat. Shows live seats/capacity. */

interface ClassEnrollDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cls: ManagedClass | null;
  /** commit one enrollment; page increments the seat + fires a notification */
  onEnroll: (args: {
    memberId: string;
    finalPrice: number;
    discount: number;
    promoCode: string;
  }) => void;
}

const idle: PromoReferralChange = {
  promoCode: "",
  referralCode: "",
  result: { ok: false, discount: 0, finalAmount: 0 },
  discount: 0,
  finalAmount: 0,
};

const ClassEnrollDrawer: React.FC<ClassEnrollDrawerProps> = ({
  isOpen,
  onClose,
  cls,
  onEnroll,
}) => {
  const [memberId, setMemberId] = useState("");
  const [promo, setPromo] = useState<PromoReferralChange>(idle);

  useEffect(() => {
    if (isOpen) {
      setMemberId("");
      setPromo(idle);
    }
  }, [isOpen, cls?.id]);

  const member = memberId ? memberById(memberId) : undefined;
  const coach = cls ? coachById(cls.coachId) : undefined;

  const basePrice = cls?.pricePerSession ?? 0;
  const seatsLeft = cls ? Math.max(0, cls.capacity - cls.enrolled) : 0;
  const full = seatsLeft === 0;

  const discount = promo.result.ok ? promo.discount : 0;
  const finalPrice = Math.max(0, basePrice - discount);

  const tierBadge = member ? memberTierMeta[member.tier] : undefined;

  const canEnroll = !!member && !full && !!cls && cls.status === "active";

  const handleEnroll = () => {
    if (!canEnroll || !member) return;
    onEnroll({
      memberId: member.id,
      finalPrice,
      discount,
      promoCode: promo.result.ok ? promo.promoCode : "",
    });
  };

  const fillPct = useMemo(
    () => (cls ? Math.min(100, (cls.enrolled / cls.capacity) * 100) : 0),
    [cls],
  );

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      side="right"
      size="w-full max-w-lg"
      title={cls ? `Enroll — ${cls.title}` : "Enroll"}
      footer={
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm">
            <span className="text-[var(--text-caption)]">Total</span>{" "}
            <span className="font-semibold text-[var(--text-heading)]">
              {formatIDR(finalPrice)}
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
            <Button
              variant="primary"
              sheen
              disabled={!canEnroll}
              onClick={handleEnroll}
            >
              {full ? "Class Full" : "Confirm Enrollment"}
            </Button>
          </div>
        </div>
      }
    >
      {cls && (
        <div className="space-y-5">
          {/* Class summary */}
          <div className="rounded-xl border border-[var(--border-light)] bg-[var(--surface-muted)]/60 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge color="primary" variant="light">{cls.type}</Badge>
              <Badge color="secondary" variant="light">{cls.level}</Badge>
              {cls.status === "cancelled" && (
                <Badge color="error" variant="light">Cancelled</Badge>
              )}
            </div>
            <p className="mt-2 text-sm text-[var(--text-caption)]">
              {dayFull[cls.day]} · {cls.startTime}–{cls.endTime} · {cls.court}
            </p>
            {coach && (
              <div className="mt-3 flex items-center gap-2.5">
                <EngageAvatar src={coach.avatar} name={coach.name} size={32} />
                <div className="text-sm">
                  <p className="font-medium text-[var(--text-heading)]">{coach.name}</p>
                  <p className="text-xs text-[var(--color-primary)]">{coach.level}</p>
                </div>
              </div>
            )}

            {/* seats / capacity */}
            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="font-medium text-[var(--text-caption)]">Seats</span>
                <span className="font-semibold text-[var(--text-heading)]">
                  {cls.enrolled}/{cls.capacity} · {seatsLeft} left
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--surface-muted)]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${fillPct}%`,
                    backgroundColor: full ? "var(--color-error,#ef4444)" : "var(--color-primary)",
                  }}
                />
              </div>
            </div>
          </div>

          {cls.status === "cancelled" ? (
            <EmptyState
              title="Class cancelled"
              description="This class is cancelled and not open for enrollment. Reactivate it from the schedule to enroll members."
            />
          ) : full ? (
            <EmptyState
              title="No seats left"
              description="This class is fully booked. Increase capacity from Edit, or pick another session."
            />
          ) : (
            <>
              {/* Member picker */}
              <Select
                label="Member"
                placeholder="Search a member to enroll"
                searchable
                value={memberId}
                options={memberOptions}
                clearable={false}
                onChange={(v) => setMemberId(v as string)}
              />

              {member && tierBadge && (
                <div className="flex items-center gap-2.5 rounded-xl bg-[var(--surface-muted)]/60 p-3">
                  <EngageAvatar src={member.avatar} name={member.name} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--text-heading)]">
                      {member.name}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">{member.phone}</p>
                  </div>
                  <Badge color={tierBadge.tone} variant="light">{tierBadge.label}</Badge>
                </div>
              )}

              {/* Promo + referral — shared engine, scope="class" */}
              {member && (
                <PromoReferralInput
                  scope="class"
                  amount={basePrice}
                  tier={member.tier}
                  onChange={setPromo}
                />
              )}

              {/* Price breakdown */}
              <div className="space-y-1.5 rounded-xl border border-[var(--border-light)] p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-caption)]">Price / session</span>
                  <span className="text-[var(--text-body)]">{formatIDR(basePrice)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex items-center justify-between text-brand-600 dark:text-brand-400">
                    <span>Promo {promo.promoCode && `(${promo.promoCode})`}</span>
                    <span>−{formatIDR(discount)}</span>
                  </div>
                )}
                <div className="mt-1 flex items-center justify-between border-t border-[var(--border-light)] pt-2 font-semibold text-[var(--text-heading)]">
                  <span>Total</span>
                  <span>{formatIDR(finalPrice)}</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </Drawer>
  );
};

export default ClassEnrollDrawer;
