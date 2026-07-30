// PadelHub — tenant / club mock data (dummy, no DB)
// A "tenant" is a padel club subscribed to the PadelHub SaaS platform.

export type PlanTier = "starter" | "pro" | "enterprise";
export type TenantStatus = "active" | "trial" | "suspended" | "past_due";

export interface SubscriptionPlan {
  id: PlanTier;
  name: string;
  priceMonthly: number; // in IDR
  blurb: string;
  highlighted?: boolean;
  limits: {
    courts: number; // -1 = unlimited
    staff: number;
    modules: string[]; // feature-flag keys included
  };
  features: string[];
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  city: string;
  country: string;
  logo: string;
  plan: PlanTier;
  status: TenantStatus;
  courts: number;
  staffSeats: number;
  membersCount: number;
  mrr: number; // monthly recurring revenue contributed (IDR)
  createdAt: string; // ISO date
  trialEndsAt?: string;
  ownerName: string;
  ownerEmail: string;
}

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: "starter",
    name: "Starter",
    priceMonthly: 490_000,
    blurb: "Untuk klub baru dengan 1-2 lapangan.",
    limits: { courts: 2, staff: 3, modules: ["bookings", "members", "pos"] },
    features: [
      "2 lapangan",
      "3 akun staff",
      "Booking & kalender",
      "Member CRM dasar",
      "POS pro-shop",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 1_290_000,
    blurb: "Klub berkembang dengan coaching & open play.",
    highlighted: true,
    limits: {
      courts: 8,
      staff: 12,
      modules: [
        "bookings",
        "members",
        "pos",
        "coaching",
        "finance",
        "marketing",
      ],
    },
    features: [
      "8 lapangan",
      "12 akun staff",
      "Coaching, paket & jadwal coach",
      "Finance & laporan",
      "Marketing & referral",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    priceMonthly: 3_490_000,
    blurb: "Multi-cabang, kontrol penuh, white-label.",
    limits: {
      courts: -1,
      staff: -1,
      modules: [
        "bookings",
        "members",
        "pos",
        "coaching",
        "finance",
        "marketing",
        "white_label",
        "api",
      ],
    },
    features: [
      "Lapangan tak terbatas",
      "Staff tak terbatas",
      "Semua modul Pro",
      "White-label & domain sendiri",
      "Akses API",
      "Dedicated support",
    ],
  },
];

export const planById = (id: PlanTier) =>
  subscriptionPlans.find((p) => p.id === id) ?? subscriptionPlans[0];

export const mockTenants: Tenant[] = [
  {
    id: "tenant-smash",
    name: "SmashCourt Padel Club",
    slug: "smashcourt",
    city: "Jakarta Selatan",
    country: "Indonesia",
    logo: "/images/brand/brand-01.svg",
    plan: "pro",
    status: "active",
    courts: 6,
    staffSeats: 9,
    membersCount: 482,
    mrr: 1_290_000,
    createdAt: "2025-02-12",
    ownerName: "Raka Pradana",
    ownerEmail: "owner@smashcourt.id",
  },
  {
    id: "tenant-baseline",
    name: "Baseline Padel Bali",
    slug: "baseline-bali",
    city: "Denpasar",
    country: "Indonesia",
    logo: "/images/brand/brand-02.svg",
    plan: "enterprise",
    status: "active",
    courts: 12,
    staffSeats: 24,
    membersCount: 1140,
    mrr: 3_490_000,
    createdAt: "2024-09-03",
    ownerName: "Maya Santoso",
    ownerEmail: "maya@baselinebali.com",
  },
  {
    id: "tenant-volley",
    name: "GoldenSet Sports",
    slug: "goldenset",
    city: "Bandung",
    country: "Indonesia",
    logo: "/images/brand/brand-03.svg",
    plan: "starter",
    status: "trial",
    courts: 2,
    staffSeats: 2,
    membersCount: 64,
    mrr: 0,
    createdAt: "2026-05-18",
    trialEndsAt: "2026-06-18",
    ownerName: "Bayu Hartono",
    ownerEmail: "bayu@goldenset.id",
  },
  {
    id: "tenant-drop",
    name: "DropShot Arena",
    slug: "dropshot",
    city: "Surabaya",
    country: "Indonesia",
    logo: "/images/brand/brand-04.svg",
    plan: "pro",
    status: "past_due",
    courts: 5,
    staffSeats: 7,
    membersCount: 310,
    mrr: 1_290_000,
    createdAt: "2025-06-21",
    ownerName: "Sinta Dewanti",
    ownerEmail: "sinta@dropshot.id",
  },
  {
    id: "tenant-lob",
    name: "LobLife Padel",
    slug: "loblife",
    city: "Tangerang Selatan",
    country: "Indonesia",
    logo: "/images/brand/brand-05.svg",
    plan: "starter",
    status: "suspended",
    courts: 2,
    staffSeats: 3,
    membersCount: 128,
    mrr: 0,
    createdAt: "2025-11-09",
    ownerName: "Fajar Nugroho",
    ownerEmail: "fajar@loblife.id",
  },
];

// The club that owner/staff/coach/member currently operate within.
export interface CurrentClub {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  plan: PlanTier;
  courts: number;
  timezone: string;
  currency: string;
  openingTime: string;
  closingTime: string;
}

export const currentClub: CurrentClub = {
  id: "tenant-smash",
  name: "SmashCourt Padel Club",
  slug: "smashcourt",
  tagline: "Where every rally counts.",
  city: "Jakarta Selatan",
  address: "Jl. Senopati No. 88, Jakarta Selatan",
  phone: "+62 21 5500 7788",
  email: "hello@smashcourt.id",
  plan: "pro",
  courts: 6,
  timezone: "Asia/Jakarta",
  currency: "IDR",
  openingTime: "07:00",
  closingTime: "23:00",
};

export const tenantStatusMeta: Record<
  TenantStatus,
  { label: string; tone: "success" | "warning" | "error" | "info" }
> = {
  active: { label: "Active", tone: "success" },
  trial: { label: "Trial", tone: "info" },
  suspended: { label: "Suspended", tone: "error" },
  past_due: { label: "Past Due", tone: "warning" },
};
