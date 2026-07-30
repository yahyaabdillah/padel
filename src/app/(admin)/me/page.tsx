"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import { Progress } from "@/components/ui/progress/Progress";
import Skeleton from "@/components/ui/feedback/Skeleton";
import EmptyState from "@/components/ui/feedback/EmptyState";
import { useRole } from "@/context/RoleContext";
import StatCard from "@/components/member/StatCard";
import MembershipCard from "@/components/member/MembershipCard";
import BookingCard from "@/components/member/BookingCard";
import {
  WalletIcon,
  TrophyIcon,
  BoltIcon,
  PadelIcon,
  PlusIcon,
} from "@/components/member/icons";
import {
  memberBookings,
  walletState,
  walletActivity,
  leaderboard,
  myRankProgress,
  openPlaySessions,
  idr,
  prettyDate,
} from "@/data/padel/member";

export default function MemberDashboardPage() {
  const { currentUser } = useRole();
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  const upcoming = memberBookings
    .filter((b) => b.status === "confirmed" || b.status === "pending")
    .sort((a, b) => a.date.localeCompare(b.date));
  const nextBooking = upcoming[0];
  const me = leaderboard.find((p) => p.isMe);
  const openSoon = openPlaySessions.filter((s) => !s.joinedByMe).slice(0, 2);

  const pointsPct = Math.round((walletState.pointsBalance / walletState.pointsToNextReward) * 100);

  return (
    <div>
      <PageBreadCrumb pageTitle="My Dashboard" />

      {/* greeting */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-2xl font-bold text-[var(--text-heading)]">
            Hi, {currentUser.name.split(" ")[0]} 👋
          </h3>
          <p className="text-sm text-[var(--text-caption)]">
            Ready for your next rally at SmashCourt Padel Club?
          </p>
        </div>
        <Link href="/me/book">
          <Button startIcon={<PlusIcon className="h-4 w-4" />} glow>
            Book a court
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Skeleton className="h-56 lg:col-span-1" />
          <Skeleton className="h-56 lg:col-span-2" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* stats */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Wallet balance"
              value={idr(walletState.balance)}
              icon={<WalletIcon />}
              accent="primary"
              hint="Tap to top up"
            />
            <StatCard
              label="Loyalty points"
              value={walletState.pointsBalance.toLocaleString()}
              icon={<BoltIcon />}
              accent="accent"
              hint={`${walletState.pointsToNextReward - walletState.pointsBalance} to next reward`}
            />
            <StatCard
              label="Club ranking"
              value={`#${me?.rank ?? "–"}`}
              icon={<TrophyIcon />}
              accent="teal"
              trend={{ value: `+${myRankProgress.rankChange}`, up: true }}
              hint="this season"
            />
            <StatCard
              label="Matches won"
              value={me ? `${me.won}/${me.played}` : "–"}
              icon={<PadelIcon />}
              accent="neutral"
              hint={`${me?.winRate ?? 0}% win rate`}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* membership card + points */}
            <div className="space-y-6 lg:col-span-1">
              <MembershipCard
                memberName={currentUser.name}
                memberId={currentUser.id}
                tier={(currentUser.membershipTier as "Pro") ?? "Casual"}
                walletBalance={walletState.balance}
                memberSince={walletState.memberSince}
              />
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-5">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-[var(--text-heading)]">Reward progress</h4>
                  <Badge variant="light" color="primary" size="sm">
                    {pointsPct}%
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-[var(--text-caption)]">{walletState.nextRewardLabel}</p>
                <div className="mt-3">
                  <Progress value={pointsPct} color="primary" />
                </div>
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  {walletState.pointsBalance.toLocaleString()} /{" "}
                  {walletState.pointsToNextReward.toLocaleString()} pts
                </p>
              </div>
            </div>

            {/* next booking + open play */}
            <div className="space-y-6 lg:col-span-2">
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h4 className="font-semibold text-[var(--text-heading)]">Your next session</h4>
                  <Link href="/me/bookings" className="text-sm font-medium text-[var(--color-primary)] hover:underline">
                    View all
                  </Link>
                </div>
                {nextBooking ? (
                  <BookingCard booking={nextBooking} />
                ) : (
                  <EmptyState
                    title="No upcoming sessions"
                    description="Book a court to get back on the glass."
                    action={
                      <Link href="/me/book">
                        <Button size="sm">Book now</Button>
                      </Link>
                    }
                  />
                )}
              </div>

              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h4 className="font-semibold text-[var(--text-heading)]">Open play near you</h4>
                  <Link href="/me/matches" className="text-sm font-medium text-[var(--color-primary)] hover:underline">
                    Browse
                  </Link>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {openSoon.map((s) => (
                    <Link
                      key={s.id}
                      href="/me/matches"
                      className="group rounded-xl border border-[var(--border-default)] p-4 transition-all hover:border-[var(--color-primary)] hover:shadow-theme-sm"
                    >
                      <div className="flex items-center justify-between">
                        <Badge variant="light" color="primary" size="sm">
                          {s.format}
                        </Badge>
                        <span className="text-xs text-[var(--text-muted)]">{s.level}</span>
                      </div>
                      <p className="mt-2 font-semibold text-[var(--text-heading)] group-hover:text-[var(--color-primary)]">
                        {s.title}
                      </p>
                      <p className="mt-0.5 text-sm text-[var(--text-caption)]">
                        {prettyDate(s.date)} · {s.startTime} · {s.courtName}
                      </p>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="text-[var(--text-muted)]">
                          {s.joined}/{s.capacity} players
                        </span>
                        <span className="font-semibold text-[var(--color-primary)]">{idr(s.pricePerPlayer)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* recent wallet activity */}
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="font-semibold text-[var(--text-heading)]">Recent activity</h4>
              <Link href="/me/payments" className="text-sm font-medium text-[var(--color-primary)] hover:underline">
                All payments
              </Link>
            </div>
            <ul className="divide-y divide-[var(--border-light)]">
              {walletActivity.slice(0, 5).map((a) => (
                <li key={a.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-heading)]">{a.label}</p>
                    <p className="text-xs text-[var(--text-muted)]">{prettyDate(a.date)}</p>
                  </div>
                  <span
                    className={`text-sm font-semibold ${
                      a.amount >= 0 ? "text-emerald-500" : "text-[var(--text-heading)]"
                    }`}
                  >
                    {a.amount >= 0 ? "+" : "−"}
                    {idr(Math.abs(a.amount))}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
