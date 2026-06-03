// PadelHub — Open Play & Matches dummy data + REAL round/pairing generation.
// Americano & Mexicano formats. Deterministic, index-based (reproducible,
// no randomness) so the same player list always yields the same schedule.

export type MatchFormat = "americano" | "mexicano";

export interface OpenPlayPlayer {
  id: string;
  name: string;
  avatar: string;
  /** seed/level used for Mexicano ranking-based pairing (lower = stronger) */
  rating: number;
}

/** A single court match within a round: two pairs of player indices. */
export interface RoundMatch {
  court: number; // 1-based court number
  teamA: [number, number]; // player indices into the players array
  teamB: [number, number];
  /** points scored (entered live). null = not played yet */
  scoreA: number | null;
  scoreB: number | null;
}

export interface GeneratedRound {
  round: number;
  matches: RoundMatch[];
  /** player indices that sit out this round (when count not divisible by 4) */
  resting: number[];
}

/* ════════════════════════════════════════════════════════════════════
 * AMERICANO round generation
 *
 * Classic "individual" americano where everyone partners with everyone.
 * Uses the circle method (round-robin rotation) on player indices, then
 * pairs adjacent slots into teams and groups two teams per court.
 *
 * Deterministic: index 0 is fixed, the rest rotate. No randomness.
 * ════════════════════════════════════════════════════════════════════ */
export function generateAmericanoRounds(
  playerCount: number,
  courts: number,
  roundsRequested?: number,
): GeneratedRound[] {
  if (playerCount < 4) return [];

  // Work on an even list; add a "bye" sentinel (-1) when odd.
  const hasBye = playerCount % 2 === 1;
  const slots: number[] = Array.from({ length: playerCount }, (_, i) => i);
  if (hasBye) slots.push(-1);
  const n = slots.length; // even

  // Circle method: n-1 rounds gives a full single round-robin of partners.
  const totalRotations = n - 1;
  const rounds: GeneratedRound[] = [];

  // fixed[0], the rest rotate clockwise.
  let arr = [...slots];

  const maxRounds = roundsRequested ?? totalRotations;

  for (let r = 0; r < maxRounds; r++) {
    // Build partner pairs from opposite ends of the circle.
    const pairs: Array<[number, number]> = [];
    const resting: number[] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      if (a === -1) {
        resting.push(b);
        continue;
      }
      if (b === -1) {
        resting.push(a);
        continue;
      }
      pairs.push([a, b]);
    }

    // Group the partner-pairs into matches (2 pairs per court), spread over courts.
    const matches: RoundMatch[] = [];
    let courtCursor = 1;
    for (let p = 0; p + 1 < pairs.length; p += 2) {
      if (matches.length >= courts) {
        // No free court left — remaining players rest this round.
        resting.push(...pairs[p], ...pairs[p + 1]);
        continue;
      }
      matches.push({
        court: courtCursor,
        teamA: pairs[p],
        teamB: pairs[p + 1],
        scoreA: null,
        scoreB: null,
      });
      courtCursor += 1;
    }
    // Odd leftover pair with no opponent rests.
    if (pairs.length % 2 === 1) resting.push(...pairs[pairs.length - 1]);

    rounds.push({ round: r + 1, matches, resting: dedupe(resting) });

    // Rotate: keep arr[0] fixed, rotate the rest clockwise by one.
    arr = [arr[0], arr[n - 1], ...arr.slice(1, n - 1)];
  }

  return rounds;
}

/* ════════════════════════════════════════════════════════════════════
 * MEXICANO round generation
 *
 * Mexicano pairs by current standings: after each round players are
 * re-ranked by points, then #1 partners #4 vs #2 partners #3 within each
 * court group of four (snake by rank). Round 1 seeds by initial rating.
 *
 * This function generates ONE round given the current ranking order
 * (array of player indices, best first). Deterministic.
 * ════════════════════════════════════════════════════════════════════ */
export function generateMexicanoRound(
  rankedPlayerIndices: number[],
  courts: number,
  roundNumber: number,
): GeneratedRound {
  const matches: RoundMatch[] = [];
  const resting: number[] = [];
  const groups: number[][] = [];

  // Chunk ranked players into groups of 4 (top players together).
  for (let i = 0; i < rankedPlayerIndices.length; i += 4) {
    groups.push(rankedPlayerIndices.slice(i, i + 4));
  }

  let court = 1;
  for (const g of groups) {
    if (g.length < 4 || court > courts) {
      resting.push(...g);
      continue;
    }
    // Snake pairing: rank1 + rank4  vs  rank2 + rank3
    matches.push({
      court,
      teamA: [g[0], g[3]],
      teamB: [g[1], g[2]],
      scoreA: null,
      scoreB: null,
    });
    court += 1;
  }

  return { round: roundNumber, matches, resting: dedupe(resting) };
}

