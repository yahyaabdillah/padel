// PadelHub — membership tiers, wallet, benefits, points (dummy, no DB).

export type MemberTier = "Casual" | "Pro" | "Elite";

export interface TierDefinition {
  id: MemberTier;
  name: string;
  priceMonthly: number; // IDR; 0 = free
  blurb: string;
  color: string; // accent for the card
  perks: string[];
  /** discount on court bookings */
  courtDiscountPct: number;
  /** free open-play credits per month */
  openPlayCredits: number;
  highlighted?: boolean;
}

export const tierDefinitions: TierDefinition[] = [
  {
    id: "Casual",
    name: "Casual",
    priceMonthly: 0,
    blurb: "Pay as you play. No commitment.",
    color: "#94a3b8",
    courtDiscountPct: 0,
    openPlayCredits: 0,
    perks: [
      "Standard court rates",
      "Join any open play",
      "Wallet top-up",
      "Match history & ranking",
    ],
  },
  {
    id: "Pro",
    name: "Pro",
    priceMonthly: 350_000,
    blurb: "For regulars who play weekly.",
    color: "#6D5BFF",
    courtDiscountPct: 15,
    openPlayCredits: 2,
    highlighted: true,
    perks: [
      "15% off all court bookings",
      "2 free open-play sessions / month",
      "Priority booking window (+24h)",
      "Free racket restring / month",
      "10% off pro-shop",
    ],
  },
  {
    id: "Elite",
    name: "Elite",
    priceMonthly: 750_000,
    blurb: "Unlimited play & VIP perks.",
    color: "#14B8A6",
    courtDiscountPct: 30,
    openPlayCredits: 6,
    perks: [
      "30% off all court bookings",
      "6 free open-play sessions / month",
      "Priority booking window (+48h)",
      "1 free PT session / month",
      "20% off pro-shop & guest passes",
      "Dedicated locker",
    ],
  },
];

export const tierById = (id: MemberTier) =>
  tierDefinitions.find((t) => t.id === id) ?? tierDefinitions[0];

export interface WalletState {
  balance: number; // IDR
  pointsBalance: number;
  pointsToNextReward: number;
  nextRewardLabel: string;
  membershipRenewsAt: string; // ISO
  memberSince: string; // ISO
}

export const walletState: WalletState = {
  balance: 350_000,
  pointsBalance: 1_840,
  pointsToNextReward: 2_000,
  nextRewardLabel: "Free 90-min court session",
  membershipRenewsAt: "2026-06-28",
  memberSince: "2024-11-03",
};

export interface WalletTopupOption {
  amount: number;
  bonus: number; // bonus IDR added
}

export const topupOptions: WalletTopupOption[] = [
  { amount: 100_000, bonus: 0 },
  { amount: 250_000, bonus: 15_000 },
  { amount: 500_000, bonus: 50_000 },
  { amount: 1_000_000, bonus: 150_000 },
];

export interface WalletActivity {
  id: string;
  label: string;
  date: string;
  amount: number; // negative = spend, positive = top-up
  type: "topup" | "booking" | "pos" | "refund" | "bonus";
}

export const walletActivity: WalletActivity[] = [
  { id: "wa-01", label: "Top-up via GoPay", date: "2026-05-30", amount: 250_000, type: "topup" },
  { id: "wa-02", label: "Center Court · 1.5h", date: "2026-05-30", amount: -330_000, type: "booking" },
  { id: "wa-03", label: "Loyalty bonus", date: "2026-05-28", amount: 15_000, type: "bonus" },
  { id: "wa-04", label: "Pro-shop · overgrip x3", date: "2026-05-25", amount: -75_000, type: "pos" },
  { id: "wa-05", label: "Refund · cancelled slot", date: "2026-05-22", amount: 100_000, type: "refund" },
  { id: "wa-06", label: "Wednesday Mexicano", date: "2026-05-20", amount: -120_000, type: "booking" },
];
