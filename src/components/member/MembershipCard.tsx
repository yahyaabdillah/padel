"use client";

import React from "react";
import { idr, type MemberTier, tierById } from "@/data/padel/member";

interface MembershipCardProps {
  memberName: string;
  memberId: string;
  tier: MemberTier;
  walletBalance: number;
  memberSince: string;
  className?: string;
}

/** A glossy membership / loyalty card with a padel court motif. */
const MembershipCard: React.FC<MembershipCardProps> = ({
  memberName,
  memberId,
  tier,
  walletBalance,
  memberSince,
  className = "",
}) => {
  const def = tierById(tier);
  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-6 text-white shadow-theme-lg ${className}`}
      style={{
        background:
          "linear-gradient(135deg, #2a2350 0%, #6D5BFF 55%, #4b3fd6 100%)",
      }}
    >
      {/* court line motif */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.18]"
        viewBox="0 0 320 200"
        preserveAspectRatio="none"
        aria-hidden
      >
        <rect x="20" y="20" width="280" height="160" rx="6" fill="none" stroke="#fff" strokeWidth="2" />
        <line x1="160" y1="20" x2="160" y2="180" stroke="#fff" strokeWidth="2" />
        <line x1="20" y1="100" x2="300" y2="100" stroke="#fff" strokeWidth="1.5" />
        <line x1="90" y1="20" x2="90" y2="180" stroke="#fff" strokeWidth="1.5" />
        <line x1="230" y1="20" x2="230" y2="180" stroke="#fff" strokeWidth="1.5" />
      </svg>
      {/* lime ball glow */}
      <span className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-[#C6FF3D] opacity-30 blur-2xl" />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-semibold tracking-wide">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#C6FF3D]" />
            PadelHub
          </p>
          <p className="mt-0.5 text-xs text-white/70">Member Card</p>
        </div>
        <span
          className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider"
          style={{ background: def.color, color: tier === "Pro" ? "#fff" : "#0E1116" }}
        >
          {def.name}
        </span>
      </div>

      <div className="relative mt-8">
        <p className="text-xs uppercase tracking-widest text-white/60">Wallet balance</p>
        <p className="text-3xl font-bold">{idr(walletBalance)}</p>
      </div>

      <div className="relative mt-6 flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-white/60">Member</p>
          <p className="text-base font-semibold">{memberName}</p>
          <p className="mt-0.5 font-mono text-xs tracking-widest text-white/70">
            {memberId.toUpperCase()}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-widest text-white/60">Since</p>
          <p className="text-sm font-medium">
            {new Date(memberSince).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
          </p>
        </div>
      </div>
    </div>
  );
};

export default MembershipCard;
