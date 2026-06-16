"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { UserRole } from "@/context/RoleContext";
import { seedMenuItems, type MenuItem } from "@/data/padel/menus";

/* Dynamic menu store. Seeded from the static nav config, editable via the
 * platform Menu Builder, persisted to localStorage. The sidebar renders from
 * getMenusForRole() (further filtered by AccessControl + permissions). */

// Bumped to v6 to force a reseed: parent/group menu icons now use distinct
// lucide names (Booking & Check-in, Manage Member, Coaching, Finance,
// Marketing, Master) instead of the generic "List" fallback.
const STORAGE_KEY = "padelhub-menu-items-v14";

export interface MenuTree extends MenuItem {
  children: MenuItem[];
}

type MenuContextType = {
  items: MenuItem[];
  isReady: boolean;
  /** flat items visible to a role (top-level + children), unsorted-by-tree */
  getMenusForRole: (role: UserRole) => MenuItem[];
  /** nested tree (top-level with children) for a role */
  getMenuTreeForRole: (role: UserRole) => MenuTree[];
  addMenu: (
    item: Omit<MenuItem, "id" | "order" | "group"> &
      Partial<Pick<MenuItem, "id" | "order" | "group">>,
  ) => MenuItem;
  updateMenu: (id: string, patch: Partial<Omit<MenuItem, "id">>) => void;
  deleteMenu: (id: string) => void;
  /** reorder within a parent group given the new ordered list of ids */
  reorder: (parentId: string | null, orderedIds: string[]) => void;
  resetMenus: () => void;
};

const MenuContext = createContext<MenuContextType | undefined>(undefined);

export const useMenu = () => {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error("useMenu must be used within a MenuProvider");
  return ctx;
};

const genId = () =>
  `menu-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export const MenuProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [items, setItems] = useState<MenuItem[]>(() => [...seedMenuItems]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as MenuItem[];
        if (Array.isArray(parsed) && parsed.length) setItems(parsed);
      }
    } catch {
      /* ignore */
    }
    setIsReady(true);
  }, []);

  const persist = useCallback((next: MenuItem[]) => {
    if (typeof window !== "undefined")
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const commit = useCallback(
    (updater: (prev: MenuItem[]) => MenuItem[]) => {
      setItems((prev) => {
        const next = updater(prev);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const addMenu = useCallback<MenuContextType["addMenu"]>(
    (item) => {
      const siblings = items.filter((m) => m.parent === (item.parent ?? null));
      const created: MenuItem = {
        id: item.id ?? genId(),
        label: item.label,
        path: item.path,
        icon: item.icon,
        parent: item.parent ?? null,
        section: item.section,
        group: item.group ?? "others",
        order:
          item.order ??
          (siblings.length
            ? Math.max(...siblings.map((s) => s.order)) + 1
            : 0),
        roles: item.roles,
        permission: item.permission,
        badge: item.badge,
      };
      commit((prev) => [...prev, created]);
      return created;
    },
    [commit, items],
  );

  const updateMenu = useCallback(
    (id: string, patch: Partial<Omit<MenuItem, "id">>) => {
      commit((prev) =>
        prev.map((m) => (m.id === id ? { ...m, ...patch } : m)),
      );
    },
    [commit],
  );

  const deleteMenu = useCallback(
    (id: string) => {
      // remove the item and any of its children
      commit((prev) => prev.filter((m) => m.id !== id && m.parent !== id));
    },
    [commit],
  );

  const reorder = useCallback(
    (parentId: string | null, orderedIds: string[]) => {
      commit((prev) =>
        prev.map((m) => {
          if (m.parent !== parentId) return m;
          const idx = orderedIds.indexOf(m.id);
          return idx === -1 ? m : { ...m, order: idx };
        }),
      );
    },
    [commit],
  );

  const resetMenus = useCallback(() => {
    const next = [...seedMenuItems];
    setItems(next);
    persist(next);
  }, [persist]);

  const getMenusForRole = useCallback(
    (role: UserRole) =>
      items
        .filter((m) => m.roles.includes(role))
        .sort((a, b) => a.order - b.order),
    [items],
  );

  const getMenuTreeForRole = useCallback(
    (role: UserRole): MenuTree[] => {
      const visible = items.filter((m) => m.roles.includes(role));
      const tops = visible
        .filter((m) => m.parent === null)
        .sort((a, b) => a.order - b.order);
      return tops.map((top) => ({
        ...top,
        children: visible
          .filter((m) => m.parent === top.id)
          .sort((a, b) => a.order - b.order),
      }));
    },
    [items],
  );

  const value = useMemo<MenuContextType>(
    () => ({
      items,
      isReady,
      getMenusForRole,
      getMenuTreeForRole,
      addMenu,
      updateMenu,
      deleteMenu,
      reorder,
      resetMenus,
    }),
    [
      items,
      isReady,
      getMenusForRole,
      getMenuTreeForRole,
      addMenu,
      updateMenu,
      deleteMenu,
      reorder,
      resetMenus,
    ],
  );

  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>;
};
