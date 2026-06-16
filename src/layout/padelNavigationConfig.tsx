import type { ReactNode } from "react";
import type { UserRole } from "@/context/RoleContext";
import {
  CalendarIcon,
  CashRegisterIcon,
  ClassIcon,
  ClipboardIcon,
  HomeIcon,
  MemberIcon,
  PromoIcon,
  QrCodeIcon,
  SettingsIcon,
  ShieldIcon,
  TargetIcon,
  TrainerIcon,
  TrendingUpIcon,
  PackageIcon,
  CreditCardIcon,
  WalletIcon,
  UserIcon,
} from "@/icons/gym-icons";
import { GridIcon, ListIcon, PlugInIcon, DollarLineIcon } from "@/icons";

/** Sidebar bucket: UTAMA (main) · MASTER (master) · LAINNYA (others). */
export type NavGroup = "main" | "master" | "others";

export type NavSubItem = {
  name: string;
  path: string;
  /** permission key(s); any-match grants visibility */
  requiredAny?: string[];
  requiredRolesAny?: UserRole[];
  badge?: "new" | "soon" | "hot";
  /** override the parent group for this child (rarely needed) */
  group?: NavGroup;
};

export type NavItem = {
  name: string;
  icon: ReactNode;
  path?: string;
  requiredAny?: string[];
  requiredRolesAny?: UserRole[];
  badge?: "new" | "soon" | "hot";
  /** sidebar bucket; defaults to "others" when absent */
  group?: NavGroup;
  subItems?: NavSubItem[];
};

export type NavSection = {
  /** sidebar group heading */
  title: string;
  /** roles this whole section is meant for (used when seeding per-role menus) */
  roles: UserRole[];
  items: NavItem[];
};

const platformRoles: UserRole[] = ["superadmin"];
const clubRoles: UserRole[] = ["owner", "staff", "coach"];
const memberRoles: UserRole[] = ["member"];

// ── Icon shorthand ──
const icon = (node: ReactNode) => node;

/* ════════════════════════════════════════════════════════
 * PLATFORM (superadmin) — under /platform/*
 * ════════════════════════════════════════════════════════ */
// TEMP: focus mode — all Platform (superadmin) menus hidden. Uncomment the
// entries below to restore.
export const platformNav: NavItem[] = [
  // {
  //   name: "Platform Dashboard",
  //   path: "/platform",
  //   icon: icon(<GridIcon className="h-5 w-5" />),
  //   requiredAny: ["platform.view"],
  //   requiredRolesAny: platformRoles,
  //   group: "main",
  // },
  // {
  //   name: "Tenants",
  //   path: "/platform/tenants",
  //   icon: icon(<MemberIcon className="h-5 w-5" />),
  //   requiredAny: ["tenants.view"],
  //   requiredRolesAny: platformRoles,
  //   group: "main",
  // },
  // {
  //   name: "Billing",
  //   path: "/platform/billing",
  //   icon: icon(<CreditCardIcon className="h-5 w-5" />),
  //   requiredAny: ["billing.view"],
  //   requiredRolesAny: platformRoles,
  //   group: "main",
  // },
  // {
  //   name: "Plans & Pricing",
  //   path: "/platform/plans",
  //   icon: icon(<PackageIcon className="h-5 w-5" />),
  //   requiredAny: ["plans.view"],
  //   requiredRolesAny: platformRoles,
  //   group: "master",
  // },
  // {
  //   name: "Feature Flags",
  //   path: "/platform/feature-flags",
  //   icon: icon(<PlugInIcon className="h-5 w-5" />),
  //   requiredAny: ["flags.manage"],
  //   requiredRolesAny: platformRoles,
  //   group: "master",
  // },
  // {
  //   name: "Access Control",
  //   path: "/platform/access-control",
  //   icon: icon(<ShieldIcon className="h-5 w-5" />),
  //   requiredAny: ["access.manage"],
  //   requiredRolesAny: platformRoles,
  //   group: "master",
  // },
  // {
  //   name: "Menu Builder",
  //   path: "/platform/menu-builder",
  //   icon: icon(<ListIcon className="h-5 w-5" />),
  //   requiredAny: ["menu.manage"],
  //   requiredRolesAny: platformRoles,
  //   group: "master",
  // },
  // {
  //   name: "Form Builder",
  //   path: "/platform/form-builder",
  //   icon: icon(<ClipboardIcon className="h-5 w-5" />),
  //   requiredAny: ["form.manage"],
  //   requiredRolesAny: platformRoles,
  //   group: "master",
  // },
  // {
  //   name: "Platform Settings",
  //   path: "/platform/settings",
  //   icon: icon(<SettingsIcon className="h-5 w-5" />),
  //   requiredAny: ["platform.settings"],
  //   requiredRolesAny: platformRoles,
  //   group: "others",
  // },
];

