"use client";

import React, { useState } from "react";
import PageScaffold from "@/components/club-engage/PageScaffold";
import StatCard from "@/components/club-engage/StatCard";
import EngageAvatar from "@/components/club-engage/EngageAvatar";
import { formatIDR, formatNumber, pct } from "@/components/club-engage/format";
import Card from "@/components/ui/card/Card";
import Button from "@/components/ui/button/Button";
import LineChart from "@/components/ui/chart/LineChart";
import { useToast } from "@/components/ui/toast/ToastContext";
import { referralProgram, topReferrers } from "@/data/padel/engage/marketing";

const GiftIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v13m0-13a4 4 0 10-4-4 4 4 0 004 4zm0 0a4 4 0 114-4 4 4 0 01-4 4zM5 8h14v3H5V8zm1 3h12v9a1 1 0 01-1 1H7a1 1 0 01-1-1v-9z" /></svg>
);

export default function ReferralsPage() {
  const toast = useToast();
  const [link] = useState("https://smashcourt.id/r/RAKA-PRO");

  return (
    <PageScaffold
      title="Referral Program"
      subtitle="Members invite friends and both earn wallet credit. Track invites, conversions and top referrers."
      requireAny={["marketing.view"]}
      actions={
        <Button variant="primary" sheen onClick={() => toast.info("Reward settings (dummy).")}>
          Edit Rewards
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Invites" value={formatNumber(referralProgram.totalInvites)} accent="primary" delta="+10%" hint="vs last month" />
          <StatCard label="Converted" value={formatNumber(referralProgram.converted)} accent="secondary" delta="+14%" hint="vs last month" />
          <StatCard label="Conversion Rate" value={pct(referralProgram.conversionRate, 1)} accent="accent" />
          <StatCard label="Credit Issued" value={formatIDR(referralProgram.walletCreditIssued, true)} icon={<GiftIcon />} accent="amber" />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Reward structure + share */}
          <div className="space-y-6">
            <Card title="How It Works" padding="md">
              <div className="space-y-3">
                <div className="flex items-start gap-3 rounded-xl bg-[var(--color-primary-light)] p-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)] text-sm font-bold text-white">1</span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-heading)]">Referrer earns {formatIDR(referralProgram.referrerReward)}</p>
                    <p className="text-xs text-[var(--text-caption)]">Wallet credit for each friend who books their first session.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl bg-[var(--color-secondary-light)] p-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-secondary)] text-sm font-bold text-white">2</span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-heading)]">Friend gets {formatIDR(referralProgram.refereeReward)} off</p>
                    <p className="text-xs text-[var(--text-caption)]">Applied automatically to their first court booking.</p>
                  </div>
                </div>
              </div>
            </Card>

            <Card title="Share Link" padding="md">
              <div className="flex items-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-muted)] p-2">
                <span className="min-w-0 flex-1 truncate text-xs text-[var(--text-body)]">{link}</span>
                <Button
                  size="sm"
                  variant="soft"
                  onClick={() => {
                    if (navigator.clipboard) navigator.clipboard.writeText(link).catch(() => {});
                    toast.success("Referral link copied!");
                  }}
                >
                  Copy
                </Button>
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" fullWidth onClick={() => toast.info("Shared to WhatsApp (dummy).")}>WhatsApp</Button>
                <Button size="sm" variant="outline" fullWidth onClick={() => toast.info("Shared via Email (dummy).")}>Email</Button>
              </div>
            </Card>
          </div>

          {/* Trend chart */}
          <Card title="Referral Trend" desc="Invites sent vs converted (last 6 months)" padding="md" className="lg:col-span-2">
            <LineChart
              categories={referralProgram.monthlyTrend.categories}
              series={referralProgram.monthlyTrend.series}
              colors={["#6D5BFF", "#14B8A6"]}
              area
              height={300}
            />
          </Card>
        </div>

        {/* Top referrers */}
        <Card title="Top Referrers" desc="Members driving the most signups this season" padding="none">
          <div className="divide-y divide-[var(--border-light)]">
            {topReferrers.map((r, i) => (
              <div key={r.id} className="flex items-center gap-3 px-5 py-3">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${i === 0 ? "bg-amber-400 text-amber-950" : i === 1 ? "bg-slate-300 text-slate-700" : i === 2 ? "bg-orange-400 text-orange-950" : "bg-[var(--surface-muted)] text-[var(--text-caption)]"}`}>{i + 1}</span>
                <EngageAvatar src={r.avatar} name={r.name} size={38} ring={i < 3} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-[var(--text-heading)]">{r.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">{r.invites} invites · {r.converted} converted</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-[var(--color-primary)]">{formatIDR(r.rewardEarned, true)}</p>
                  <p className="text-[11px] text-[var(--text-muted)]">earned</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PageScaffold>
  );
}
