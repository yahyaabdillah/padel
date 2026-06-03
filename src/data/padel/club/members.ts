// PadelHub — club member (player CRM) mock data (dummy, no DB)

export type MemberTier = "daily" | "casual" | "pro" | "elite";
export type MemberStatus = "active" | "inactive" | "frozen";

export interface MemberActivity {
  id: string;
  date: string; // ISO datetime
  type: "booking" | "topup" | "match" | "class" | "purchase";
  label: string;
  amount?: number; // IDR (positive = spend/charge, negative = refund/topup credit)
}

export interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  tier: MemberTier;
  status: MemberStatus;
  /** wallet balance in IDR */
  walletBalance: number;
  /** padel skill rating (open-play / americano ranking points) */
  rating: number;
  /** preferred playing position */
  position: "left" | "right" | "both";
  joinedAt: string; // ISO date
  lastVisit: string; // ISO date
  totalBookings: number;
  totalSpend: number; // lifetime IDR
  matchesPlayed: number;
  wins: number;
  city: string;
  history: MemberActivity[];

  /* ── Optional onboarding profile (filled via the first-login onboarding
   * stepper, not at front-desk registration). Existing seed members are
   * fully onboarded; freshly-registered / daily walk-ins are not. ── */
  onboarded?: boolean;
  gender?: "L" | "P";
  birthDate?: string; // ISO date
  dominantHand?: "left" | "right";
  skillLevel?: "beginner" | "intermediate" | "advanced";
  playFrequency?: "1-2" | "3-4" | "5+";
  emergencyName?: string;
  emergencyPhone?: string;
  /** flagged "interested in coaching/PT?" at registration */
  coachingInterest?: boolean;
  /** registered as a one-time daily walk-in */
  isDaily?: boolean;
}

export const memberTierMeta: Record<
  MemberTier,
  { label: string; tone: "neutral" | "info" | "success" | "warning"; perk: string; color: string }
> = {
  daily: {
    label: "Harian",
    tone: "warning",
    perk: "Akses sekali main",
    color: "#F59E0B",
  },
  casual: {
    label: "Casual",
    tone: "neutral",
    perk: "Pay-as-you-play",
    color: "#94A3B8",
  },
  pro: {
    label: "Pro",
    tone: "info",
    perk: "10% off + priority slots",
    color: "#6D5BFF",
  },
  elite: {
    label: "Elite",
    tone: "success",
    perk: "20% off + free coaching",
    color: "#14B8A6",
  },
};

export const memberStatusMeta: Record<
  MemberStatus,
  { label: string; tone: "success" | "neutral" | "warning" }
> = {
  active: { label: "Active", tone: "success" },
  inactive: { label: "Inactive", tone: "neutral" },
  frozen: { label: "Frozen", tone: "warning" },
};

const hist = (
  id: string,
  type: MemberActivity["type"],
  label: string,
  date: string,
  amount?: number,
): MemberActivity => ({ id, date, type, label, amount });

