"use client";

import React, { useState } from "react";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import { ModalDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast/ToastContext";
import { useRole } from "@/context/RoleContext";
import MembershipCard from "@/components/member/MembershipCard";
import { CheckIcon, WalletIcon } from "@/components/member/icons";
import PromoReferralInput from "@/components/shared/PromoReferralInput";
import type { MemberTier as ClubMemberTier } from "@/data/padel/club/members";
import {
  tierDefinitions,
  walletState as seedWallet,
  topupOptions,
  walletActivity,
  idr,
  prettyDate,
  type MemberTier,
} from "@/data/padel/member";

export default function MembershipPage() {
  const toast = useToast();
  const { currentUser } = useRole();
  const currentTier = (currentUser.membershipTier as MemberTier) ?? "Casual";
  const [balance, setBalance] = useState(seedWallet.balance);
  const [topupOpen, setTopupOpen] = useState(false);
  const [chosen, setChosen] = useState(topupOptions[1]);
  const [upgradeTier, setUpgradeTier] = useState<MemberTier | null>(null);
  const [promoDiscount, setPromoDiscount] = useState(0);

  // First month of the target tier is the membership transaction subtotal.
  const upgradeDef = tierDefinitions.find((t) => t.id === upgradeTier);
  const upgradeGross = upgradeDef?.priceMonthly ?? 0;
  const upgradePromo = Math.min(promoDiscount, upgradeGross);
  const upgradePayable = Math.max(upgradeGross - upgradePromo, 0);
  const promoTier: ClubMemberTier = (
    (currentUser.membershipTier as string) ?? "casual"
  ).toLowerCase() as ClubMemberTier;

  const doTopup = () => {
    const credited = chosen.amount + chosen.bonus;
    setBalance((b) => b + credited);
    setTopupOpen(false);
    toast.success(`${idr(credited)} added to your wallet`, "Top-up successful");
  };

  const doUpgrade = () => {
    if (!upgradeTier) return;
    toast.success(`Switched to ${upgradeTier} (demo)`, "Membership updated");
    setUpgradeTier(null);
    setPromoDiscount(0);
  };

  const closeUpgrade = () => {
    setUpgradeTier(null);
    setPromoDiscount(0);
  };

  return (
    <div>
      <PageBreadCrumb pageTitle="Membership & Wallet" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* card + wallet */}
        <div className="space-y-6 lg:col-span-1">
          <MembershipCard
            memberName={currentUser.name}
            memberId={currentUser.id}
            tier={currentTier}
            walletBalance={balance}
            memberSince={seedWallet.memberSince}
          />
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-caption)]">Wallet balance</p>
                <p className="text-2xl font-bold text-[var(--text-heading)]">{idr(balance)}</p>
              </div>
              <Button size="sm" startIcon={<WalletIcon className="h-4 w-4" />} onClick={() => setTopupOpen(true)}>
                Top up
              </Button>
            </div>
            <div className="mt-4 border-t border-[var(--border-light)] pt-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                Recent
              </p>
              <ul className="space-y-2">
                {walletActivity.slice(0, 4).map((a) => (
                  <li key={a.id} className="flex items-center justify-between text-sm">
                    <span className="text-[var(--text-caption)]">
                      {a.label}
                      <span className="ml-1 text-xs text-[var(--text-muted)]">· {prettyDate(a.date)}</span>
                    </span>
                    <span className={a.amount >= 0 ? "font-medium text-emerald-500" : "font-medium text-[var(--text-heading)]"}>
                      {a.amount >= 0 ? "+" : "−"}{idr(Math.abs(a.amount))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* tiers */}
        <div className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="font-semibold text-[var(--text-heading)]">Membership tiers</h4>
            <Badge variant="light" color="primary">
              Current: {currentTier}
            </Badge>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {tierDefinitions.map((t) => {
              const isCurrent = t.id === currentTier;
              return (
                <div
                  key={t.id}
                  className={`relative flex flex-col rounded-2xl border bg-[var(--surface-card)] p-5 transition-all duration-300 ${
                    t.highlighted
                      ? "border-[var(--color-primary)] shadow-theme-md"
                      : "border-[var(--border-default)]"
                  }`}
                >
                  {t.highlighted && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-[var(--color-primary)] px-3 py-0.5 text-[11px] font-semibold text-white">
                      Most popular
                    </span>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ background: t.color }} />
                    <h5 className="text-lg font-bold text-[var(--text-heading)]">{t.name}</h5>
                  </div>
                  <p className="mt-1 text-sm text-[var(--text-caption)]">{t.blurb}</p>
                  <p className="mt-3">
                    <span className="text-2xl font-bold text-[var(--text-heading)]">
                      {t.priceMonthly === 0 ? "Free" : idr(t.priceMonthly)}
                    </span>
                    {t.priceMonthly > 0 && <span className="text-sm text-[var(--text-muted)]">/mo</span>}
                  </p>
                  <ul className="mt-4 flex-1 space-y-2">
                    {t.perks.map((p) => (
                      <li key={p} className="flex items-start gap-2 text-sm text-[var(--text-body)]">
                        <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-primary)]" />
                        {p}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="mt-5"
                    fullWidth
                    variant={isCurrent ? "outline" : t.highlighted ? "primary" : "soft"}
                    disabled={isCurrent}
                    onClick={() => setUpgradeTier(t.id)}
                  >
                    {isCurrent ? "Current plan" : t.priceMonthly === 0 ? "Downgrade" : `Switch to ${t.name}`}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* top-up modal */}
      <ModalDialog
        isOpen={topupOpen}
        onClose={() => setTopupOpen(false)}
        title="Top up your wallet"
        description="Choose an amount. Bonus credit applies instantly (demo)."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setTopupOpen(false)}>
              Cancel
            </Button>
            <Button onClick={doTopup} glow>
              Pay {idr(chosen.amount)}
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          {topupOptions.map((o) => {
            const active = o.amount === chosen.amount;
            return (
              <button
                key={o.amount}
                onClick={() => setChosen(o)}
                className={`rounded-xl border p-4 text-left transition-all ${
                  active
                    ? "border-[var(--color-primary)] bg-[var(--color-primary-light)]"
                    : "border-[var(--border-default)] hover:border-[var(--color-primary)]"
                }`}
              >
                <p className="text-lg font-bold text-[var(--text-heading)]">{idr(o.amount)}</p>
                {o.bonus > 0 ? (
                  <Badge variant="light" color="success" size="sm">
                    +{idr(o.bonus)} bonus
                  </Badge>
                ) : (
                  <span className="text-xs text-[var(--text-muted)]">No bonus</span>
                )}
              </button>
            );
          })}
        </div>
      </ModalDialog>

      {/* upgrade confirm */}
      <ModalDialog
        isOpen={!!upgradeTier}
        onClose={closeUpgrade}
        title={`Switch to ${upgradeTier}?`}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={closeUpgrade}>
              Cancel
            </Button>
            <Button onClick={doUpgrade}>
              {upgradeGross > 0 ? `Pay ${idr(upgradePayable)}` : "Confirm"}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-[var(--text-caption)]">
          Your new tier benefits take effect immediately. This is a demo — no real charge is made.
        </p>

        {upgradeGross > 0 && (
          <div className="mt-5 space-y-4">
            <PromoReferralInput
              scope="membership"
              amount={upgradeGross}
              tier={promoTier}
              onChange={(s) => setPromoDiscount(s.discount)}
            />
            <div className="space-y-2 border-t border-[var(--border-light)] pt-3 text-sm">
              <div className="flex items-center justify-between text-[var(--text-caption)]">
                <span>First month</span>
                <span>{idr(upgradeGross)}</span>
              </div>
              {upgradePromo > 0 && (
                <div className="flex items-center justify-between text-emerald-500">
                  <span>Promo</span>
                  <span>−{idr(upgradePromo)}</span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-[var(--border-light)] pt-2">
                <span className="font-medium text-[var(--text-heading)]">Total today</span>
                <span className="text-lg font-bold text-[var(--color-primary)]">
                  {idr(upgradePayable)}
                </span>
              </div>
            </div>
          </div>
        )}
      </ModalDialog>
    </div>
  );
}
