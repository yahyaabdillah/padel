"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { currentClub, type CurrentClub } from "@/data/padel/tenant";

/* ════════════════════════════════════════════════════════
 * Roles
 * ════════════════════════════════════════════════════════ */
export type UserRole = "superadmin" | "owner" | "staff" | "coach" | "member";

export const ALL_ROLES: UserRole[] = [
  "superadmin",
  "owner",
  "staff",
  "coach",
  "member",
];

export const roleLabels: Record<UserRole, string> = {
  superadmin: "Super Admin",
  owner: "Club Owner",
  staff: "Front Desk Staff",
  coach: "Coach",
  member: "Member",
};

export const roleScope: Record<UserRole, "platform" | "club" | "member"> = {
  superadmin: "platform",
  owner: "club",
  staff: "club",
  coach: "club",
  member: "member",
};

/* ════════════════════════════════════════════════════════
 * Permission catalog (string keys grouped by domain)
 * ════════════════════════════════════════════════════════ */
export interface PermissionDef {
  key: string;
  label: string;
  group: string;
}

export const permissionCatalog: PermissionDef[] = [
  // Platform
  { key: "platform.view", label: "View platform dashboard", group: "Platform" },
  { key: "platform.settings", label: "Manage platform settings", group: "Platform" },
  { key: "tenants.view", label: "View tenants", group: "Platform" },
  { key: "tenants.manage", label: "Manage tenants", group: "Platform" },
  { key: "plans.view", label: "View plans", group: "Platform" },
  { key: "plans.manage", label: "Manage plans", group: "Platform" },
  { key: "billing.view", label: "View billing & invoices", group: "Platform" },
  { key: "access.manage", label: "Manage RBAC / access control", group: "Platform" },
  { key: "menu.manage", label: "Manage menu builder", group: "Platform" },
  { key: "form.manage", label: "Manage form builder", group: "Platform" },
  { key: "flags.manage", label: "Manage feature flags", group: "Platform" },
  // Club — dashboard & ops
  { key: "dashboard.view", label: "View club dashboard", group: "Club" },
  { key: "booking.view", label: "View bookings", group: "Bookings" },
  { key: "booking.create", label: "Create bookings", group: "Bookings" },
  { key: "booking.cancel", label: "Cancel bookings", group: "Bookings" },
  { key: "courts.view", label: "View courts", group: "Courts" },
  { key: "courts.manage", label: "Manage courts & pricing", group: "Courts" },
  { key: "members.view", label: "View members", group: "Members" },
  { key: "members.create", label: "Create members", group: "Members" },
  { key: "members.edit", label: "Edit members", group: "Members" },
  { key: "coaching.view", label: "View coaching", group: "Coaching" },
  { key: "coaching.manage", label: "Manage coaching", group: "Coaching" },
  { key: "matches.view", label: "View matches & open play", group: "Matches" },
  { key: "matches.manage", label: "Manage matches & scoring", group: "Matches" },
  { key: "pos.view", label: "Use POS", group: "POS" },
  { key: "pos.create", label: "Create POS sale", group: "POS" },
  { key: "finance.view", label: "View finance", group: "Finance" },
  { key: "finance.export", label: "Export finance reports", group: "Finance" },
  { key: "marketing.view", label: "View marketing", group: "Marketing" },
  { key: "marketing.manage", label: "Manage marketing", group: "Marketing" },
  { key: "settings.view", label: "View club settings", group: "Settings" },
  { key: "settings.manage", label: "Manage club settings", group: "Settings" },
  { key: "staff.manage", label: "Manage staff & roles", group: "Settings" },
  // Member portal
  { key: "me.view", label: "View own portal", group: "Member" },
  { key: "me.book", label: "Book a court", group: "Member" },
  { key: "me.matches", label: "Join open play", group: "Member" },
  { key: "me.membership", label: "View membership & wallet", group: "Member" },
  { key: "me.payments", label: "View payments", group: "Member" },
];

export const allPermissionKeys: string[] = permissionCatalog.map((p) => p.key);

/* ════════════════════════════════════════════════════════
 * Default role -> permission map
 * ════════════════════════════════════════════════════════ */
const superadminPermissions = ["*"];
const ownerPermissions = ["*"]; // full club scope