const baseMembers: Member[] = [
  {
    id: "mbr-001",
    name: "Andi Wijaya",
    email: "andi@email.com",
    phone: "+62 813 1000 2001",
    avatar: "/images/user/user-01.jpg",
    tier: "elite",
    status: "active",
    walletBalance: 1_250_000,
    rating: 1820,
    position: "right",
    joinedAt: "2024-03-12",
    lastVisit: "2026-06-01",
    totalBookings: 142,
    totalSpend: 28_400_000,
    matchesPlayed: 96,
    wins: 61,
    city: "Jakarta Selatan",
    history: [
      hist("a1", "match", "Americano — Friday Night", "2026-06-01T19:00:00", 75_000),
      hist("a2", "booking", "Center Court · 90 min", "2026-05-30T18:00:00", 420_000),
      hist("a3", "topup", "Wallet top-up", "2026-05-28T10:00:00", -1_000_000),
      hist("a4", "purchase", "Bullpadel grip x2", "2026-05-25T11:30:00", 120_000),
      hist("a5", "class", "Advanced clinic w/ Coach Dimas", "2026-05-22T17:00:00", 250_000),
    ],
  },
  {
    id: "mbr-002",
    name: "Sarah Kusuma",
    email: "sarah.k@email.com",
    phone: "+62 812 2000 3002",
    avatar: "/images/user/user-02.jpg",
    tier: "pro",
    status: "active",
    walletBalance: 480_000,
    rating: 1560,
    position: "left",
    joinedAt: "2024-08-05",
    lastVisit: "2026-05-31",
    totalBookings: 88,
    totalSpend: 14_900_000,
    matchesPlayed: 54,
    wins: 30,
    city: "Jakarta Selatan",
    history: [
      hist("b1", "booking", "Glass Arena · 60 min", "2026-05-31T08:00:00", 170_000),
      hist("b2", "match", "Mexicano — Sunday Social", "2026-05-26T16:00:00", 65_000),
      hist("b3", "topup", "Wallet top-up", "2026-05-20T09:00:00", -500_000),
    ],
  },
  {
    id: "mbr-003",
    name: "Reza Mahendra",
    email: "reza.m@email.com",
    phone: "+62 815 3000 4003",
    avatar: "/images/user/user-03.jpg",
    tier: "pro",
    status: "active",
    walletBalance: 95_000,
    rating: 1605,
    position: "both",
    joinedAt: "2025-01-18",
    lastVisit: "2026-05-29",
    totalBookings: 67,
    totalSpend: 11_200_000,
    matchesPlayed: 48,
    wins: 27,
    city: "Tangerang",
    history: [
      hist("c1", "booking", "Lime Court · 90 min", "2026-05-29T20:00:00", 345_000),
      hist("c2", "purchase", "Head Padel balls (tube)", "2026-05-29T20:05:00", 95_000),
    ],
  },
  {
    id: "mbr-004",
    name: "Putri Anggraini",
    email: "putri.a@email.com",
    phone: "+62 811 4000 5004",
    avatar: "/images/user/user-04.jpg",
    tier: "casual",
    status: "active",
    walletBalance: 0,
    rating: 1280,
    position: "right",
    joinedAt: "2025-11-02",
    lastVisit: "2026-05-27",
    totalBookings: 14,
    totalSpend: 2_100_000,
    matchesPlayed: 9,
    wins: 4,
    city: "Jakarta Pusat",
    history: [
      hist("d1", "booking", "Rooftop A · 60 min", "2026-05-27T09:00:00", 140_000),
    ],
  },
  {
    id: "mbr-005",
    name: "Bagus Setiawan",
    email: "bagus.s@email.com",
    phone: "+62 813 5000 6005",
    avatar: "/images/user/user-05.jpg",
    tier: "elite",
    status: "active",
    walletBalance: 2_340_000,
    rating: 1910,
    position: "left",
    joinedAt: "2023-12-01",
    lastVisit: "2026-06-02",
    totalBookings: 210,
    totalSpend: 41_800_000,
    matchesPlayed: 138,
    wins: 92,
    city: "Jakarta Selatan",
    history: [
      hist("e1", "match", "Americano — Pro League", "2026-06-02T19:00:00", 90_000),
      hist("e2", "booking", "Center Court · 120 min", "2026-06-01T17:00:00", 560_000),
      hist("e3", "topup", "Wallet top-up", "2026-05-30T08:30:00", -2_000_000),
    ],
  },
  {
    id: "mbr-006",
    name: "Citra Larasati",
    email: "citra.l@email.com",
    phone: "+62 812 6000 7006",
    avatar: "/images/user/user-06.jpg",
    tier: "pro",
    status: "frozen",
    walletBalance: 320_000,
    rating: 1490,
    position: "both",
    joinedAt: "2024-06-14",
    lastVisit: "2026-04-10",
    totalBookings: 52,
    totalSpend: 9_300_000,
    matchesPlayed: 33,
    wins: 18,
    city: "Bekasi",
    history: [
      hist("f1", "booking", "Glass Arena · 60 min", "2026-04-10T18:00:00", 260_000),
    ],
  },
  {
    id: "mbr-007",
    name: "Dani Rahmawan",
    email: "dani.r@email.com",
    phone: "+62 815 7000 8007",
    avatar: "/images/user/user-07.jpg",
    tier: "casual",
    status: "inactive",
    walletBalance: 0,
    rating: 1150,
    position: "right",
    joinedAt: "2025-09-22",
    lastVisit: "2026-02-15",
    totalBookings: 6,
    totalSpend: 840_000,
    matchesPlayed: 3,
    wins: 1,
    city: "Depok",
    history: [
      hist("g1", "booking", "Single Box · 60 min", "2026-02-15T10:00:00", 110_000),
    ],
  },
  {
    id: "mbr-008",
    name: "Maya Pertiwi",
    email: "maya.p@email.com",
    phone: "+62 811 8000 9008",
    avatar: "/images/user/user-08.jpg",
    tier: "pro",
    status: "active",
    walletBalance: 610_000,
    rating: 1640,
    position: "left",
    joinedAt: "2024-10-30",
    lastVisit: "2026-05-30",
    totalBookings: 73,
    totalSpend: 12_700_000,
    matchesPlayed: 51,
    wins: 29,
    city: "Jakarta Barat",
    history: [
      hist("h1", "match", "Mexicano — Ladies Night", "2026-05-30T19:00:00", 70_000),
      hist("h2", "topup", "Wallet top-up", "2026-05-21T09:00:00", -500_000),
    ],
  },
  {
    id: "mbr-009",
    name: "Fikri Ramadhan",
    email: "fikri.r@email.com",
    phone: "+62 813 9000 1009",
    avatar: "/images/user/user-09.jpg",
    tier: "elite",
    status: "active",
    walletBalance: 880_000,
    rating: 1755,
    position: "both",
    joinedAt: "2024-02-09",
    lastVisit: "2026-06-01",
    totalBookings: 121,
    totalSpend: 23_100_000,
    matchesPlayed: 84,
    wins: 50,
    city: "Jakarta Selatan",
    history: [
      hist("i1", "booking", "Center Court · 90 min", "2026-06-01T20:00:00", 420_000),
    ],
  },
  {
    id: "mbr-010",
    name: "Nadia Salsabila",
    email: "nadia.s@email.com",
    phone: "+62 812 1000 1110",
    avatar: "/images/user/user-10.jpg",
    tier: "casual",
    status: "active",
    walletBalance: 150_000,
    rating: 1330,
    position: "right",
    joinedAt: "2025-07-19",
    lastVisit: "2026-05-28",
    totalBookings: 21,
    totalSpend: 3_400_000,
    matchesPlayed: 12,
    wins: 6,
    city: "Tangerang Selatan",
    history: [
      hist("j1", "booking", "Lime Court · 60 min", "2026-05-28T08:00:00", 150_000),
    ],
  },
  {
    id: "mbr-011",
    name: "Yoga Pratama",
    email: "yoga.p@email.com",
    phone: "+62 815 2000 1211",
    avatar: "/images/user/user-11.jpg",
    tier: "pro",
    status: "active",
    walletBalance: 405_000,
    rating: 1520,
    position: "left",
    joinedAt: "2025-03-25",
    lastVisit: "2026-05-31",
    totalBookings: 44,
    totalSpend: 7_600_000,
    matchesPlayed: 28,
    wins: 15,
    city: "Jakarta Timur",
    history: [
      hist("k1", "booking", "Glass Arena · 90 min", "2026-05-31T17:00:00", 390_000),
    ],
  },
  {
    id: "mbr-012",
    name: "Lina Hartati",
    email: "lina.h@email.com",
    phone: "+62 811 3000 1312",
    avatar: "/images/user/user-12.jpg",
    tier: "casual",
    status: "active",
    walletBalance: 50_000,
    rating: 1210,
    position: "both",
    joinedAt: "2026-01-08",
    lastVisit: "2026-05-26",
    totalBookings: 9,
    totalSpend: 1_300_000,
    matchesPlayed: 5,
    wins: 2,
    city: "Jakarta Selatan",
    history: [
      hist("l1", "booking", "Rooftop A · 60 min", "2026-05-26T16:00:00", 140_000),
    ],
  },
];

