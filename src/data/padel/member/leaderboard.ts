// PadelHub — club leaderboard / player rankings (dummy, no DB).

export interface LeaderboardPlayer {
  rank: number;
  prevRank: number;
  id: string;
  name: string;
  avatar: string;
  tier: "Casual" | "Pro" | "Elite";
  points: number;
  played: number;
  won: number;
  winRate: number; // 0-100
  streak: number; // positive = win streak, negative = loss streak
  isMe?: boolean;
}

export const leaderboardSeason = "Season 12 · Jun 2026";

export const leaderboard: LeaderboardPlayer[] = [
  { rank: 1, prevRank: 1, id: "p-01", name: "Yoga Aditya", avatar: "/images/user/user-05.jpg", tier: "Elite", points: 3120, played: 64, won: 51, winRate: 80, streak: 5 },
  { rank: 2, prevRank: 4, id: "p-02", name: "Bagus Permana", avatar: "/images/user/user-06.jpg", tier: "Elite", points: 2980, played: 71, won: 53, winRate: 75, streak: 3 },
  { rank: 3, prevRank: 2, id: "p-03", name: "Tika Wardhani", avatar: "/images/user/user-07.jpg", tier: "Pro", points: 2740, played: 58, won: 40, winRate: 69, streak: -1 },
  { rank: 4, prevRank: 5, id: "p-04", name: "Rian Saputra", avatar: "/images/user/user-08.jpg", tier: "Pro", points: 2510, played: 60, won: 39, winRate: 65, streak: 2 },
  { rank: 5, prevRank: 3, id: "p-05", name: "Maya Santoso", avatar: "/images/user/user-09.jpg", tier: "Elite", points: 2480, played: 55, won: 35, winRate: 64, streak: -2 },
  { rank: 6, prevRank: 8, id: "member-001", name: "Andi Wijaya", avatar: "/images/user/user-04.jpg", tier: "Pro", points: 2310, played: 49, won: 30, winRate: 61, streak: 4, isMe: true },
  { rank: 7, prevRank: 6, id: "p-07", name: "Sinta Dewanti", avatar: "/images/user/user-10.jpg", tier: "Pro", points: 2180, played: 52, won: 31, winRate: 60, streak: 1 },
  { rank: 8, prevRank: 7, id: "p-08", name: "Fajar Nugroho", avatar: "/images/user/user-11.jpg", tier: "Casual", points: 1990, played: 44, won: 24, winRate: 55, streak: -1 },
  { rank: 9, prevRank: 9, id: "p-09", name: "Dewi Lestari", avatar: "/images/user/user-12.jpg", tier: "Pro", points: 1870, played: 40, won: 21, winRate: 53, streak: 2 },
  { rank: 10, prevRank: 12, id: "p-10", name: "Eko Prasetyo", avatar: "/images/user/user-13.jpg", tier: "Casual", points: 1740, played: 38, won: 19, winRate: 50, streak: 1 },
  { rank: 11, prevRank: 10, id: "p-11", name: "Putri Anggraini", avatar: "/images/user/user-14.jpg", tier: "Casual", points: 1620, played: 35, won: 16, winRate: 46, streak: -3 },
  { rank: 12, prevRank: 11, id: "p-12", name: "Hendra Wijaya", avatar: "/images/user/user-15.jpg", tier: "Casual", points: 1510, played: 33, won: 14, winRate: 42, streak: -1 },
];

export const myRankProgress = {
  pointsThisSeason: 2310,
  rankChange: 2, // moved up 2
  bestRank: 5,
  nextRankPlayer: "Maya Santoso",
  pointsToNextRank: 170,
};
