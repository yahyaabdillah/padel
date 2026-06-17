"use client";

// PadelHub — DB-backed access context. Loads the current session's effective
// menus + per-menu action grants (view/create/update/delete/cancel/import/
// export) from the master DB and exposes:
//   • menus       — the visible menu tree for the sidebar
//   • can(key, a) — gate a page action by menu key + action
// Only the Super Admin bypasses the matrix (full access); every other role —
// Owner included — is governed by its grants.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getEffectiveAccessAction,
  type EffectiveMenu,
} from "@/app/(admin)/access/actions";
import type { MenuAction } from "@/data/padel/menu-catalog";

type AccessContextType = {
  isReady: boolean;
  isSuper: boolean;
  /** ALL active menus with this role's flags (canView may be false) */
  menus: EffectiveMenu[];
  /** check a granular action for a menu key */
  can: (menuKey: string, action: MenuAction) => boolean;
  /** convenience: any view access to a menu key */
  canView: (menuKey: string) => boolean;
  /** resolve the menu that owns a route path (longest match) */
  menuForPath: (path: string) => EffectiveMenu | null;
  /** can the current role view the page that owns this path (true if no menu owns it) */
  canViewPath: (path: string) => boolean;
  refresh: () => Promise<void>;
};

const AccessContext = createContext<AccessContextType | undefined>(undefined);

export const useAccess = () => {
  const ctx = useContext(AccessContext);
  if (!ctx) throw new Error("useAccess must be used within an AccessProvider");
  return ctx;
};

const actionFlag: Record<MenuAction, keyof EffectiveMenu> = {
  view: "canView",
  create: "canCreate",
  update: "canUpdate",
  delete: "canDelete",
  cancel: "canCancel",
  import: "canImport",
  export: "canExport",
};

export const AccessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [menus, setMenus] = useState<EffectiveMenu[]>([]);
  const [isSuper, setIsSuper] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getEffectiveAccessAction();
      setMenus(res.menus);
      setIsSuper(res.isSuper);
    } catch {
      setMenus([]);
      setIsSuper(false);
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const byKey = useMemo(
    () => new Map(menus.map((m) => [m.key, m])),
    [menus],
  );

  const can = useCallback(
    (menuKey: string, action: MenuAction) => {
      if (isSuper) return true;
      const m = byKey.get(menuKey);
      if (!m) return false;
      return Boolean(m[actionFlag[action]]);
    },
    [byKey, isSuper],
  );

  const canView = useCallback((menuKey: string) => can(menuKey, "view"), [can]);

  // resolve the menu owning a path by longest-prefix match (ignores group parents)
  const menuForPath = useCallback(
    (path: string): EffectiveMenu | null => {
      const matches = menus
        .filter(
          (m) =>
            m.path &&
            (m.path === path || (m.path !== "/" && path.startsWith(`${m.path}/`))),
        )
        .sort((a, b) => b.path.length - a.path.length);
      return matches[0] ?? null;
    },
    [menus],
  );

  const canViewPath = useCallback(
    (path: string): boolean => {
      if (isSuper) return true;
      const owner = menuForPath(path);
      // pages not represented in the menu catalog are not gated here
      if (!owner) return true;
      return owner.canView;
    },
    [isSuper, menuForPath],
  );

  const value = useMemo<AccessContextType>(
    () => ({ isReady, isSuper, menus, can, canView, menuForPath, canViewPath, refresh: load }),
    [isReady, isSuper, menus, can, canView, menuForPath, canViewPath, load],
  );

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
};