function dedupe(arr: number[]): number[] {
  return Array.from(new Set(arr));
}

/* ════════════════════════════════════════════════════════════════════
 * Standings computed from played rounds.
 * In americano/mexicano points are individual: each player accumulates the
 * points their team scored across all matches they played.
 * ════════════════════════════════════════════════════════════════════ */
export interface PlayerStanding {
  index: number;
  points: number;
  played: number;
  wins: number;
  pointsAgainst: number;
}

export function computeStandings(
  playerCount: number,
  rounds: GeneratedRound[],
): PlayerStanding[] {
  const standings: PlayerStanding[] = Array.from(
    { length: playerCount },
    (_, i) => ({ index: i, points: 0, played: 0, wins: 0, pointsAgainst: 0 }),
  );

  for (const round of rounds) {
    for (const m of round.matches) {
      if (m.scoreA == null || m.scoreB == null) continue;
      const aWin = m.scoreA > m.scoreB;
      const bWin = m.scoreB > m.scoreA;
      for (const pi of m.teamA) {
        standings[pi].points += m.scoreA;
        standings[pi].pointsAgainst += m.scoreB;
        standings[pi].played += 1;
        if (aWin) standings[pi].wins += 1;
      }
      for (const pi of m.teamB) {
        standings[pi].points += m.scoreB;
        standings[pi].pointsAgainst += m.scoreA;
        standings[pi].played += 1;
        if (bWin) standings[pi].wins += 1;
      }
    }
  }

  return standings.sort(
    (a, b) =>
      b.points - a.points ||
      b.wins - a.wins ||
      b.points - b.pointsAgainst - (a.points - a.pointsAgainst),
  );
}

/* ════════════════════════════════════════════════════════════════════
 * Dummy player pool (used to pre-fill the session builder).
 * ════════════════════════════════════════════════════════════════════ */
export const openPlayPool: OpenPlayPlayer[] = [
  { id: "p1", name: "Andi Wijaya", avatar: "/images/user/user-04.jpg", rating: 1 },
  { id: "p2", name: "Rina Kusuma", avatar: "/images/user/user-09.jpg", rating: 2 },
  { id: "p3", name: "Bagus Saputra", avatar: "/images/user/user-11.jpg", rating: 3 },
  { id: "p4", name: "Putri Maharani", avatar: "/images/user/user-10.jpg", rating: 4 },
  { id: "p5", name: "Yusuf Hakim", avatar: "/images/user/user-13.jpg", rating: 5 },
  { id: "p6", name: "Citra Lestari", avatar: "/images/user/user-12.jpg", rating: 6 },
  { id: "p7", name: "Galang Pratomo", avatar: "/images/user/user-08.jpg", rating: 7 },
  { id: "p8", name: "Dewi Anjani", avatar: "/images/user/user-07.jpg", rating: 8 },
  { id: "p9", name: "Fikri Ramadhan", avatar: "/images/user/user-06.jpg", rating: 9 },
  { id: "p10", name: "Maya Sari", avatar: "/images/user/user-05.jpg", rating: 10 },
  { id: "p11", name: "Bayu Aditya", avatar: "/images/user/user-02.jpg", rating: 11 },
  { id: "p12", name: "Nadia Okta", avatar: "/images/user/user-01.jpg", rating: 12 },
];

export const matchFormatMeta: Record<
  MatchFormat,
  { label: string; blurb: string; tone: "primary" | "secondary" }
> = {
  americano: {
    label: "Americano",
    blurb: "Everyone partners with everyone. Rotating pairs, individual points.",
    tone: "primary",
  },
  mexicano: {
    label: "Mexicano",
    blurb: "Pairs decided by live standings each round. #1 with #4 vs #2 with #3.",
    tone: "secondary",
  },
};

/* ════════════════════════════════════════════════════════════════════
 * Season leaderboard (separate from a single open-play session) — for the
 * /matches/leaderboard ranking table.
 * ════════════════════════════════════════════════════════════════════ */
