"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Lucide from "lucide-react";
import { useSidebar } from "@/context/SidebarContext";
import { useRole } from "@/context/RoleContext";
import { useMenu } from "@/context/MenuContext";
import { useAccessControl } from "@/context/AccessControlContext";
import type { LucideIconName } from "@/data/padel/menus";
import Sidebar, {
  type SidebarGroup,
  type SidebarItem,
} from "@/components/ui/sidebar/Sidebar";
import type { MenuGroup } from "@/data/padel/menus";

// Resolve a stored lucide export name -> rendered icon. Unknown names fall back
// to Circle so a bad keyword never crashes the sidebar.
const renderIcon = (name: LucideIconName) => {
  const Cmp =
    ((Lucide as unknown as Record<string, React.ComponentType<{ className?: string }>>)[
      name
    ]) ?? Lucide.Circle;
  return <Cmp className="h-5 w-5" />;
};

// Sidebar bucket labels + render order: UTAMA → MASTER → LAINNYA.
const GROUP_ORDER: MenuGroup[] = ["main", "master", "others"];
const GROUP_LABEL: Record<MenuGroup, string> = {
  main: "UTAMA",
  master: "MASTER",
  others: "LAINNYA",
};

export const PadelHubLogo = ({ collapsed }: { collapsed?: boolean }) => (
  <Link href="/" className="flex items-center gap-2.5">
    <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-[0_10px_26px_rgba(109,91,255,0.4)]">
      {/* lime padel ball dot */}
      <span className="h-4 w-4 rounded-full bg-accent-300 shadow-[0_0_10px_rgba(198,255,61,0.7)]" />
    </span>
    {!collapsed && (
      <span className="text-xl font-extrabold leading-none text-gray-900 dark:text-white">
        Padel
        <span className="text-brand-500">Hub</span>
      </span>
    )}
  </Link>
);

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered, toggleMobileSidebar } =
    useSidebar();
  const { currentRole, hasAnyPermission } = useRole();
  const { getMenuTreeForRole } = useMenu();
  const { isMenuVisible } = useAccessControl();
  const pathname = usePathname();

  const isSidebarOpen = isExpanded || isHovered || isMobileOpen;
  const collapsed = !isSidebarOpen;

  const groups: SidebarGroup[] = useMemo(() => {
    const tree = getMenuTreeForRole(currentRole);

    // RBAC: a menu item is shown if visible for the role (AccessControl) AND
    // its permission (if any) is held.
    const canShow = (permission?: string, id?: string) => {
      if (id && !isMenuVisible(currentRole, id)) return false;
      if (!permission) return true;
      return hasAnyPermission([permission]);
    };

    const bucketed: Record<MenuGroup, SidebarItem[]> = {
      main: [],
      master: [],
      others: [],
    };

    for (const top of tree) {
      const children = top.children
        .filter((c) => canShow(c.permission, c.id))
        .map((c) => ({
          label: c.label,
          href: c.path || undefined,
          badge: c.badge,
        }));

      const hasChildren = top.children.length > 0;
      // group parent w/ children visible only if at least one child shows
      if (hasChildren && children.length === 0) continue;
      if (!hasChildren && !canShow(top.permission, top.id)) continue;

      const item: SidebarItem = {
        label: top.label,
        href: hasChildren ? undefined : top.path || undefined,
        icon: renderIcon(top.icon),
        badge: hasChildren ? undefined : top.badge,
        children: hasChildren ? children : undefined,
      };
      bucketed[top.group ?? "others"].push(item);
    }

    // Fixed order UTAMA → MASTER → LAINNYA; drop empty groups; only LAINNYA
    // is a collapsible accordion (rto-style).
    return GROUP_ORDER.filter((g) => bucketed[g].length > 0).map((g) => ({
      title: GROUP_LABEL[g],
      items: bucketed[g],
      collapsible: g === "others",
      defaultOpen: false,
    }));
  }, [currentRole, getMenuTreeForRole, isMenuVisible, hasAnyPermission]);

  return (
    <div
      className={`admin-sidebar fixed left-0 top-0 z-50 mt-16 h-screen transition-all duration-300 ease-in-out lg:mt-0 ${
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      } lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Sidebar
        className={`h-full border-r border-[var(--border-default)] ${
          isSidebarOpen ? "w-[290px]" : "w-[90px]"
        }`}
        groups={groups}
        activePath={pathname}
        collapsed={collapsed}
        logo={<PadelHubLogo collapsed={collapsed} />}
        onNavigate={() => {
          if (isMobileOpen) toggleMobileSidebar();
        }}
      />
    </div>
  );
};

export default AppSidebar;
