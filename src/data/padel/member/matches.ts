// PadelHub — open-play sessions + the member's match results (dummy, no DB).

export type SessionFormat = "Americano" | "Mexicano" | "Team Round-Robin";
export type SessionLevel = "Beginner" | "Intermediate" | "Advanced" | "Mixed";

export interface OpenPlaySession {
  id: string;
  title: string;
  format: SessionFormat;
  level: SessionLevel;
  date: string; // ISO
  startTime: string;
  durationHours: number;
  courtName: string;
  pricePerPlayer: number; // IDR
  capacity: number;
  joined: number;
  hostCoach?: string;
  joinedByMe?: boolean;
}

const today = new Date("2026-06-02");
const iso = (off: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + off);
  return d.toISOString().slice(0, 10);
};

export const openPlaySessions: OpenPlaySession[] = [
  {
    id: "op-501",
    title: "Wednesday Mexicano",
    format: "Mexicano",
    level: "Intermediate",
    date: iso(4),
    startTime: "17:00",
    durationHours: 1.5,
    courtName: "Sky Court",
    pricePerPlayer: 120_000,
    capacity: 8,
    joined: 6,
    joinedByMe: true,
  },
  {
    id: "op-502",
    title: "Friday Night Americano",
    format: "Americano",
    level: "Advanced",
    date: iso(6),
    startTime: "19:30",
    durationHours: 2,
    courtName: "Center Court",
    pricePerPlayer: 150_000,
    capacity: 12,
    joined: 9,
    hostCoach: "Coach Dimas",
  },
  {
    id: "op-503",
    title: "Sunday Social Mixed",
    format: "Americano",
    level: "Mixed",
    date: iso(8),
    startTime: "08:00",
    durationHours: 2,
    courtName: "Court 2 — Rally",
    pricePerPlayer: 110_000,
    capacity: 16,
    joined: 11,
  },
  {
    id: "op-504",
    title: "Ladies Mexicano",
    format: "Mexicano",
    level: "Beginner",
    date: iso(9),
    startTime: "10:00",
    durationHours: 1.5,
    courtName: "Court 3 — Volley",
    pricePerPlayer: 100_000,
    capacity: 8,
    joined: 4,
    hostCoach: "Coach Sari",
  },
  {
    id: "op-505",
    title: "Monday Clash Round-Robin",
    format: "Team Round-Robin",
    level: "Advanced",
    date: iso(12),
    startTime: "20:00",
    durationHours: 2,
    courtName: "Court 6 — Smash",
    pricePerPlayer: 140_000,
    capacity: 12,
    joined: 12,
  },
];

export type MatchOutcome = "win" | "loss" | "draw";

export interface MatchResult {
  id: string;
  sessionTitle: string;
  format: SessionFormat;
  date: string;
  partner: string;
  opponents: string;
  scoreFor: number;
  scoreAgainst: number;
  outcome: MatchOutcome;
  pointsEarned: number;
}

export const memberMatchResults: MatchResult[] = [
  {
    id: "mr-9001",
    sessionTitle: "Friday Night Americano",
    format: "Americano",
    date: iso(-1),
    partner: "Rotating",
    opponents: "Field of 12",
    scoreFor: 31,
    scoreAgainst: 24,
    outcome: "win",
    pointsEarned: 45,
  },
  {
    id: "mr-8987",
    sessionTitle: "Sunday Social Mixed",
    format: "Americano",
    date: iso(-4),
    partner: "Rotating",
    opponents: "Field of 14",
    scoreFor: 28,
    scoreAgainst: 28,
    outcome: "draw",
    pointsEarned: 30,
  },
  {
    id: "mr-8965",
    sessionTitle: "Wednesday Mexicano",
    format: "Mexicano",
    date: iso(-8),
    partner: "Bagus P.",
    opponents: "Yoga A. / Tika W.",
    scoreFor: 21,
    scoreAgainst: 19,
    outcome: "win",
    pointsEarned: 40,
  },
  {
    id: "mr-8940",
    sessionTitle: "Monday Clash Round-Robin",
    format: "Team Round-Robin",
    date: iso(-11),
    partner: "Rian S.",
    opponents: "Team Falcon",
    scoreFor: 14,
    scoreAgainst: 18,
    outcome: "loss",
    pointsEarned: 15,
  },
  {
    id: "mr-8910",
    sessionTitle: "Friday Night Americano",
    format: "Americano",
    date: iso(-15),
    partner: "Rotating",
    opponents: "Field of 10",
    scoreFor: 33,
    scoreAgainst: 22,
    outcome: "win",
    pointsEarned: 48,
  },
];

export const sessionFormatMeta: Record<SessionFormat, { blurb: string; tone: "primary" | "secondary" | "info" }> = {
  Americano: { blurb: "Solo · rotating partners, individual ranking", tone: "primary" },
  Mexicano: { blurb: "Solo · matched by score each round", tone: "secondary" },
  "Team Round-Robin": { blurb: "Fixed pairs · every team plays every team", tone: "info" },
};
