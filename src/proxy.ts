import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "padelhub_session";

// Routes that never require auth.
const PUBLIC_PREFIXES = [
  "/signin",
  "/signup",
  "/landing",
  "/reset-password",
  "/error-404",
];

type Role = "superadmin" | "owner" | "staff" | "coach" | "member";

// Scope gates: a path prefix → roles allowed to enter it.
const SCOPE_RULES: { prefix: string; allow: Role[] }[] = [
  { prefix: "/platform", allow: ["superadmin"] },
  { prefix: "/me", allow: ["member"] },
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

function parseSessionRole(req: NextRequest): Role | null {
  const cookie = req.cookies.get(SESSION_COOKIE_NAME);
  if (!cookie) return null;
  try {
    const session = JSON.parse(cookie.value) as { role?: Role };
    return session.role ?? null;
  } catch {
    return null;
  }
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const role = parseSessionRole(req);

  // Not authenticated → redirect to sign-in.
  if (!role) {
    const url = req.nextUrl.clone();
    url.pathname = "/signin";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Authenticated but wrong scope → bounce to their home.
  for (const rule of SCOPE_RULES) {
    const inScope =
      pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`);
    if (inScope && !rule.allow.includes(role)) {
      const url = req.nextUrl.clone();
      url.pathname = role === "superadmin" ? "/platform" : role === "member" ? "/me" : "/";
      return NextResponse.redirect(url);
    }
  }

  // Members live ONLY inside the /me portal. Any other (non-public) route is a
  // staff/admin surface and must bounce them back to their portal home.
  if (role === "member") {
    const inPortal = pathname === "/me" || pathname.startsWith("/me/");
    if (!inPortal) {
      const url = req.nextUrl.clone();
      url.pathname = "/me";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

// Run on everything except Next internals, API routes and static assets.
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|images|.*\\.).*)"],
};
