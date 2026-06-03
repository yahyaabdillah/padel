"use client";

import React, { useState } from "react";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import Badge from "@/components/ui/badge/Badge";
import Tabs from "@/components/ui/tabs/Tabs";
import Avatar from "@/components/ui/avatar/Avatar";
import StatCard from "@/components/member/StatCard";
import { TrophyIcon, BoltIcon, ArrowUpIcon, PadelIcon } from "@/components/member/icons";
import {
  leaderboard,
  leaderboardSeason,
  myRankProgress,
} from "@/data/padel/member";

function rankDelta(rank: number, prev: number) {
  const d = prev - rank;
  if (d > 0) return { text: `▲ ${d}`, cls: "text-emerald-500" };
  if (d < 0) return { text: `▼ ${-d}`, cls: "text-red-500" };
  return { text: "–", cls: "text-[var(--text-muted)]" };
}

export default function MemberLeaderboardPage() {
  const [scope, setScope] = useState("all");
  const me = leaderboard.find((p) => p.isMe);
  const podium = leaderboard.slice(0, 3);

  return (
    <div>
      <PageBreadCrumb pageTitle="Leaderboard" />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Badge variant="light" color="primary" startIcon={<TrophyIcon className="h-3.5 w-3.5" />}>
          {leaderboardSeason}
        </Badge>
        <Tabs
          variant="segment"
          size="sm"
          items={[
            { value: "all", label: "Overall" },
            { value: "pro", label: "Pro tier" },
            { value: "elite", label: "Elite tier" },
          ]}
          value={scope}
          onChange={setScope}
        />
      </div>

      {/* my snapshot */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Your rank" value={`#${me?.rank}`} icon={<TrophyIcon />} accent="primary" trend={{ value: `+${myRankProgress.rankChange}`, up: true }} />
        <StatCard label="Season points" value={myRankProgress.pointsThisSeason.toLocaleString()} icon={<BoltIcon />} accent="accent" />
        <StatCard label="Win rate" value={`${me?.winRate}%`} icon={<PadelIcon />} accent="teal" />
        <StatCard label="To next rank" value={myRankProgress.pointsToNextRank} icon={<ArrowUpIcon />} accent="neutral" hint={`vs ${myRankProgress.nextRankPlayer}`} />
      </div>

      {/* podium */}
      <div className="mb-6 grid grid-cols-3 gap-3 sm:gap-5">
        {[podium[1], podium[0], podium[2]].map((p, i) => {
          const place = i === 1 ? 1 : i === 0 ? 2 : 3;
          const heights = { 1: "sm:pt-2", 2: "sm:pt-8", 3: "sm:pt-10" } as const;
          const medal = place === 1 ? "🥇" : place === 2 ? "🥈" : "🥉";
          return (
            <div key={p.id} className={`flex flex-col items-center ${heights[place as 1 | 2 | 3]}`}>
              <div
                className={`flex w-full flex-col items-center rounded-2xl border p-4 text-center ${
                  place === 1
                    ? "border-[var(--color-primary)] bg-[var(--color-primary-light)]"
                    : "border-[var(--border-default)] bg-[var(--surface-card)]"
                }`}
              >
                <span className="text-2xl">{medal}</span>
                <Avatar src={p.avatar} name={p.name} size="lg" className="mt-1" />
                <p className="mt-2 truncate text-sm font-semibold text-[var(--text-heading)]">{p.name}</p>
                <Badge variant="light" color={p.tier === "Elite" ? "secondary" : "primary"} size="sm">
                  {p.tier}
                </Badge>
                <p className="mt-1 text-lg font-bold text-[var(--color-primary)]">{p.points.toLocaleString()}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* full table */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)]">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-light)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3 text-center">Move</th>
                <th className="hidden px-4 py-3 text-center sm:table-cell">P</th>
                <th className="hidden px-4 py-3 text-center sm:table-cell">W</th>
                <th className="px-4 py-3 text-center">Win %</th>
                <th className="px-4 py-3 text-center">Streak</th>
                <th className="px-4 py-3 text-right">Points</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((p) => {
                const d = rankDelta(p.rank, p.prevRank);
                return (
                  <tr
                    key={p.id}
                    className={`border-b border-[var(--border-light)] last:border-0 transition-colors ${
                      p.isMe ? "bg-[var(--color-primary-light)]" : "hover:bg-[var(--surface-muted)]"
                    }`}
                  >
                    <td className="px-4 py-3 font-bold text-[var(--text-heading)]">{p.rank}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar src={p.avatar} name={p.name} size="sm" />
                        <div>
                          <p className="font-medium text-[var(--text-heading)]">
                            {p.name} {p.isMe && <span className="text-[var(--color-primary)]">(you)</span>}
                          </p>
                          <p className="text-xs text-[var(--text-muted)]">{p.tier}</p>
                        </div>
                      </div>
                    </td>
                    <td className={`px-4 py-3 text-center text-xs font-semibold ${d.cls}`}>{d.text}</td>
                    <td className="hidden px-4 py-3 text-center text-[var(--text-caption)] sm:table-cell">{p.played}</td>
                    <td className="hidden px-4 py-3 text-center text-[var(--text-caption)] sm:table-cell">{p.won}</td>
                    <td className="px-4 py-3 text-center text-[var(--text-caption)]">{p.winRate}%</td>
                    <td className="px-4 py-3 text-center">
                      <span className={p.streak >= 0 ? "text-emerald-500" : "text-red-500"}>
                        {p.streak >= 0 ? `W${p.streak}` : `L${-p.streak}`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-[var(--text-heading)]">
                      {p.points.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
