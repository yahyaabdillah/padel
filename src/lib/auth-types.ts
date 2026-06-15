// Shared auth types + role→dashboard routing.

export type UserRole = "superadmin" | "owner" | "staff" | "coach" | "member";

export const ALL_ROLE_KEYS: UserRole[] = [
  "superadmin",
  "owner",
  "staff",
  "coach",
  "member",
];

export interface AuthSession {
  companyId: string;
  userId: string; // login username
  role: UserRole;
  displayName: string;
  id: string; // tenant m_user.id
  email?: string;
  photo?: string;
  level: number;
  version: string;
  /** Tenant DB connection carried for runtime tenant queries (custom mode). */
  dbConfig?: {
    host: string;
    port?: number;
    name: string;
    username: string;
    password: string;
  };
}

/** Normalize an arbitrary stored role label to a canonical UserRole. */
export function normalizeRole(raw?: string | null): UserRole | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase().replace(/\s+/g, "");
  return (ALL_ROLE_KEYS as string[]).includes(key) ? (key as UserRole) : null;
}

/** Landing path for a role after login. */
export function getRoleDashboardPath(role: UserRole): string {
  switch (role) {
    case "superadmin":
      return "/platform";
    case "member":
      return "/me";
    case "owner":
    case "staff":
    case "coach":
    default:
      return "/";
  }
}