const staffPermissions = [
  "dashboard.view",
  "booking.view",
  "booking.create",
  "booking.cancel",
  "courts.view",
  "members.view",
  "members.create",
  "members.edit",
  "coaching.view",
  "matches.view",
  "pos.view",
  "pos.create",
  "marketing.view",
];

const coachPermissions = [
  "dashboard.view",
  "booking.view",
  "coaching.view",
  "coaching.manage",
  "matches.view",
  "matches.manage",
  "members.view",
];

const memberPermissions = [
  "me.view",
  "me.book",
  "me.matches",
  "me.membership",
  "me.payments",
];

export const defaultPermissionsByRole: Record<UserRole, string[]> = {
  superadmin: superadminPermissions,
  owner: ownerPermissions,
  staff: staffPermissions,
  coach: coachPermissions,
  member: memberPermissions,
};

/* ════════════════════════════════════════════════════════
 * Mock users — one per role
 * ════════════════════════════════════════════════════════ */
export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: UserRole;
  phone?: string;
  /** tenant/club this user belongs to (superadmin = platform-wide) */
  tenantId?: string;
  membershipTier?: string;
  walletBalance?: number;
}

export const mockLoginUsers: User[] = [
  {
    id: "superadmin-001",
    name: "Nadia Platform",
    email: "ops@padelhub.io",
    avatar: "/images/user/user-01.jpg",
    role: "superadmin",
    phone: "+62 811 0000 0001",
  },
  {
    id: "owner-001",
    name: "Raka Pradana",
    email: "owner@smashcourt.id",
    avatar: "/images/user/owner.jpg",
    role: "owner",
    phone: "+62 811 7777 0001",
    tenantId: "tenant-smash",
  },
  {
    id: "staff-001",
    name: "Budi Santoso",
    email: "frontdesk@smashcourt.id",
    avatar: "/images/user/user-02.jpg",
    role: "staff",
    phone: "+62 812 3456 7890",
    tenantId: "tenant-smash",
  },
  {
    id: "coach-001",
    name: "Dimas Pratama",
    email: "dimas@smashcourt.id",
    avatar: "/images/user/user-03.jpg",
    role: "coach",
    phone: "+62 815 9876 5432",
    tenantId: "tenant-smash",
  },
  {
    id: "member-001",
    name: "Andi Wijaya",
    email: "andi@email.com",
    avatar: "/images/user/user-04.jpg",
    role: "member",
    phone: "+62 813 1234 5678",
    tenantId: "tenant-smash",
    membershipTier: "Pro",
    walletBalance: 350_000,
  },
];

export const mockUsers = mockLoginUsers.reduce<Record<string, User>>(
  (acc, u) => ({ ...acc, [u.id]: u }),
  {},
);

export const userForRole = (role: UserRole): User =>
  mockLoginUsers.find((u) => u.role === role) ?? mockLoginUsers[0];

const defaultUser = mockLoginUsers[1]; // owner — most common demo entry

const storageKeys = {
  userId: "padelhub-session-user-id",
  token: "padelhub-session-token",
};

/* ════════════════════════════════════════════════════════
 * Context
 * ════════════════════════════════════════════════════════ */
type RoleContextType = {
  currentRole: UserRole;
  currentUser: User;
  currentRoleLabel: string;
  /** scope: platform | club | member */
  scope: "platform" | "club" | "member";
  permissions: string[];
  isAuthenticated: boolean;
  isSessionReady: boolean;
  sessionToken: string | null;
  /** the club the current (club/member) user operates within */
  club: CurrentClub;
  tenantId?: string;
  loginAsUser: (userId: string) => void;
  /** login by role — picks the canonical mock user for that role */
  loginAsRole: (role: UserRole) => void;
  logout: () => void;
  refreshSession: () => void;
  /** allow an AccessControl-provided permission set to override defaults */
  setPermissionResolver: (resolver: (role: UserRole) => string[]) => void;
  hasPermission: (permission?: string) => boolean;
  hasAnyPermission: (required?: string[]) => boolean;
  hasRole: (roles?: UserRole[]) => boolean;
  isSuperAdmin: boolean;
  isOwner: boolean;
  isStaff: boolean;
  isCoach: boolean;
  isMember: boolean;
};

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const useRole = () => {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within a RoleProvider");
  return ctx;
};

