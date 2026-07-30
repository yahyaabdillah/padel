// PadelHub — canonical menu catalog (single source of truth for seeding the
// master DB m_menu table and for the access-control UI defaults).
//
// Each entry maps to one sidebar item. `key` is the stable slug used by
// m_role_menu to attach per-role action permissions. Icons are lucide-react
// export names (resolved at render time). Parent items (no path) are groups.

export type MenuGroupKey = "main" | "master" | "others";

export interface MenuCatalogEntry {
  key: string;
  label: string;
  path: string; // "" for a group parent
  icon: string; // lucide export name
  parentKey: string | null;
  groupKey: MenuGroupKey;
  section: string; // Platform | Club | Member
  sortOrder: number;
  badge?: "new" | "soon" | "hot";
}

/** Default role→menu visibility/action grants per role key. */
export interface RoleMenuDefault {
  /** which roles get this menu, and with what actions. "*" = all 7 actions. */
  grants: Record<
    string,
    "*" | Array<"view" | "create" | "update" | "delete" | "cancel" | "import" | "export">
  >;
}

let order = 0;
const next = () => order++;

/**
 * The full menu tree. Mirrors the current sidebar plus the new Access Control
 * group. Edit here to change the seeded defaults.
 */
export const MENU_CATALOG: (MenuCatalogEntry & RoleMenuDefault)[] = [
  // ── Booking & Check-in (Club) ──
  {
    key: "booking",
    label: "Booking & Check-in",
    path: "",
    icon: "CalendarCheck",
    parentKey: null,
    groupKey: "main",
    section: "Club",
    sortOrder: next(),
    grants: { owner: "*", staff: "*", coach: ["view"] },
  },
  {
    key: "booking.new",
    label: "New Booking",
    path: "/bookings/search",
    icon: "CalendarPlus",
    parentKey: "booking",
    groupKey: "main",
    section: "Club",
    sortOrder: next(),
    badge: "new",
    grants: { owner: "*", staff: "*" },
  },
  {
    key: "booking.list",
    label: "Booking",
    path: "/bookings",
    icon: "CalendarDays",
    parentKey: "booking",
    groupKey: "main",
    section: "Club",
    sortOrder: next(),
    grants: { owner: "*", staff: ["view", "create", "update", "cancel"], coach: ["view"] },
  },
  {
    key: "checkin",
    label: "Check-in",
    path: "/checkin",
    icon: "QrCode",
    parentKey: "booking",
    groupKey: "main",
    section: "Club",
    sortOrder: next(),
    grants: { owner: "*", staff: "*", coach: ["view"] },
  },

  // ── Manage Member (Club) ──
  {
    key: "members",
    label: "Manage Member",
    path: "",
    icon: "Users",
    parentKey: null,
    groupKey: "main",
    section: "Club",
    sortOrder: next(),
    grants: { owner: "*", staff: "*" },
  },
  {
    key: "members.register",
    label: "Register Member",
    path: "/members/register",
    icon: "UserPlus",
    parentKey: "members",
    groupKey: "main",
    section: "Club",
    sortOrder: next(),
    badge: "new",
    grants: { owner: "*", staff: ["view", "create", "update"] },
  },
  {
    key: "members.data",
    label: "Data Member",
    path: "/members",
    icon: "Users",
    parentKey: "members",
    groupKey: "main",
    section: "Club",
    sortOrder: next(),
    grants: { owner: "*", staff: ["view", "create", "update", "export"] },
  },
  {
    key: "members.membership",
    label: "Membership",
    path: "/members/membership",
    icon: "BadgeCheck",
    parentKey: "members",
    groupKey: "main",
    section: "Club",
    sortOrder: next(),
    badge: "new",
    grants: { owner: "*", staff: ["view", "create", "update"] },
  },

  // ── Coaching (Club) ──
  {
    key: "coaching",
    label: "Coaching",
    path: "",
    icon: "GraduationCap",
    parentKey: null,
    groupKey: "others",
    section: "Club",
    sortOrder: next(),
    grants: { owner: "*", staff: ["view"], coach: "*" },
  },
  {
    key: "coaching.coaches",
    label: "Coach",
    path: "/coaching/coaches",
    icon: "GraduationCap",
    parentKey: "coaching",
    groupKey: "others",
    section: "Club",
    sortOrder: next(),
    grants: { owner: "*", staff: ["view"], coach: ["view"] },
  },
  {
    key: "coaching.schedule",
    label: "Coach Schedule",
    path: "/coaching/schedule",
    icon: "CalendarClock",
    parentKey: "coaching",
    groupKey: "others",
    section: "Club",
    sortOrder: next(),
    badge: "new",
    grants: { owner: "*", staff: ["view", "create", "update"], coach: ["view"] },
  },
  {
    key: "coaching.packages",
    label: "Coach Packages",
    path: "/coaching/packages",
    icon: "Package",
    parentKey: "coaching",
    groupKey: "others",
    section: "Club",
    sortOrder: next(),
    grants: { owner: "*", staff: ["view"] },
  },

  // ── Master (superadmin) ──
  {
    key: "master",
    label: "Master",
    path: "",
    icon: "SlidersHorizontal",
    parentKey: null,
    groupKey: "others",
    section: "Club",
    sortOrder: next(),
    grants: { superadmin: "*" },
  },
  {
    key: "master.courts",
    label: "Lapangan",
    path: "/courts",
    icon: "LayoutGrid",
    parentKey: "master",
    groupKey: "others",
    section: "Club",
    sortOrder: next(),
    grants: { superadmin: "*" },
  },
  {
    key: "master.maintenance",
    label: "Maintenance Lapangan",
    path: "/maintenance",
    icon: "Wrench",
    parentKey: "master",
    groupKey: "others",
    section: "Club",
    sortOrder: next(),
    grants: { superadmin: "*" },
  },
  {
    key: "master.hours",
    label: "Jam Operasional",
    path: "/settings/hours",
    icon: "Clock",
    parentKey: "master",
    groupKey: "others",
    section: "Club",
    sortOrder: next(),
    grants: { superadmin: "*" },
  },
  {
    key: "master.plans",
    label: "Membership Plan",
    path: "/settings/plans",
    icon: "Wallet",
    parentKey: "master",
    groupKey: "others",
    section: "Club",
    sortOrder: next(),
    grants: { superadmin: "*" },
  },
  {
    key: "settings.company",
    label: "Company Settings",
    path: "/settings/company",
    icon: "Building2",
    parentKey: "master",
    groupKey: "others",
    section: "Club",
    sortOrder: next(),
    grants: { superadmin: "*" },
  },

  // ── Access Control (superadmin) ──
  {
    key: "access",
    label: "Access Control",
    path: "",
    icon: "ShieldCheck",
    parentKey: null,
    groupKey: "others",
    section: "Platform",
    sortOrder: next(),
    grants: { superadmin: "*" },
  },
  {
    key: "access.roles",
    label: "Roles & Permissions",
    path: "/access/roles",
    icon: "Shield",
    parentKey: "access",
    groupKey: "others",
    section: "Platform",
    sortOrder: next(),
    grants: { superadmin: "*" },
  },
  {
    key: "access.staff",
    label: "Staff & User",
    path: "/access/staff",
    icon: "UserCog",
    parentKey: "access",
    groupKey: "others",
    section: "Platform",
    sortOrder: next(),
    grants: { superadmin: "*" },
  },
  {
    key: "access.menus",
    label: "Menu Builder",
    path: "/access/menus",
    icon: "ListTree",
    parentKey: "access",
    groupKey: "others",
    section: "Platform",
    sortOrder: next(),
    grants: { superadmin: "*" },
  },
  {
    key: "access.users",
    label: "User Overrides",
    path: "/access/users",
    icon: "UserCog",
    parentKey: "access",
    groupKey: "others",
    section: "Platform",
    sortOrder: next(),
    grants: { superadmin: "*" },
  },

  // ── Member Portal (member role) ──
  {
    key: "portal",
    label: "Portal Member",
    path: "",
    icon: "LayoutDashboard",
    parentKey: null,
    groupKey: "main",
    section: "Member",
    sortOrder: next(),
    grants: { member: ["view"] },
  },
  {
    key: "portal.home",
    label: "Dashboard",
    path: "/me",
    icon: "LayoutDashboard",
    parentKey: "portal",
    groupKey: "main",
    section: "Member",
    sortOrder: next(),
    grants: { member: ["view"] },
  },
  {
    key: "portal.book",
    label: "Book a Court",
    path: "/me/book",
    icon: "CalendarPlus",
    parentKey: "portal",
    groupKey: "main",
    section: "Member",
    sortOrder: next(),
    grants: { member: ["view", "create"] },
  },
  {
    key: "portal.bookings",
    label: "Booking Saya",
    path: "/me/bookings",
    icon: "CalendarDays",
    parentKey: "portal",
    groupKey: "main",
    section: "Member",
    sortOrder: next(),
    grants: { member: ["view", "cancel"] },
  },
  {
    key: "portal.checkin",
    label: "Check-in",
    path: "/me/checkin",
    icon: "QrCode",
    parentKey: "portal",
    groupKey: "main",
    section: "Member",
    sortOrder: next(),
    grants: { member: ["view", "create"] },
  },
  {
    key: "portal.membership",
    label: "Membership",
    path: "/me/membership",
    icon: "Wallet",
    parentKey: "portal",
    groupKey: "main",
    section: "Member",
    sortOrder: next(),
    grants: { member: ["view", "create"] },
  },
  {
    key: "portal.payments",
    label: "Pembayaran",
    path: "/me/payments",
    icon: "Receipt",
    parentKey: "portal",
    groupKey: "main",
    section: "Member",
    sortOrder: next(),
    grants: { member: ["view"] },
  },
  {
    key: "portal.profile",
    label: "Profil",
    path: "/me/profile",
    icon: "UserCircle",
    parentKey: "portal",
    groupKey: "main",
    section: "Member",
    sortOrder: next(),
    grants: { member: ["view"] },
  },
];

/** The 7 granular actions, in display order. */
export const MENU_ACTIONS = [
  "view",
  "create",
  "update",
  "delete",
  "cancel",
  "import",
  "export",
] as const;
export type MenuAction = (typeof MENU_ACTIONS)[number];