/* ════════════════════════════════════════════════════════
 * CLUB (owner / staff / coach) — root app
 * ════════════════════════════════════════════════════════ */
export const clubNav: NavItem[] = [
  // ── UTAMA ──
  // TEMP: focus mode — only Booking, Manage Member (Register + Data), and
  // Master > Lapangan are shown. Other menus are commented out below to reduce
  // distraction. Uncomment to restore.
  // {
  //   name: "Dashboard",
  //   path: "/",
  //   icon: icon(<HomeIcon className="h-5 w-5" />),
  //   requiredAny: ["dashboard.view"],
  //   requiredRolesAny: clubRoles,
  //   group: "main",
  // },
  {
    name: "Booking & Check-in",
    icon: icon(<CalendarIcon className="h-5 w-5" />),
    requiredAny: ["booking.view"],
    requiredRolesAny: clubRoles,
    group: "main",
    subItems: [
      { name: "New Booking", path: "/bookings/search", requiredAny: ["booking.view"], requiredRolesAny: ["owner", "staff"], badge: "new" },
      { name: "Booking", path: "/bookings", requiredAny: ["booking.view"] },
      // {
      //   name: "Check-in",
      //   path: "/checkin",
      //   requiredAny: ["booking.view"],
      //   requiredRolesAny: ["owner", "staff"],
      //   badge: "new",
      // },
    ],
  },
  {
    name: "Manage Member",
    icon: icon(<MemberIcon className="h-5 w-5" />),
    requiredAny: ["members.view"],
    requiredRolesAny: ["owner", "staff"],
    group: "main",
    subItems: [
      { name: "Register Member", path: "/members/register", requiredAny: ["members.view"], badge: "new" },
      { name: "Data Member", path: "/members", requiredAny: ["members.view"] },
    ],
  },
  // {
  //   name: "POS",
  //   path: "/pos",
  //   icon: icon(<CashRegisterIcon className="h-5 w-5" />),
  //   requiredAny: ["pos.view"],
  //   requiredRolesAny: ["owner", "staff"],
  //   group: "main",
  // },
  // ── LAINNYA ──
  // {
  //   name: "Coaching",
  //   icon: icon(<TrainerIcon className="h-5 w-5" />),
  //   requiredAny: ["coaching.view"],
  //   requiredRolesAny: clubRoles,
  //   group: "others",
  //   subItems: [
  //     { name: "Coach Data", path: "/coaching", requiredAny: ["coaching.view"] },
  //     { name: "Jadwal Coach", path: "/coaching/schedule", requiredAny: ["coaching.view"] },
  //   ],
  // },
  // {
  //   name: "Finance",
  //   icon: icon(<DollarLineIcon className="h-5 w-5" />),
  //   requiredAny: ["finance.view"],
  //   requiredRolesAny: ["owner"],
  //   group: "others",
  //   subItems: [
  //     { name: "Transaksi", path: "/finance", requiredAny: ["finance.view"] },
  //     { name: "Invoice", path: "/finance/invoices", requiredAny: ["finance.view"] },
  //     { name: "Report", path: "/finance/reports", requiredAny: ["finance.view"] },
  //   ],
  // },
  // {
  //   name: "Marketing",
  //   icon: icon(<PromoIcon className="h-5 w-5" />),
  //   requiredAny: ["marketing.view"],
  //   requiredRolesAny: ["owner", "staff"],
  //   group: "others",
  //   subItems: [
  //     { name: "Promo", path: "/marketing", requiredAny: ["marketing.view"] },
  //     { name: "Referral", path: "/marketing/referrals", requiredAny: ["marketing.view"] },
  //   ],
  // },
  {
    name: "Master",
    icon: icon(<SettingsIcon className="h-5 w-5" />),
    requiredAny: ["settings.view"],
    requiredRolesAny: ["superadmin"],
    group: "others",
    subItems: [
      { name: "Lapangan", path: "/courts", requiredAny: ["courts.view"] },
      { name: "Maintenance Lapangan", path: "/maintenance", requiredAny: ["courts.view"] },
      { name: "Jam Operasional", path: "/settings/hours", requiredAny: ["settings.view"] },
      // { name: "Membership Plan", path: "/settings/plans", requiredAny: ["settings.view"] },
      // { name: "Product", path: "/pos", requiredAny: ["pos.view"] },
      // { name: "Operating Hours", path: "/settings/hours", requiredAny: ["settings.view"] },
      // { name: "Staff & Role", path: "/settings/staff", requiredAny: ["settings.view"] },
    ],
  },
];

