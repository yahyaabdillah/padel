"use client";

import React, { useState } from "react";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import Tabs from "@/components/ui/tabs/Tabs";
import { Progress } from "@/components/ui/progress/Progress";
import { useToast } from "@/components/ui/toast/ToastContext";
import {
  openPlaySessions as seedSessions,
  memberMatchResults,
  sessionFormatMeta,
  type OpenPlaySession,
  type MatchOutcome,
  idr,
  prettyDate,
} from "@/data/padel/member";
import { TrophyIcon } from "@/components/member/icons";

const outcomeMeta: Record<MatchOutcome, { label: string; color: "success" | "error" | "warning" }> = {
  win: { label: "Win", color: "success" },
  loss: { label: "Loss", color: "error" },
  draw: { label: "Draw", color: "warning" },
};

export default function MyMatchesPage() {
  const toast = useToast();
  const [sessions, setSessions] = useState<OpenPlaySession[]>(seedSessions);
  const [tab, setTab] = useState("open");

  const toggleJoin = (s: OpenPlaySession) => {
    setSessions((prev) =>
      prev.map((x) =>
        x.id === s.id
          ? {
              ...x,
              joinedByMe: !x.joinedByMe,
              joined: x.joinedByMe ? x.joined - 1 : x.joined + 1,
            }
          : x,
      ),
    );
    if (s.joinedByMe) toast.info(`Left "${s.title}"`, "Open play");
    else toast.success(`Joined "${s.title}" · spot reserved`, "See you on court!");
  };

  const wins = memberMatchResults.filter((m) => m.outcome === "win").length;
  const totalPts = memberMatchResults.reduce((a, m) => a + m.pointsEarned, 0);

  return (
    <div>
      <PageBreadCrumb pageTitle="Open Play & Matches" />

      <div className="mb-5">
        <Tabs
          variant="pill"
          items={[
            { value: "open", label: "Open play", badge: sessions.length },
            { value: "results", label: "My results", badge: memberMatchResults.length },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {tab === "open" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sessions.map((s) => {
            const meta = sessionFormatMeta[s.format];
            const full = s.joined >= s.capacity && !s.joinedByMe;
            const pct = Math.round((s.joined / s.capacity) * 100);
            return (
              <div
                key={s.id}
                className="flex flex-col rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-5 transition-all duration-300 hover:shadow-theme-md"
              >
                <div className="flex items-center justify-between">
                  <Badge variant="light" color={meta.tone} size="sm">
                    {s.format}
                  </Badge>
                  <span className="text-xs font-medium text-[var(--text-muted)]">{s.level}</span>
                </div>
                <h4 className="mt-2 font-semibold text-[var(--text-heading)]">{s.title}</h4>
                <p className="text-xs text-[var(--text-muted)]">{meta.blurb}</p>

                <div className="mt-3 space-y-1.5 text-sm text-[var(--text-caption)]">
                  <p>📅 {prettyDate(s.date)} · {s.startTime} ({s.durationHours}h)</p>
                  <p>📍 {s.courtName}</p>
                  {s.hostCoach && <p>🎽 Hosted by {s.hostCoach}</p>}
                </div>

                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-[var(--text-muted)]">
                      {s.joined}/{s.capacity} players
                    </span>
                    {full && <span className="font-medium text-red-500">Full</span>}
                  </div>
                  <Progress value={pct} color={pct >= 100 ? "warning" : "primary"} size="sm" />
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-[var(--border-light)] pt-4">
                  <span className="font-semibold text-[var(--color-primary)]">{idr(s.pricePerPlayer)}</span>
                  <Button
                    size="sm"
                    variant={s.joinedByMe ? "outline" : "primary"}
                    disabled={full}
                    onClick={() => toggleJoin(s)}
                  >
                    {s.joinedByMe ? "Joined ✓" : full ? "Full" : "Join"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Mini label="Played" value={memberMatchResults.length} />
            <Mini label="Won" value={wins} accent />
            <Mini label="Win rate" value={`${Math.round((wins / memberMatchResults.length) * 100)}%`} />
            <Mini label="Points earned" value={totalPts.toLocaleString()} />
          </div>

          <div className="overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)]">
            <ul className="divide-y divide-[var(--border-light)]">
              {memberMatchResults.map((m) => {
                const om = outcomeMeta[m.outcome];
                return (
                  <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                          m.outcome === "win"
                            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
                            : m.outcome === "loss"
                              ? "bg-red-50 text-red-500 dark:bg-red-500/15"
                              : "bg-amber-50 text-amber-600 dark:bg-amber-500/15"
                        }`}
                      >
                        <TrophyIcon className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="font-medium text-[var(--text-heading)]">{m.sessionTitle}</p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {prettyDate(m.date)} · {m.format} · vs {m.opponents}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-lg font-bold text-[var(--text-heading)]">
                        {m.scoreFor}–{m.scoreAgainst}
                      </span>
                      <div className="text-right">
                        <Badge variant="light" color={om.color} size="sm">
                          {om.label}
                        </Badge>
                        <p className="mt-0.5 text-xs text-[var(--color-primary)]">+{m.pointsEarned} pts</p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function Mini({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-4 text-center">
      <p className={`text-2xl font-bold ${accent ? "text-[var(--color-primary)]" : "text-[var(--text-heading)]"}`}>
        {value}
      </p>
      <p className="mt-0.5 text-xs text-[var(--text-caption)]">{label}</p>
    </div>
  );
}
