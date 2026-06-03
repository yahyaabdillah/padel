"use client";

import React, { useMemo, useState } from "react";
import PageScaffold from "@/components/club-engage/PageScaffold";
import StatCard from "@/components/club-engage/StatCard";
import EngageAvatar from "@/components/club-engage/EngageAvatar";
import { formatNumber, pct } from "@/components/club-engage/format";
import Card from "@/components/ui/card/Card";
import Badge from "@/components/ui/badge/Badge";
import Tabs from "@/components/ui/tabs/Tabs";
import DataTable, { type Column } from "@/components/ui/table/DataTable";
import {
  seasonLeaderboard,
  leaderTierMeta,
  type LeaderboardRow,
  type LeaderTier,
} from "@/data/padel/engage/matches";

function RankDelta({ rank, prev }: { rank: number; prev: number }) {
  const diff = prev - rank;
  if (diff === 0) return <span className="text-[11px] font-medium text-[var(--text-muted)]">—</span>;
  const up = diff > 0;
  return (
    <span className={`text-[11px] font-semibold ${up ? "text-emerald-500" : "text-rose-500"}`}>
      {up ? "▲" : "▼"} {Math.abs(diff)}
    </span>
  );
}

export default function LeaderboardPage() {
  const [tier, setTier] = useState<"all" | LeaderTier>("all");

  const rows = useMemo(
    () => (tier === "all" ? seasonLeaderboard : seasonLeaderboard.filter((r) => r.tier === tier)),
    [tier],
  );

  const podium = seasonLeaderboard.slice(0, 3);
  const totalMatches = seasonLeaderboard.reduce((s, r) => s + r.played, 0);
  const topStreak = Math.max(...seasonLeaderboard.map((r) => r.winStreak));

  const columns: Column<LeaderboardRow>[] = [
    {
      key: "rank",
      header: "#",
      width: "72px",
      sortable: true,
      sortValue: (r) => r.rank,
      accessor: (r) => (
        <div className="flex items-center gap-2">
          <span className="font-bold text-[var(--text-heading)]">{r.rank}</span>
          <RankDelta rank={r.rank} prev={r.prevRank} />
        </div>
      ),
    },
    {
      key: "name",
      header: "Player",
      accessor: (r) => (
        <div className="flex items-center gap-3">
          <EngageAvatar src={r.avatar} name={r.name} size={36} ring={r.rank <= 3} />
          <div>
            <p className="font-medium text-[var(--text-heading)]">{r.name}</p>
            <Badge size="sm" color={leaderTierMeta[r.tier].tone} variant="light">{r.tier}</Badge>
          </div>
        </div>
      ),
    },
    { key: "played", header: "Played", align: "center", sortable: true, sortValue: (r) => r.played, accessor: (r) => r.played },
    {
      key: "record",
      header: "W / L",
      align: "center",
      accessor: (r) => (
        <span className="font-medium">
          <span className="text-emerald-500">{r.wins}</span>
          <span className="text-[var(--text-muted)]"> / </span>
          <span className="text-rose-500">{r.losses}</span>
        </span>
      ),
    },
    {
      key: "winrate",
      header: "Win %",
      align: "center",
      sortable: true,
      sortValue: (r) => r.wins / r.played,
      accessor: (r) => {
        const wr = (r.wins / r.played) * 100;
        return (
          <div className="flex items-center justify-center gap-2">
            <div className="h-1.5 w-14 overflow-hidden rounded-full bg-[var(--surface-muted)]">
              <div className="h-full rounded-full bg-[var(--color-secondary)]" style={{ width: `${wr}%` }} />
            </div>
            <span className="text-xs font-semibold text-[var(--text-body)]">{pct(wr)}</span>
          </div>
        );
      },
    },
    {
      key: "streak",
      header: "Streak",
      align: "center",
      sortable: true,
      sortValue: (r) => r.winStreak,
      accessor: (r) =>
        r.winStreak > 0 ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-500">
            🔥 {r.winStreak}
          </span>
        ) : (
          <span className="text-xs text-[var(--text-muted)]">—</span>
        ),
    },
    {
      key: "points",
      header: "Points",
      align: "right",
      sortable: true,
      sortValue: (r) => r.points,
      accessor: (r) => <span className="font-bold text-[var(--color-primary)]">{formatNumber(r.points)}</span>,
    },
  ];

  const podiumOrder = [podium[1], podium[0], podium[2]]; // 2nd, 1st, 3rd
  const heights = ["h-24", "h-32", "h-20"];
  const ringColors = ["ring-slate-300", "ring-amber-400", "ring-orange-400"];

  return (
    <PageScaffold
      title="Leaderboard"
      subtitle="Season rankings across all open-play and tournament matches at the club."
      requireAny={["matches.view"]}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Ranked Players" value={seasonLeaderboard.length} accent="primary" />
          <StatCard label="Matches Played" value={formatNumber(totalMatches)} accent="secondary" />
          <StatCard label="Top Win Streak" value={`🔥 ${topStreak}`} accent="amber" />
          <StatCard label="Season Leader" value={podium[0].name.split(" ")[0]} accent="accent" hint={`${formatNumber(podium[0].points)} pts`} />
        </div>

        {/* Podium */}
        <Card title="Top 3 This Season" padding="lg">
          <div className="flex items-end justify-center gap-3 sm:gap-6">
            {podiumOrder.map((p, i) => {
              const place = p.rank;
              return (
                <div key={p.playerId} className="flex flex-1 flex-col items-center" style={{ maxWidth: 160 }}>
                  <EngageAvatar src={p.avatar} name={p.name} size={i === 1 ? 64 : 52} className={`ring-4 ${ringColors[i]} ring-offset-2 ring-offset-[var(--surface-card)]`} />
                  <p className="mt-2 truncate text-sm font-semibold text-[var(--text-heading)]">{p.name}</p>
                  <p className="text-xs text-[var(--color-primary)]">{formatNumber(p.points)} pts</p>
                  <div className={`mt-2 flex w-full ${heights[i]} items-start justify-center rounded-t-xl bg-gradient-to-b from-[var(--color-primary-light)] to-transparent pt-2`}>
                    <span className="text-2xl font-black text-[var(--color-primary)]">{place}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-base font-semibold text-[var(--text-heading)]">Full Rankings</h3>
          <Tabs
            variant="segment"
            size="sm"
            value={tier}
            onChange={(v) => setTier(v as typeof tier)}
            items={[
              { value: "all", label: "All Tiers" },
              { value: "Elite", label: "Elite" },
              { value: "Pro", label: "Pro" },
              { value: "Casual", label: "Casual" },
            ]}
          />
        </div>

        <DataTable
          columns={columns}
          data={rows}
          rowKey={(r) => r.playerId}
          defaultSort={{ key: "rank", direction: "asc" }}
        />
      </div>
    </PageScaffold>
  );
}