export const RoleProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  // Permission resolver — defaults to the static map; AccessControlContext can
  // inject an editable resolver so RBAC edits flow through to gating.
  type Resolver = (role: UserRole) => string[];
  const [permissionResolver, setPermissionResolverState] = useState<Resolver>(
    () => (role: UserRole) => defaultPermissionsByRole[role] ?? [],
  );

  useEffect(() => {
    const id = window.setTimeout(() => {
      const storedUserId = window.localStorage.getItem(storageKeys.userId);
      const storedToken = window.localStorage.getItem(storageKeys.token);
      const storedUser = storedUserId ? mockUsers[storedUserId] : undefined;
      if (storedUser && storedToken) {
        setSessionUserId(storedUser.id);
        setSessionToken(storedToken);
      }
      setIsSessionReady(true);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const isAuthenticated = Boolean(sessionUserId && sessionToken);
  const currentUser = sessionUserId
    ? mockUsers[sessionUserId] ?? defaultUser
    : defaultUser;
  const currentRole = currentUser.role;

  const permissions = useMemo(
    () => (isAuthenticated ? permissionResolver(currentRole) : []),
    [currentRole, isAuthenticated, permissionResolver],
  );

  const loginAsUser = useCallback((userId: string) => {
    const next = mockUsers[userId];
    if (!next) return;
    const token = `padelhub-${next.id}-${Date.now()}`;
    setSessionUserId(next.id);
    setSessionToken(token);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKeys.userId, next.id);
      window.localStorage.setItem(storageKeys.token, token);
    }
  }, []);

  const loginAsRole = useCallback(
    (role: UserRole) => loginAsUser(userForRole(role).id),
    [loginAsUser],
  );

  const logout = useCallback(() => {
    setSessionUserId(null);
    setSessionToken(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(storageKeys.userId);
      window.localStorage.removeItem(storageKeys.token);
    }
  }, []);

  const refreshSession = useCallback(() => {
    if (!sessionUserId) return;
    const token = `padelhub-${sessionUserId}-${Date.now()}`;
    setSessionToken(token);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKeys.token, token);
    }
  }, [sessionUserId]);

  const setPermissionResolver = useCallback(
    (resolver: (role: UserRole) => string[]) => {
      setPermissionResolverState(() => resolver);
    },
    [],
  );

  const hasPermission = useCallback(
    (permission?: string) => {
      if (!isAuthenticated) return false;
      if (!permission) return true;
      if (permissions.includes("*")) return true;
      return permissions.includes(permission);
    },
    [isAuthenticated, permissions],
  );

  const hasAnyPermission = useCallback(
    (required?: string[]) => {
      if (!isAuthenticated) return false;
      if (!required || required.length === 0) return true;
      if (permissions.includes("*")) return true;
      return required.some((p) => permissions.includes(p));
    },
    [isAuthenticated, permissions],
  );

  const hasRole = useCallback(
    (roles?: UserRole[]) => {
      if (!isAuthenticated) return false;
      if (!roles || roles.length === 0) return true;
      return roles.includes(currentRole);
    },
    [currentRole, isAuthenticated],
  );

  const value = useMemo<RoleContextType>(
    () => ({
      currentRole,
      currentUser,
      currentRoleLabel: roleLabels[currentRole],
      scope: roleScope[currentRole],
      permissions,
      isAuthenticated,
      isSessionReady,
      sessionToken,
      club: currentClub,
      tenantId: currentUser.tenantId,
      loginAsUser,
      loginAsRole,
      logout,
      refreshSession,
      setPermissionResolver,
      hasPermission,
      hasAnyPermission,
      hasRole,
      isSuperAdmin: currentRole === "superadmin",
      isOwner: currentRole === "owner",
      isStaff: currentRole === "staff",
      isCoach: currentRole === "coach",
      isMember: currentRole === "member",
    }),
    [
      currentRole,
      currentUser,
      permissions,
      isAuthenticated,
      isSessionReady,
      sessionToken,
      loginAsUser,
      loginAsRole,
      logout,
      refreshSession,
      setPermissionResolver,
      hasPermission,
      hasAnyPermission,
      hasRole,
    ],
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
};
