// PadelHub — dynamic menu item store (seed).
// Menu items are localStorage-persisted & editable via the Menu Builder, so the
// icon is stored as a STRING NAME — specifically a lucide-react export name
// (e.g. "Home", "CalendarDays", "QrCode") — resolved dynamically in AppSidebar.
// This keeps items JSON-serializable and lets the Menu Builder accept any
// lucide keyword with a live preview.

import type { UserRole } from "@/context/RoleContext";
import { navSections } from "@/layout/padelNavigationConfig";

/** A lucide-react icon export name, e.g. "Home" | "CalendarDays" | "QrCode". */
export type LucideIconName = string;

/** @deprecated alias retained for back-compat; icons are now lucide names. */
export type MenuIconKey = LucideIconName;

/** Sidebar bucket: UTAMA (main) · MASTER (master) · LAINNYA (others). */
export type MenuGroup = "main" | "master" | "others";

export interface MenuItem {
  id: string;
  label: string;
  path: string;
  icon: LucideIconName;
  /** parent menu id; null = top-level */
  parent: string | null;
  /** section heading the item belongs to (Platform / Club / Member) */
  section: string;
  /** sidebar bucket (UTAMA / MASTER / LAINNYA) */
  group: MenuGroup;
  order: number;
  roles: UserRole[];
  permission?: string;
  badge?: "new" | "soon" | "hot";
}

// Map an item path -> a lucide-react icon export NAME by item path.
// (Authoring concern only; keeps the seed declarative. The Menu Builder can
// later override any of these with another lucide keyword.)
const iconForPath = (
  path: string | undefined,
  parent: boolean,
): LucideIconName => {
  if (!path) return parent ? "List" : "LayoutGrid";
  const p = path;
  if (p === "/" || p === "/me" || p === "/platform") return "Home";
  if (p === "/checkin" || p === "/me/checkin") return "QrCode";
  if (p.startsWith("/bookings") || p === "/me/book") return "CalendarDays";
  if (p === "/settings/hours") return "Clock";
  if (p === "/settings/plans") return "Wallet";
  if (p === "/settings/staff") return "Shield";
  if (p.startsWith("/courts")) return "LayoutGrid";
  if (p.startsWith("/members") || p === "/platform/tenants") return "Users";
  if (p === "/me/pt" || p.startsWith("/coaching/pt")) return "Dumbbell";
  if (p.startsWith("/coaching")) return "Dumbbell";
  if (p.startsWith("/matches") || p === "/me/matches") return "Target";
  if (p.startsWith("/pos")) return "ShoppingCart";
  if (p.startsWith("/finance")) return "DollarSign";
  if (p.startsWith("/marketing")) return "Tag";
  if (p.startsWith("/settings") || p === "/platform/settings") return "Settings";
  if (p === "/platform/plans") return "Package";
  if (p === "/platform/billing" || p === "/me/payments") return "CreditCard";
  if (p === "/platform/access-control") return "Shield";
  if (p === "/platform/menu-builder") return "List";
  if (p === "/platform/form-builder") return "ClipboardList";
  if (p === "/platform/feature-flags") return "Plug";
  if (p === "/me/bookings") return "GraduationCap";
  if (p === "/me/membership") return "Wallet";
  if (p === "/me/leaderboard") return "TrendingUp";
  if (p === "/me/profile") return "User";
  return "LayoutGrid";
};

// Build the flat seed list from the static navSections.
function buildSeed(): MenuItem[] {
  const items: MenuItem[] = [];
  let order = 0;

  for (const section of navSections) {
    for (const navItem of section.items) {
      const parentId = `menu-${slug(navItem.name)}`;
      const hasChildren = !!navItem.subItems?.length;
      const parentGroup: MenuGroup = navItem.group ?? "others";
      // Top-level / parent entry. If it has no path it acts as a group parent.
      items.push({
        id: parentId,
        label: navItem.name,
        path: navItem.path ?? "",
        icon: iconForPath(navItem.path, hasChildren),
        parent: null,
        section: section.title,
        group: parentGroup,
        order: order++,
        roles: navItem.requiredRolesAny ?? section.roles,
        permission: navItem.requiredAny?.[0],
        badge: navItem.badge,
      });

      navItem.subItems?.forEach((sub) => {
        items.push({
          id: `menu-${slug(sub.name)}`,
          label: sub.name,
          path: sub.path,
          icon: iconForPath(sub.path, false),
          parent: parentId,
          section: section.title,
          // child inherits parent group unless it overrides
          group: sub.group ?? parentGroup,
          order: order++,
          roles: sub.requiredRolesAny ?? navItem.requiredRolesAny ?? section.roles,
          permission: sub.requiredAny?.[0] ?? navItem.requiredAny?.[0],
          badge: sub.badge,
        });
      });
    }
  }
  return items;
}

function slug(label: string): string {
  return label
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const seedMenuItems: MenuItem[] = buildSeed();

export const menuSectionOrder = ["Platform", "Club", "Member"] as const;
