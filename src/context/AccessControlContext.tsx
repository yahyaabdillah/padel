"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ALL_ROLES,
  defaultPermissionsByRole,
  useRole,
  type UserRole,
} from "@/context/RoleContext";
import { seedMenuItems } from "@/data/padel/menus";

/* Role -> permission map and role -> menu (item id) visibility map.
 * Both are seeded from defaults and editable via the platform Access Control
 * screen; persisted to localStorage. The resolved permission map is injected
 * back into RoleContext so RBAC edits gate the live UI. */

type RolePermMap = Record<UserRole, string[]>;
type RoleMenuMap = Record<UserRole, string[]>;

const STORAGE_KEY_PERMS = "padelhub-rbac-role-perms";
const STORAGE_KEY_MENUS = "padelhub-rbac-role-menus-v6";

function buildDefaultPermMap(): RolePermMap {
  return ALL_ROLES.reduce((acc, role) => {
    acc[role] = [...(defaultPermissionsByRole[role] ?? [])];
    return acc;
  }, {} as RolePermMap);
}

// By default every role can see every seeded menu item it is tagged for.
function buildDefaultMenuMap(): RoleMenuMap {
  return ALL_ROLES.reduce((acc, role) => {
    acc[role] = seedMenuItems
      .filter((m) => m.roles.includes(role))
      .map((m) => m.id);
    return acc;
  }, {} as RoleMenuMap);
}

type AccessControlContextType = {
  rolePerms: RolePermMap;
  roleMenus: RoleMenuMap;
  getRolePerms: (role: UserRole) => string[];
  /** grant/revoke a single permission for a role */
  setRolePerm: (role: UserRole, permission: string, enabled: boolean) => void;
  /** replace the full permission set for a role */
  setRolePermsBulk: (role: UserRole, permissions: string[]) => void;
  getRoleMenus: (role: UserRole) => string[];
  /** show/hide a single menu item for a role */
  setRoleMenu: (role: UserRole, menuId: string, visible: boolean) => void;
  /** is a menu item visible for a role */
  isMenuVisible: (role: UserRole, menuId: string) => boolean;
  resetDefaults: () => void;
  isReady: boolean;
};

const AccessControlContext = createContext<AccessControlContextType | undefined>(
  undefined,
);

export const useAccessControl = () => {
  const ctx = useContext(AccessControlContext);
  if (!ctx)
    throw new Error("useAccessControl must be used within AccessControlProvider");
  return ctx;
};

export const AccessControlProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { setPermissionResolver } = useRole();
  const [rolePerms, setRolePerms] = useState<RolePermMap>(buildDefaultPermMap);
  const [roleMenus, setRoleMenus] = useState<RoleMenuMap>(buildDefaultMenuMap);
  const [isReady, setIsReady] = useState(false);

  // hydrate from localStorage
  useEffect(() => {
    try {
      const rawPerms = window.localStorage.getItem(STORAGE_KEY_PERMS);
      if (rawPerms) {
        const parsed = JSON.parse(rawPerms) as Partial<RolePermMap>;
        setRolePerms((prev) => ({ ...prev, ...parsed }));
      }
      const rawMenus = window.localStorage.getItem(STORAGE_KEY_MENUS);
      if (rawMenus) {
        const parsed = JSON.parse(rawMenus) as Partial<RoleMenuMap>;
        setRoleMenus((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      /* ignore corrupt state */
    }
    setIsReady(true);
  }, []);

  const persistPerms = useCallback((next: RolePermMap) => {
    if (typeof window !== "undefined")
      window.localStorage.setItem(STORAGE_KEY_PERMS, JSON.stringify(next));
  }, []);

  const persistMenus = useCallback((next: RoleMenuMap) => {
    if (typeof window !== "undefined")
      window.localStorage.setItem(STORAGE_KEY_MENUS, JSON.stringify(next));
  }, []);

  // Feed the live permission resolver into RoleContext.
  useEffect(() => {
    setPermissionResolver((role: UserRole) => rolePerms[role] ?? []);
  }, [rolePerms, setPermissionResolver]);

  const getRolePerms = useCallback(
    (role: UserRole) => rolePerms[role] ?? [],
    [rolePerms],
  );

  const setRolePerm = useCallback(
    (role: UserRole, permission: string, enabled: boolean) => {
      setRolePerms((prev) => {
        const current = new Set(prev[role] ?? []);
        if (enabled) current.add(permission);
        else current.delete(permission);
        const next = { ...prev, [role]: Array.from(current) };
        persistPerms(next);
        return next;
      });
    },
    [persistPerms],
  );

  const setRolePermsBulk = useCallback(
    (role: UserRole, permissions: string[]) => {
      setRolePerms((prev) => {
        const next = { ...prev, [role]: Array.from(new Set(permissions)) };
        persistPerms(next);
        return next;
      });
    },
    [persistPerms],
  );

  const getRoleMenus = useCallback(
    (role: UserRole) => roleMenus[role] ?? [],
    [roleMenus],
  );

  const setRoleMenu = useCallback(
    (role: UserRole, menuId: string, visible: boolean) => {
      setRoleMenus((prev) => {
        const current = new Set(prev[role] ?? []);
        if (visible) current.add(menuId);
        else current.delete(menuId);
        const next = { ...prev, [role]: Array.from(current) };
        persistMenus(next);
        return next;
      });
    },
    [persistMenus],
  );

  const isMenuVisible = useCallback(
    (role: UserRole, menuId: string) => (roleMenus[role] ?? []).includes(menuId),
    [roleMenus],
  );

  const resetDefaults = useCallback(() => {
    const perms = buildDefaultPermMap();
    const menus = buildDefaultMenuMap();
    setRolePerms(perms);
    setRoleMenus(menus);
    persistPerms(perms);
    persistMenus(menus);
  }, [persistPerms, persistMenus]);

  const value = useMemo<AccessControlContextType>(
    () => ({
      rolePerms,
      roleMenus,
      getRolePerms,
      setRolePerm,
      setRolePermsBulk,
      getRoleMenus,
      setRoleMenu,
      isMenuVisible,
      resetDefaults,
      isReady,
    }),
    [
      rolePerms,
      roleMenus,
      getRolePerms,
      setRolePerm,
      setRolePermsBulk,
      getRoleMenus,
      setRoleMenu,
      isMenuVisible,
      resetDefaults,
      isReady,
    ],
  );

  return (
    <AccessControlContext.Provider value={value}>
      {children}
    </AccessControlContext.Provider>
  );
};
