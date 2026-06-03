"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Tag, Ticket, Check, X } from "lucide-react";
import TextInput from "@/components/ui/input/TextInput";
import Button from "@/components/ui/button/Button";
import { usePromos } from "@/context/PromoContext";
import type { MemberTier } from "@/data/padel/club/members";
import type { ApplyResult, PromoScope } from "@/data/padel/engage/promo-engine";

/* The ONE shared promo + referral input every transaction surface slots into:
 * membership signup/upgrade, court booking, PT booking, class enroll, POS
 * checkout. Promo code → live discount via PromoContext.applyPromo; referral
 * code → captured (dummy reward note). Emits onChange on every change; the
 * caller renders the discount line in its own price breakdown. */

export interface PromoReferralChange {
  promoCode: string;
  referralCode: string;
  result: ApplyResult;
  discount: number;
  finalAmount: number;
}

interface PromoReferralInputProps {
  scope: PromoScope;
  /** pre-discount subtotal (IDR) */
  amount: number;
  tier?: MemberTier;
  onChange: (s: PromoReferralChange) => void;
  className?: string;
}

const idr = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

const PromoReferralInput: React.FC<PromoReferralInputProps> = ({
  scope,
  amount,
  tier,
  onChange,
  className = "",
}) => {
  const { applyPromo } = usePromos();

  const [promoCode, setPromoCode] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [result, setResult] = useState<ApplyResult>({
    ok: false,
    discount: 0,
    finalAmount: amount,
  });
  const [applied, setApplied] = useState(false);

  // keep latest onChange without retriggering effects
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  const emit = useCallback(
    (next: ApplyResult, promo: string, referral: string) => {
      onChangeRef.current({
        promoCode: promo,
        referralCode: referral,
        result: next,
        discount: next.ok ? next.discount : 0,
        finalAmount: next.ok ? next.finalAmount : amount,
      });
    },
    [amount],
  );

  // Re-evaluate an applied promo when the amount/tier changes upstream.
  useEffect(() => {
    if (applied && promoCode.trim()) {
      const next = applyPromo({ code: promoCode, scope, amount, tier });
      setResult(next);
      emit(next, promoCode, referralCode);
    } else {
      const idle: ApplyResult = { ok: false, discount: 0, finalAmount: amount };
      setResult(idle);
      emit(idle, promoCode, referralCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, tier, scope]);

  const handleApply = () => {
    const next = applyPromo({ code: promoCode, scope, amount, tier });
    setResult(next);
    setApplied(true);
    emit(next, promoCode, referralCode);
  };

  const handlePromoChange = (v: string) => {
    setPromoCode(v);
    if (applied) {
      // editing after applying clears the active discount until re-applied
      setApplied(false);
      const idle: ApplyResult = { ok: false, discount: 0, finalAmount: amount };
      setResult(idle);
      emit(idle, v, referralCode);
    }
  };

  const handleReferralChange = (v: string) => {
    setReferralCode(v);
    emit(result, promoCode, v);
  };

  const showSuccess = applied && result.ok;
  const showError = applied && !result.ok && promoCode.trim().length > 0;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Promo code */}
      <div>
        <div className="flex items-end gap-2">
          <TextInput
            className="flex-1"
            label="Kode Promo"
            placeholder="cth. WEEKDAY30"
            value={promoCode}
            startIcon={<Tag className="h-4 w-4" />}
            onChange={handlePromoChange}
            hint="Kode unik promo (huruf besar, tanpa spasi)"
          />
          <Button
            variant="outline"
            size="md"
            onClick={handleApply}
            disabled={!promoCode.trim()}
          >
            Terapkan
          </Button>
        </div>
        {showSuccess && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-brand-600 dark:text-brand-400">
            <Check className="h-3.5 w-3.5" />
            {result.reason} Hemat {idr(result.discount)}.
          </p>
        )}
        {showError && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-[var(--color-error,#ef4444)]">
            <X className="h-3.5 w-3.5" />
            {result.reason}
          </p>
        )}
      </div>

      {/* Referral code */}
      <div>
        <TextInput
          label="Kode Referral (opsional)"
          placeholder="cth. ANDI-2026"
          value={referralCode}
          startIcon={<Ticket className="h-4 w-4" />}
          onChange={handleReferralChange}
          hint="Masukkan kode teman untuk reward referral"
        />
        {referralCode.trim().length > 0 && (
          <p className="mt-1.5 text-xs text-accent-700 dark:text-accent-400">
            Referral dicatat — temanmu dapat reward.
          </p>
        )}
      </div>
    </div>
  );
};

export default PromoReferralInput;