// One-time / daily walk-in members. Not yet onboarded (no optional profile).
const dailyMembers: Member[] = [
  {
    id: "mbr-d01",
    name: "Tegar Saputra",
    email: "",
    phone: "+62 813 7000 1101",
    avatar: "/images/user/user-13.jpg",
    tier: "daily",
    status: "active",
    walletBalance: 0,
    rating: 1000,
    position: "both",
    joinedAt: "2026-06-02",
    lastVisit: "2026-06-02",
    totalBookings: 1,
    totalSpend: 120_000,
    matchesPlayed: 0,
    wins: 0,
    city: "Jakarta Selatan",
    history: [
      hist("dh1", "booking", "Walk-in · Rooftop A · 60 min", "2026-06-02T11:00:00", 120_000),
    ],
    onboarded: false,
    isDaily: true,
  },
  {
    id: "mbr-d02",
    name: "Hendra Gunawan",
    email: "",
    phone: "+62 812 7000 1102",
    avatar: "/images/user/user-14.jpg",
    tier: "daily",
    status: "active",
    walletBalance: 0,
    rating: 1000,
    position: "right",
    joinedAt: "2026-06-02",
    lastVisit: "2026-06-02",
    totalBookings: 1,
    totalSpend: 95_000,
    matchesPlayed: 0,
    wins: 0,
    city: "Tangerang",
    history: [
      hist("dh2", "booking", "Walk-in · Single Box · 60 min", "2026-06-02T12:00:00", 95_000),
    ],
    onboarded: false,
    isDaily: true,
  },
];

// Existing roster is fully onboarded; daily walk-ins are appended as-is.
export const mockMembers: Member[] = [
  ...baseMembers.map((m) => ({ onboarded: true, ...m })),
  ...dailyMembers,
];

export const memberById = (id: string): Member | undefined =>
  mockMembers.find((m) => m.id === id);

/** Lightweight options for member <Select> inputs (check-in, PT booking, …). */
export const memberOptions: { value: string; label: string; desc: string }[] =
  mockMembers.map((m) => ({ value: m.id, label: m.name, desc: m.phone }));

export const memberActivityTypeMeta: Record<
  MemberActivity["type"],
  { label: string; tone: "info" | "success" | "warning" | "neutral" | "primary" }
> = {
  booking: { label: "Booking", tone: "primary" },
  topup: { label: "Top-up", tone: "success" },
  match: { label: "Match", tone: "info" },
  class: { label: "Class", tone: "warning" },
  purchase: { label: "Purchase", tone: "neutral" },
};