/* ════════════════════════════════════════════════════════
 * MEMBER portal — under /me/*
 * ════════════════════════════════════════════════════════ */
// TEMP: focus mode — all Member portal menus hidden. Uncomment to restore.
export const memberNav: NavItem[] = [
  // {
  //   name: "My Dashboard",
  //   path: "/me",
  //   icon: icon(<HomeIcon className="h-5 w-5" />),
  //   requiredAny: ["me.view"],
  //   requiredRolesAny: memberRoles,
  //   group: "main",
  // },
  // {
  //   name: "Book a Court",
  //   path: "/me/book",
  //   icon: icon(<CalendarIcon className="h-5 w-5" />),
  //   requiredAny: ["me.book"],
  //   requiredRolesAny: memberRoles,
  //   group: "main",
  //   badge: "new",
  // },
  // {
  //   name: "Check-in",
  //   path: "/me/checkin",
  //   icon: icon(<QrCodeIcon className="h-5 w-5" />),
  //   requiredAny: ["me.view"],
  //   requiredRolesAny: memberRoles,
  //   group: "main",
  //   badge: "new",
  // },
  // {
  //   name: "My Bookings",
  //   path: "/me/bookings",
  //   icon: icon(<ClassIcon className="h-5 w-5" />),
  //   requiredAny: ["me.view"],
  //   requiredRolesAny: memberRoles,
  //   group: "main",
  // },
  // {
  //   name: "Open Play & Matches",
  //   path: "/me/matches",
  //   icon: icon(<TargetIcon className="h-5 w-5" />),
  //   requiredAny: ["me.matches"],
  //   requiredRolesAny: memberRoles,
  //   group: "others",
  // },
  // {
  //   name: "Book PT",
  //   path: "/me/pt",
  //   icon: icon(<TrainerIcon className="h-5 w-5" />),
  //   requiredAny: ["me.view"],
  //   requiredRolesAny: memberRoles,
  //   group: "others",
  //   badge: "new",
  // },
  // {
  //   name: "Membership & Wallet",
  //   path: "/me/membership",
  //   icon: icon(<WalletIcon className="h-5 w-5" />),
  //   requiredAny: ["me.membership"],
  //   requiredRolesAny: memberRoles,
  //   group: "others",
  // },
  // {
  //   name: "Leaderboard",
  //   path: "/me/leaderboard",
  //   icon: icon(<TrendingUpIcon className="h-5 w-5" />),
  //   requiredAny: ["me.matches"],
  //   requiredRolesAny: memberRoles,
  //   group: "others",
  // },
  // {
  //   name: "Payments",
  //   path: "/me/payments",
  //   icon: icon(<CreditCardIcon className="h-5 w-5" />),
  //   requiredAny: ["me.payments"],
  //   requiredRolesAny: memberRoles,
  //   group: "others",
  // },
  // {
  //   name: "Profile",
  //   path: "/me/profile",
  //   icon: icon(<UserIcon className="h-5 w-5" />),
  //   requiredAny: ["me.view"],
  //   requiredRolesAny: memberRoles,
  //   group: "others",
  // },
];

// Sections used to seed the dynamic MenuContext store.
export const navSections: NavSection[] = [
  { title: "Platform", roles: platformRoles, items: platformNav },
  { title: "Club", roles: clubRoles, items: clubNav },
  { title: "Member", roles: memberRoles, items: memberNav },
];

// Convenience: flatten for path lookups.
export const flattenNav = (items: NavItem[]) =>
  items.flatMap((item) => [
    ...(item.path
      ? [{ name: item.name, path: item.path, parent: item.name }]
      : []),
    ...(item.subItems?.map((sub) => ({
      name: sub.name,
      path: sub.path,
      parent: item.name,
    })) ?? []),
  ]);

export const allNavItems: NavItem[] = [
  ...platformNav,
  ...clubNav,
  ...memberNav,
];
