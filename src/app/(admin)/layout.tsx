"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSidebar } from "@/context/SidebarContext";
import { useRole } from "@/context/RoleContext";
import { useAccess } from "@/context/AccessContext";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import { ShieldIcon } from "@/icons/gym-icons";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const { currentRole, isAuthenticated, isSessionReady } = useRole();
  const { isReady: accessReady, canViewPath, menuForPath } = useAccess();
  const pathname = usePathname();
  const router = useRouter();

  React.useEffect(() => {
    if (isSessionReady && !isAuthenticated) {
      router.replace(`/signin?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isSessionReady, isAuthenticated, pathname, router]);

  if (!isSessionReady) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8 dark:bg-gray-950">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center justify-center">
          <div className="w-full rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="mx-auto h-12 w-12 animate-pulse rounded-xl bg-brand-50 dark:bg-brand-500/10" />
            <div className="mx-auto mt-5 h-5 w-40 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            <div className="mx-auto mt-3 h-3 w-56 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
          </div>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    // Middleware also enforces this; render nothing while redirecting.
    return null;
  }

  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
    ? "lg:ml-[290px]"
    : "lg:ml-[90px]";

  // Resolve the menu that owns this path + whether the role may view it.
  const ownerMenu = menuForPath(pathname);
  const isAccessDenied = accessReady && !canViewPath(pathname);

  return (
    <div className="min-h-screen xl:flex">
      <AppSidebar />
      <Backdrop />
      <div
        className={`admin-main-content flex-1 transition-all duration-300 ease-in-out ${mainContentMargin}`}
      >
        <AppHeader />
        <div className="admin-page-content mx-auto max-w-(--breakpoint-2xl) p-4 md:p-6">
          {isAccessDenied ? (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
                <ShieldIcon className="h-7 w-7" />
              </div>
              <h1 className="mt-5 text-xl font-semibold text-gray-900 dark:text-white">
                Access Denied
              </h1>
              <p className="mx-auto mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
                Your current role ({currentRole}) does not have permission to
                open {ownerMenu ? `"${ownerMenu.label}"` : "this page"}.
              </p>
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
}