export type LeaderTier = "Elite" | "Pro" | "Casual";

export interface LeaderboardRow {
  rank: number;
  prevRank: number;
  playerId: string;
  name: string;
  avatar: string;
  tier: LeaderTier;
  points: number;
  played: number;
  wins: number;
  losses: number;
  winStreak: number;
}

export const seasonLeaderboard: LeaderboardRow[] = [
  { rank: 1, prevRank: 2, playerId: "p5", name: "Yusuf Hakim", avatar: "/images/user/user-13.jpg", tier: "Elite", points: 1840, played: 64, wins: 49, losses: 15, winStreak: 7 },
  { rank: 2, prevRank: 1, playerId: "p1", name: "Andi Wijaya", avatar: "/images/user/user-04.jpg", tier: "Elite", points: 1795, played: 61, wins: 46, losses: 15, winStreak: 3 },
  { rank: 3, prevRank: 3, playerId: "p9", name: "Fikri Ramadhan", avatar: "/images/user/user-06.jpg", tier: "Pro", points: 1702, played: 58, wins: 42, losses: 16, winStreak: 5 },
  { rank: 4, prevRank: 6, playerId: "p2", name: "Rina Kusuma", avatar: "/images/user/user-09.jpg", tier: "Pro", points: 1654, played: 55, wins: 39, losses: 16, winStreak: 4 },
  { rank: 5, prevRank: 4, playerId: "p3", name: "Bagus Saputra", avatar: "/images/user/user-11.jpg", tier: "Pro", points: 1610, played: 60, wins: 38, losses: 22, winStreak: 0 },
  { rank: 6, prevRank: 5, playerId: "p7", name: "Galang Pratomo", avatar: "/images/user/user-08.jpg", tier: "Pro", points: 1588, played: 57, wins: 36, losses: 21, winStreak: 2 },
  { rank: 7, prevRank: 9, playerId: "p4", name: "Putri Maharani", avatar: "/images/user/user-10.jpg", tier: "Casual", points: 1452, played: 50, wins: 31, losses: 19, winStreak: 6 },
  { rank: 8, prevRank: 7, playerId: "p10", name: "Maya Sari", avatar: "/images/user/user-05.jpg", tier: "Casual", points: 1421, played: 52, wins: 30, losses: 22, winStreak: 0 },
  { rank: 9, prevRank: 8, playerId: "p6", name: "Citra Lestari", avatar: "/images/user/user-12.jpg", tier: "Casual", points: 1398, played: 48, wins: 28, losses: 20, winStreak: 1 },
  { rank: 10, prevRank: 12, playerId: "p11", name: "Bayu Aditya", avatar: "/images/user/user-02.jpg", tier: "Casual", points: 1320, played: 45, wins: 26, losses: 19, winStreak: 3 },
  { rank: 11, prevRank: 10, playerId: "p8", name: "Dewi Anjani", avatar: "/images/user/user-07.jpg", tier: "Casual", points: 1276, played: 44, wins: 24, losses: 20, winStreak: 0 },
  { rank: 12, prevRank: 11, playerId: "p12", name: "Nadia Okta", avatar: "/images/user/user-01.jpg", tier: "Casual", points: 1190, played: 41, wins: 21, losses: 20, winStreak: 2 },
];

export const leaderTierMeta: Record<LeaderTier, { tone: "primary" | "secondary" | "neutral" }> = {
  Elite: { tone: "primary" },
  Pro: { tone: "secondary" },
  Casual: { tone: "neutral" },
};

/** Recent finished open-play sessions (history list). */
export interface PastSession {
  id: string;
  title: string;
  format: MatchFormat;
  date: string;
  players: number;
  rounds: number;
  winner: string;
  pointsPlayed: number;
}

export const pastSessions: PastSession[] = [
  { id: "s-101", title: "Friday Night Americano", format: "americano", date: "2026-05-30", players: 8, rounds: 7, winner: "Yusuf Hakim", pointsPlayed: 224 },
  { id: "s-102", title: "Sunday Mexicano Cup", format: "mexicano", date: "2026-05-25", players: 12, rounds: 6, winner: "Andi Wijaya", pointsPlayed: 288 },
  { id: "s-103", title: "Midweek Mixer", format: "americano", date: "2026-05-21", players: 8, rounds: 7, winner: "Rina Kusuma", pointsPlayed: 224 },
];
