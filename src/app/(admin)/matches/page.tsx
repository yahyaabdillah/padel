"use client";

import React, { useMemo, useState } from "react";
import PageScaffold from "@/components/club-engage/PageScaffold";
import StatCard from "@/components/club-engage/StatCard";
import EngageAvatar from "@/components/club-engage/EngageAvatar";
import MatchScoreCard from "@/components/club-engage/MatchScoreCard";
import { formatDateLong } from "@/components/club-engage/format";
import Card from "@/components/ui/card/Card";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import Tabs from "@/components/ui/tabs/Tabs";
import EmptyState from "@/components/ui/feedback/EmptyState";
import { useToast } from "@/components/ui/toast/ToastContext";
import {
  openPlayPool,
  matchFormatMeta,
  generateAmericanoRounds,
  generateMexicanoRound,
  computeStandings,
  pastSessions,
  type MatchFormat,
  type GeneratedRound,
  type OpenPlayPlayer,
} from "@/data/padel/engage/matches";

const TrophyIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 21h8m-4-4v4m7-17H5v3a5 5 0 005 5h4a5 5 0 005-5V4zM5 4H3v2a3 3 0 003 3m13-5h2v2a3 3 0 01-3 3" /></svg>
);

type Phase = "setup" | "live";

export default function MatchesPage() {
  const toast = useToast();
  const [view, setView] = useState<"play" | "history">("play");

  // ── setup ──
  const [format, setFormat] = useState<MatchFormat>("americano");
  const [selectedIds, setSelectedIds] = useState<string[]>(
    openPlayPool.slice(0, 8).map((p) => p.id),
  );
  const [courts, setCourts] = useState(2);
  const [pointsPerMatch, setPointsPerMatch] = useState(24);

  // ── live ──
  const [phase, setPhase] = useState<Phase>("setup");
  const [players, setPlayers] = useState<OpenPlayPlayer[]>([]);
  const [rounds, setRounds] = useState<GeneratedRound[]>([]);
  const [activeRound, setActiveRound] = useState(0);

  const selectedPlayers = useMemo(
    () => openPlayPool.filter((p) => selectedIds.includes(p.id)),
    [selectedIds],
  );

  const togglePlayer = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const canGenerate = selectedPlayers.length >= 4 && courts >= 1;

  const handleGenerate = () => {
    if (!canGenerate) {
      toast.warning("Select at least 4 players to start a session.");
      return;
    }
    const ps = [...selectedPlayers];
    let generated: GeneratedRound[];
    if (format === "americano") {
      // full rotation, but cap to a sensible number of rounds for the demo
      const all = generateAmericanoRounds(ps.length, courts);
      generated = all.slice(0, Math.min(all.length, ps.length - 1));
    } else {
      // Mexicano: round 1 seeded by rating (already ordered by rating asc)
      const seeded = ps
        .map((p, i) => ({ i, rating: p.rating }))
        .sort((a, b) => a.rating - b.rating)
        .map((x) => x.i);
      generated = [generateMexicanoRound(seeded, courts, 1)];
    }
    setPlayers(ps);
    setRounds(generated);
    setActiveRound(0);
    setPhase("live");
    toast.success(`${matchFormatMeta[format].label} session generated — ${generated.length} round(s) ready.`);
  };

  const handleScore = (roundIdx: number, matchIndex: number, team: "A" | "B", value: number) => {
    setRounds((prev) =>
      prev.map((r, ri) => {
        if (ri !== roundIdx) return r;
        const matches = r.matches.map((m, mi) =>
          mi === matchIndex ? { ...m, [team === "A" ? "scoreA" : "scoreB"]: value } : m,
        );
        return { ...r, matches };
      }),
    );
  };

  const standings = useMemo(
    () => (players.length ? computeStandings(players.length, rounds) : []),
    [players.length, rounds],
  );

  const roundComplete = (r?: GeneratedRound) =>
    !!r && r.matches.length > 0 && r.matches.every((m) => m.scoreA != null && m.scoreB != null);

  const handleNextMexicanoRound = () => {
    const current = rounds[activeRound];
    if (!roundComplete(current)) {
      toast.warning("Enter all scores for this round first.");
      return;
    }
    // Re-rank by standings, generate next mexicano round.
    const ranked = computeStandings(players.length, rounds).map((s) => s.index);
    const next = generateMexicanoRound(ranked, courts, rounds.length + 1);
    setRounds((prev) => [...prev, next]);
    setActiveRound(rounds.length);
    toast.info(`Round ${rounds.length + 1} paired by current standings.`);
  };

  const resetSession = () => {
    setPhase("setup");
    setRounds([]);
    setPlayers([]);
    setActiveRound(0);
  };

  const totalMatchesPlayed = useMemo(
    () =>
      rounds.reduce(
        (sum, r) => sum + r.matches.filter((m) => m.scoreA != null && m.scoreB != null).length,
        0,
      ),
    [rounds],
  );

  return (
    <PageScaffold
      title="Open Play & Matches"
      subtitle="Run Americano & Mexicano sessions. Auto-generate pairings across courts and enter scores live."
      requireAny={["matches.view"]}
      actions={
        <Tabs
          variant="segment"
          size="sm"
          value={view}
          onChange={(v) => setView(v as typeof view)}
          items={[
            { value: "play", label: "Open Play" },
            { value: "history", label: "History" },
          ]}
        />
      }
    >
      {view === "history" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {pastSessions.map((s) => (
            <Card key={s.id} variant="accent-top" hover padding="md">
              <div className="flex items-start justify-between">
                <h4 className="font-semibold text-[var(--text-heading)]">{s.title}</h4>
                <Badge size="sm" color={s.format === "americano" ? "primary" : "secondary"} variant="light">
                  {matchFormatMeta[s.format].label}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-[var(--text-caption)]">{formatDateLong(s.date)}</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div><p className="text-lg font-bold text-[var(--text-heading)]">{s.players}</p><p className="text-[10px] text-[var(--text-muted)]">Players</p></div>
                <div><p className="text-lg font-bold text-[var(--text-heading)]">{s.rounds}</p><p className="text-[10px] text-[var(--text-muted)]">Rounds</p></div>
                <div><p className="text-lg font-bold text-[var(--text-heading)]">{s.pointsPlayed}</p><p className="text-[10px] text-[var(--text-muted)]">Points</p></div>
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-[var(--color-accent-light)] px-3 py-2">
                <TrophyIcon />
                <span className="text-sm font-semibold text-[var(--text-heading)]">Winner: {s.winner}</span>
              </div>
            </Card>
          ))}
        </div>
      ) : phase === "setup" ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {/* Format + players */}
          <div className="space-y-6 xl:col-span-2">
            <Card title="1. Choose Format" padding="md">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {(Object.keys(matchFormatMeta) as MatchFormat[]).map((f) => {
                  const meta = matchFormatMeta[f];
                  const active = format === f;
                  return (
                    <button
                      key={f}
                      onClick={() => setFormat(f)}
                      className={`rounded-2xl border-2 p-4 text-left transition-all ${
                        active
                          ? "border-[var(--color-primary)] bg-[var(--color-primary-light)]"
                          : "border-[var(--border-default)] hover:border-[var(--color-primary)]/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[var(--text-heading)]">{meta.label}</span>
                        {active && <Badge size="sm" color="primary" variant="solid">Selected</Badge>}
                      </div>
                      <p className="mt-1 text-xs text-[var(--text-caption)]">{meta.blurb}</p>
                    </button>
                  );
                })}
              </div>
            </Card>

            <Card
              title="2. Select Players"
              desc={`${selectedPlayers.length} selected · need at least 4`}
              padding="md"
              action={
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setSelectedIds(
                      selectedIds.length === openPlayPool.length ? [] : openPlayPool.map((p) => p.id),
                    )
                  }
                >
                  {selectedIds.length === openPlayPool.length ? "Clear" : "Select all"}
                </Button>
              }
            >
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {openPlayPool.map((p) => {
                  const on = selectedIds.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => togglePlayer(p.id)}
                      className={`flex items-center gap-2 rounded-xl border p-2 text-left transition-all ${
                        on
                          ? "border-[var(--color-primary)] bg-[var(--color-primary-light)]"
                          : "border-[var(--border-default)] hover:bg-[var(--surface-muted)]"
                      }`}
                    >
                      <EngageAvatar src={p.avatar} name={p.name} size={32} ring={on} />
                      <span className="min-w-0 flex-1 truncate text-xs font-medium text-[var(--text-heading)]">
                        {p.name}
                      </span>
                      {on && (
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-[10px] text-white">
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Config + generate */}
          <div className="space-y-6">
            <Card title="3. Session Setup" padding="md">
              <div className="space-y-5">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm font-medium text-[var(--text-body)]">Courts available</label>
                    <span className="text-sm font-bold text-[var(--color-primary)]">{courts}</span>
                  </div>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <button
                        key={n}
                        onClick={() => setCourts(n)}
                        className={`h-9 flex-1 rounded-lg text-sm font-semibold transition-colors ${
                          courts === n
                            ? "bg-[var(--color-primary)] text-white"
                            : "bg-[var(--surface-muted)] text-[var(--text-caption)] hover:bg-[var(--color-primary-light)]"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm font-medium text-[var(--text-body)]">Points per match</label>
                    <span className="text-sm font-bold text-[var(--color-primary)]">{pointsPerMatch}</span>
                  </div>
                  <div className="flex gap-2">
                    {[16, 21, 24, 32].map((n) => (
                      <button
                        key={n}
                        onClick={() => setPointsPerMatch(n)}
                        className={`h-9 flex-1 rounded-lg text-sm font-semibold transition-colors ${
                          pointsPerMatch === n
                            ? "bg-[var(--color-primary)] text-white"
                            : "bg-[var(--surface-muted)] text-[var(--text-caption)] hover:bg-[var(--color-primary-light)]"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl bg-[var(--surface-muted)] p-3 text-xs text-[var(--text-caption)]">
                  <p className="flex justify-between"><span>Format</span><span className="font-semibold text-[var(--text-heading)]">{matchFormatMeta[format].label}</span></p>
                  <p className="mt-1 flex justify-between"><span>Players</span><span className="font-semibold text-[var(--text-heading)]">{selectedPlayers.length}</span></p>
                  <p className="mt-1 flex justify-between"><span>Courts</span><span className="font-semibold text-[var(--text-heading)]">{courts}</span></p>
                  <p className="mt-1 flex justify-between">
                    <span>Per round</span>
                    <span className="font-semibold text-[var(--text-heading)]">
                      {Math.min(courts, Math.floor(selectedPlayers.length / 4))} matches
                    </span>
                  </p>
                </div>

                <Button variant="primary" fullWidth sheen glow disabled={!canGenerate} onClick={handleGenerate}>
                  Generate Session
                </Button>
              </div>
            </Card>
          </div>
        </div>
      ) : (
        // ── LIVE ──
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="space-y-5 xl:col-span-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="flex items-center gap-2 text-base font-semibold text-[var(--text-heading)]">
                  {matchFormatMeta[format].label} Session
                  <Badge size="sm" color="success" variant="light" dot>Live</Badge>
                </h3>
                <p className="text-xs text-[var(--text-caption)]">
                  {players.length} players · {courts} courts · first to {pointsPerMatch}
                </p>
              </div>
              <div className="flex gap-2">
                {format === "mexicano" && (
                  <Button variant="soft" size="sm" onClick={handleNextMexicanoRound}>
                    Next Round →
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={resetSession}>New Session</Button>
              </div>
            </div>

            <Tabs
              variant="pill"
              size="sm"
              value={String(activeRound)}
              onChange={(v) => setActiveRound(Number(v))}
              items={rounds.map((r, i) => ({
                value: String(i),
                label: `Round ${r.round}`,
                badge: roundComplete(r) ? "✓" : undefined,
              }))}
            />

            {rounds[activeRound] && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {rounds[activeRound].matches.map((m, mi) => (
                  <MatchScoreCard
                    key={`${activeRound}-${mi}`}
                    match={m}
                    players={players}
                    matchIndex={mi}
                    pointsPerMatch={pointsPerMatch}
                    onScore={(idx, team, val) => handleScore(activeRound, idx, team, val)}
                  />
                ))}
                {rounds[activeRound].resting.length > 0 && (
                  <div className="sm:col-span-2 rounded-xl border border-dashed border-[var(--border-strong)] p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      Resting this round
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {rounds[activeRound].resting.map((pi) => (
                        <span key={pi} className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-muted)] py-1 pl-1 pr-3">
                          <EngageAvatar src={players[pi]?.avatar} name={players[pi]?.name ?? ""} size={22} />
                          <span className="text-xs text-[var(--text-body)]">{players[pi]?.name.split(" ")[0]}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Live standings */}
          <Card title="Live Standings" desc={`${totalMatchesPlayed} matches scored`} padding="none">
            <div className="divide-y divide-[var(--border-light)]">
              {standings.every((s) => s.played === 0) ? (
                <div className="p-4">
                  <EmptyState title="No scores yet" description="Enter match scores to see the live standings update." />
                </div>
              ) : (
                standings.map((s, i) => {
                  const p = players[s.index];
                  const medal = i === 0 ? "bg-amber-400 text-amber-950" : i === 1 ? "bg-slate-300 text-slate-700" : i === 2 ? "bg-orange-400 text-orange-950" : "bg-[var(--surface-muted)] text-[var(--text-caption)]";
                  return (
                    <div key={s.index} className="flex items-center gap-3 px-4 py-2.5">
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${medal}`}>
                        {i + 1}
                      </span>
                      <EngageAvatar src={p?.avatar} name={p?.name ?? ""} size={32} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[var(--text-heading)]">{p?.name}</p>
                        <p className="text-[11px] text-[var(--text-muted)]">{s.played} played · {s.wins} W</p>
                      </div>
                      <span className="text-sm font-bold text-[var(--color-primary)]">{s.points}</span>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      )}
    </PageScaffold>
  );
}
