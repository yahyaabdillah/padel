"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRole } from "@/context/RoleContext";
import ClubDashboard from "@/components/club-core/ClubDashboard";

/**
 * RoleHome guard for the root route "/".
 *
 * - superadmin -> /platform
 * - member     -> /me
 * - club roles (owner/staff/coach) STAY on "/" and see the club dashboard.
 */
export default function RoleHome() {
  const { currentRole, isSessionReady, isAuthenticated } = useRole();
  const router = useRouter();

  useEffect(() => {
    if (!isSessionReady || !isAuthenticated) return;
    if (currentRole === "superadmin") router.replace("/platform");
    else if (currentRole === "member") router.replace("/me");
  }, [currentRole, isSessionReady, isAuthenticated, router]);

  if (currentRole === "superadmin" || currentRole === "member") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-200 border-t-brand-500" />
      </div>
    );
  }

  return <ClubDashboard />;
}
