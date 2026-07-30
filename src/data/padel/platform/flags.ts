// PadelHub — feature flags / module catalog (dummy, no DB).
// Modules can be toggled per plan tier and overridden per tenant.

import type { PlanTier } from "@/data/padel/tenant";

export interface FeatureModule {
  key: string;
  name: string;
  description: string;
  category: "Core" | "Growth" | "Enterprise" | "Beta";
  /** which plan tiers include this module by default */
  includedIn: PlanTier[];
  beta?: boolean;
}

export const featureModules: FeatureModule[] = [
  { key: "bookings", name: "Court Booking", description: "Calendar + court-grid reservations.", category: "Core", includedIn: ["starter", "pro", "enterprise"] },
  { key: "members", name: "Members CRM", description: "Player profiles, tiers & wallet.", category: "Core", includedIn: ["starter", "pro", "enterprise"] },
  { key: "pos", name: "Pro-Shop POS", description: "Retail & equipment rental checkout.", category: "Core", includedIn: ["starter", "pro", "enterprise"] },
  { key: "coaching", name: "Coaching", description: "Coach master, packages, schedules & sessions.", category: "Growth", includedIn: ["pro", "enterprise"] },
  { key: "finance", name: "Finance & Reports", description: "Transactions, invoices, revenue analytics.", category: "Growth", includedIn: ["pro", "enterprise"] },
  { key: "marketing", name: "Marketing Suite", description: "Promos, referrals & notifications.", category: "Growth", includedIn: ["pro", "enterprise"] },
  { key: "white_label", name: "White-Label", description: "Custom domain, branding & logo.", category: "Enterprise", includedIn: ["enterprise"] },
  { key: "api", name: "Public API", description: "REST API & webhooks access.", category: "Enterprise", includedIn: ["enterprise"] },
  { key: "ai_scheduler", name: "AI Court Optimizer", description: "Smart slot suggestions to maximise occupancy.", category: "Beta", includedIn: [], beta: true },
  { key: "ranking_elo", name: "ELO Ranking Engine", description: "Skill-based ELO rankings across clubs.", category: "Beta", includedIn: ["enterprise"], beta: true },
];

export const moduleCategoryMeta: Record<
  FeatureModule["category"],
  { tone: "primary" | "success" | "info" | "warning" }
> = {
  Core: { tone: "primary" },
  Growth: { tone: "success" },
  Enterprise: { tone: "info" },
  Beta: { tone: "warning" },
};
