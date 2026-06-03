"use client";

import React from "react";
import EngageAvatar from "./EngageAvatar";
import type { OpenPlayPlayer, RoundMatch } from "@/data/padel/engage/matches";

interface MatchScoreCardProps {
  match: RoundMatch;
  players: OpenPlayPlayer[];
  /** index within the round used to address the score update */
  matchIndex: number;
  pointsPerMatch: number;
  onScore: (matchIndex: number, team: "A" | "B", value: number) => void;
  locked?: boolean;
}

function TeamRow({
  players,
  idxs,
  score,
  isWinner,
  team,
  onChange,
  pointsPerMatch,
  locked,
}: {
  players: OpenPlayPlayer[];
  idxs: [number, number];
  score: number | null;
  isWinner: boolean;
  team: "A" | "B";
  onChange: (value: number) => void;
  pointsPerMatch: number;
  locked?: boolean;
}) {
  const accent = team === "A" ? "var(--color-primary)" : "var(--color-secondary)";
  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 transition-colors ${
        isWinner ? "bg-[var(--color-primary-light)]" : "bg-[var(--surface-muted)]/60"
      }`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex -space-x-2">
          {idxs.map((pi) => (
            <EngageAvatar key={pi} src={players[pi]?.avatar} name={players[pi]?.name ?? "?"} size={26} />
          ))}
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-[var(--text-heading)]">
            {idxs.map((pi) => players[pi]?.name.split(" ")[0]).join(" & ")}
          </p>
        </div>
      </div>
      <input
        type="number"
        min={0}
        max={pointsPerMatch}
        inputMode="numeric"
        disabled={locked}
        value={score ?? ""}
        placeholder="–"
        onChange={(e) => {
          const raw = e.target.value;
          const n = raw === "" ? 0 : Math.max(0, Math.min(pointsPerMatch, parseInt(raw, 10) || 0));
          onChange(n);
        }}
        className="h-9 w-12 shrink-0 rounded-lg border text-center text-sm font-bold outline-none transition-colors focus:ring-2 disabled:opacity-60"
        style={{
          borderColor: "var(--border-default)",
          color: accent,
          background: "var(--surface-card)",
        }}
      />
    </div>
  );
}

const MatchScoreCard: React.FC<MatchScoreCardProps> = ({
  match,
  players,
  matchIndex,
  pointsPerMatch,
  onScore,
  locked,
}) => {
  const played = match.scoreA != null && match.scoreB != null;
  const aWin = played && (match.scoreA ?? 0) > (match.scoreB ?? 0);
  const bWin = played && (match.scoreB ?? 0) > (match.scoreA ?? 0);

  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-caption)]">
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[var(--color-primary)] text-[10px] font-bold text-white">
            {match.court}
          </span>
          Court {match.court}
        </span>
        {played ? (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
            Final
          </span>
        ) : (
          <span className="rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-muted)]">
            Awaiting
          </span>
        )}
      </div>
      <div className="space-y-1.5">
        <TeamRow
          players={players}
          idxs={match.teamA}
          score={match.scoreA}
          isWinner={aWin}
          team="A"
          pointsPerMatch={pointsPerMatch}
          locked={locked}
          onChange={(v) => onScore(matchIndex, "A", v)}
        />
        <div className="text-center text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">vs</div>
        <TeamRow
          players={players}
          idxs={match.teamB}
          score={match.scoreB}
          isWinner={bWin}
          team="B"
          pointsPerMatch={pointsPerMatch}
          locked={locked}
          onChange={(v) => onScore(matchIndex, "B", v)}
        />
      </div>
    </div>
  );
};

export default MatchScoreCard;
