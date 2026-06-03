// PadelHub — platform (super-admin) analytics mock data (dummy, no DB).
// Aggregates across all tenants for the SaaS operator dashboard.

import { mockTenants, type PlanTier } from "@/data/padel/tenant";

export const MONTHS_12 = [
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
];

// Monthly recurring revenue trend (IDR, in thousands → stored absolute).
export const mrrTrend: number[] = [
  4_180_000, 4_620_000, 5_110_000, 5_460_000, 5_980_000, 6_240_000,
  6_510_000, 6_980_000, 7_240_000, 7_560_000, 7_910_000, 8_360_000,
];

// New tenants vs churned tenants per month.
export const tenantFlow = {
  added: [3, 4, 2, 5, 4, 3, 6, 4, 5, 3, 6, 5],
  churned: [0, 1, 1, 0, 2, 1, 1, 2, 1, 1, 0, 1],
};

// Trial → paid conversion rate per month (%).
export const conversionTrend: number[] = [
  48, 52, 55, 51, 58, 60, 57, 62, 64, 61, 66, 68,
];

// Net revenue retention per month (%).
export const nrrTrend: number[] = [
  101, 102, 103, 104, 103, 105, 106, 107, 108, 107, 109, 111,
];

export interface PlatformKpi {
  key: string;
  label: string;
  value: string;
  delta: number; // % vs previous period
  trend: number[]; // sparkline series
  tone: "primary" | "success" | "warning" | "info";
}

const activeTenants = mockTenants.filter((t) => t.status === "active").length;
const trialTenants = mockTenants.filter((t) => t.status === "trial").length;
const currentMrr = mockTenants.reduce((sum, t) => sum + t.mrr, 0);
const totalMembers = mockTenants.reduce((sum, t) => sum + t.membersCount, 0);

export const fmtIDR = (n: number, compact = false) =>
  compact
    ? `Rp ${(n / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`
    : `Rp ${n.toLocaleString("id-ID")}`;

export const platformKpis: PlatformKpi[] = [
  {
    key: "mrr",
    label: "Monthly Recurring Revenue",
    value: fmtIDR(currentMrr, true),
    delta: 5.7,
    trend: mrrTrend.slice(-7),
    tone: "primary",
  },
  {
    key: "active",
    label: "Active Clubs",
    value: String(activeTenants),
    delta: 12.5,
    trend: [9, 10, 11, 12, 12, 13, 14].slice(0, 7),
    tone: "success",
  },
  {
    key: "trial",
    label: "Trials in Conversion",
    value: String(trialTenants),
    delta: 8.0,
    trend: [2, 3, 2, 4, 3, 4, 5],
    tone: "info",
  },
  {
    key: "churn",
    label: "Net Churn (30d)",
    value: "1.4%",
    delta: -0.6,
    trend: [2.1, 1.9, 2.0, 1.7, 1.6, 1.5, 1.4],
    tone: "warning",
  },
  {
    key: "arpa",
    label: "Avg. Revenue / Club",
    value: fmtIDR(Math.round(currentMrr / Math.max(activeTenants, 1)), true),
    delta: 3.2,
    trend: [1.6, 1.7, 1.7, 1.8, 1.9, 2.0, 2.1],
    tone: "primary",
  },
  {
    key: "players",
    label: "Players Managed",
    value: totalMembers.toLocaleString("id-ID"),
    delta: 9.1,
    trend: [1820, 1910, 1980, 2040, 2120, 2210, 2324],
    tone: "info",
  },
];

// Plan mix (count of tenants per plan tier) for the donut chart.
export const planMix: { tier: PlanTier; label: string; count: number }[] = [
  {
    tier: "starter",
    label: "Starter",
    count: mockTenants.filter((t) => t.plan === "starter").length,
  },
  {
    tier: "pro",
    label: "Pro",
    count: mockTenants.filter((t) => t.plan === "pro").length,
  },
  {
    tier: "enterprise",
    label: "Enterprise",
    count: mockTenants.filter((t) => t.plan === "enterprise").length,
  },
];

// MRR contribution per plan tier (IDR).
export const mrrByPlan: { tier: PlanTier; label: string; amount: number }[] = [
  {
    tier: "starter",
    label: "Starter",
    amount: mockTenants
      .filter((t) => t.plan === "starter")
      .reduce((s, t) => s + t.mrr, 0),
  },
  {
    tier: "pro",
    label: "Pro",
    amount: mockTenants
      .filter((t) => t.plan === "pro")
      .reduce((s, t) => s + t.mrr, 0),
  },
  {
    tier: "enterprise",
    label: "Enterprise",
    amount: mockTenants
      .filter((t) => t.plan === "enterprise")
      .reduce((s, t) => s + t.mrr, 0),
  },
];

export interface ActivityEvent {
  id: string;
  type: "signup" | "upgrade" | "payment" | "churn" | "trial" | "support";
  tenant: string;
  message: string;
  at: string; // relative human label
}

export const platformActivity: ActivityEvent[] = [
  { id: "a1", type: "signup", tenant: "GoldenSet Sports", message: "Started a 30-day Starter trial", at: "2h ago" },
  { id: "a2", type: "upgrade", tenant: "SmashCourt Padel Club", message: "Upgraded Starter → Pro", at: "5h ago" },
  { id: "a3", type: "payment", tenant: "Baseline Padel Bali", message: "Paid Enterprise invoice Rp 3,49 jt", at: "1d ago" },
  { id: "a4", type: "trial", tenant: "DropShot Arena", message: "Invoice past due — retry scheduled", at: "1d ago" },
  { id: "a5", type: "support", tenant: "LobLife Padel", message: "Account suspended (manual hold)", at: "3d ago" },
  { id: "a6", type: "payment", tenant: "SmashCourt Padel Club", message: "Paid Pro invoice Rp 1,29 jt", at: "4d ago" },
];

export const activityMeta: Record<
  ActivityEvent["type"],
  { label: string; tone: "success" | "warning" | "error" | "info" | "primary" }
> = {
  signup: { label: "Sign-up", tone: "info" },
  upgrade: { label: "Upgrade", tone: "success" },
  payment: { label: "Payment", tone: "primary" },
  churn: { label: "Churn", tone: "error" },
  trial: { label: "Trial", tone: "warning" },
  support: { label: "Support", tone: "warning" },
};
