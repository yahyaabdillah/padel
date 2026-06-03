"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";
import NotificationDropdown from "@/components/header/NotificationDropdown";
import { useSidebar } from "@/context/SidebarContext";
import {
  mockLoginUsers,
  roleLabels,
  useRole,
  type UserRole,
} from "@/context/RoleContext";

const roleTone: Record<UserRole, string> = {
  superadmin: "bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300",
  owner: "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300",
  staff: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  coach: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
  member: "bg-accent-100 text-accent-800 dark:bg-accent-300/20 dark:text-accent-300",
};

const roleDot: Record<UserRole, string> = {
  superadmin: "bg-brand-500",
  owner: "bg-teal-500",
  staff: "bg-amber-500",
  coach: "bg-rose-500",
  member: "bg-accent-400",
};

const landingForRole = (role: UserRole) =>
  role === "superadmin" ? "/platform" : role === "member" ? "/me" : "/";

const RoleSwitcher: React.FC = () => {
  const { currentRole, currentUser, loginAsUser, logout, refreshSession } =
    useRole();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white/80 px-3 py-2 text-sm font-medium text-gray-700 shadow-theme-xs transition-colors hover:border-brand-200 hover:bg-brand-50/80 dark:border-brand-500/15 dark:bg-white/[0.04] dark:text-gray-300 dark:hover:border-brand-500/30 dark:hover:bg-brand-500/10"
      >
        <span className="relative">
          <Image
            src={currentUser.avatar}
            alt={currentUser.name}
            width={32}
            height={32}
            className="rounded-full"
          />
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-gray-800 ${roleDot[currentRole]}`}
          />
        </span>
        <span className="hidden text-left md:block">
          <span className="block text-sm font-medium text-gray-900 dark:text-white">
            {currentUser.name}
          </span>
          <span className="block text-xs text-gray-500 dark:text-gray-400">
            {roleLabels[currentRole]}
          </span>
        </span>
        <svg
          className="h-4 w-4 text-brand-600 dark:text-brand-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 9l4-4 4 4m0 6l-4 4-4-4"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[340px] rounded-xl border border-brand-100 bg-white shadow-theme-lg dark:border-brand-500/15 dark:bg-[#0b1117]">
          <div className="border-b border-gray-200 p-4 dark:border-gray-800">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Dummy session
            </p>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Switch role to preview menus & permissions.
            </p>
          </div>
          <div className="max-h-[320px] overflow-y-auto p-2 custom-scrollbar">
            {mockLoginUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => {
                  loginAsUser(user.id);
                  setOpen(false);
                  router.push(landingForRole(user.role));
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors ${
                  currentUser.id === user.id
                    ? roleTone[user.role]
                    : "hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                <span className="relative">
                  <Image
                    src={user.avatar}
                    alt={user.name}
                    width={34}
                    height={34}
                    className="rounded-full"
                  />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-gray-900 ${roleDot[user.role]}`}
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-gray-900 dark:text-white">
                    {user.name}
                  </span>
                  <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
                    {roleLabels[user.role]}
                  </span>
                </span>
              </button>
            ))}
          </div>
          <div className="flex gap-2 border-t border-gray-200 p-3 dark:border-gray-800">
            <button
              onClick={refreshSession}
              className="flex-1 rounded-lg border border-brand-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-brand-50 dark:border-brand-500/20 dark:text-gray-300 dark:hover:bg-brand-500/10"
            >
              Refresh token
            </button>
            <button
              onClick={logout}
              className="flex-1 rounded-lg bg-gradient-to-r from-brand-600 to-brand-500 px-3 py-2 text-sm font-medium text-white shadow-[0_10px_24px_rgba(109,91,255,0.3)] hover:from-brand-700 hover:to-brand-600"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const AppHeader: React.FC = () => {
  const [isApplicationMenuOpen, setApplicationMenuOpen] = useState(false);
  const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();
  const { currentRole } = useRole();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleToggle = () => {
    if (window.innerWidth >= 1024) toggleSidebar();
    else toggleMobileSidebar();
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <header className="admin-header sticky top-0 z-99999 flex w-full border-gray-200 bg-white/90 backdrop-blur-xl dark:border-slate-700/70 dark:bg-[#0f172a]/95 lg:border-b">
      <div className="flex grow flex-col items-center justify-between lg:flex-row lg:px-6">
        <div className="flex w-full items-center justify-between gap-2 border-b border-gray-200 px-3 py-3 dark:border-gray-800 sm:gap-4 lg:justify-normal lg:border-b-0 lg:px-0 lg:py-4">
          <button
            className="z-99999 h-10 w-10 items-center justify-center rounded-lg border-gray-200 text-gray-500 transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 dark:border-brand-500/15 dark:text-gray-400 dark:hover:border-brand-500/30 dark:hover:bg-brand-500/10 dark:hover:text-brand-300 lg:flex lg:h-11 lg:w-11 lg:border"
            onClick={handleToggle}
            aria-label="Toggle Sidebar"
          >
            {isMobileOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M6.22 7.28a.75.75 0 011.06-1.06L12 10.94l4.72-4.72a.75.75 0 111.06 1.06L13.06 12l4.72 4.72a.75.75 0 11-1.06 1.06L12 13.06l-4.72 4.72a.75.75 0 01-1.06-1.06L10.94 12 6.22 7.28z"
                  fill="currentColor"
                />
              </svg>
            ) : (
              <svg width="20" height="14" viewBox="0 0 20 14" fill="none">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M1 1a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H1.75A.75.75 0 011 1zm0 6a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H1.75A.75.75 0 011 7zm.75 5.25a.75.75 0 000 1.5h9a.75.75 0 000-1.5h-9z"
                  fill="currentColor"
                />
              </svg>
            )}
          </button>

          <Link href="/" className="lg:hidden">
            <span className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 shadow-[0_10px_24px_rgba(109,91,255,0.32)]">
                <span className="h-3 w-3 rounded-full bg-accent-300" />
              </span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                Padel<span className="text-brand-500">Hub</span>
              </span>
            </span>
          </Link>

          <button
            onClick={() => setApplicationMenuOpen((v) => !v)}
            className="z-99999 flex h-10 w-10 items-center justify-center rounded-lg text-gray-700 hover:bg-brand-50 hover:text-brand-700 dark:text-gray-400 dark:hover:bg-brand-500/10 dark:hover:text-brand-300 lg:hidden"
            aria-label="Toggle menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="6" cy="12" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="18" cy="12" r="1.5" />
            </svg>
          </button>

          <div className="hidden lg:block">
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">
                <svg
                  className="fill-gray-500 dark:fill-gray-400"
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M3.04 9.37a6.33 6.33 0 1112.67 0 6.33 6.33 0 01-12.67 0zm6.33-7.83a7.83 7.83 0 104.98 13.88l2.82 2.82a.75.75 0 101.06-1.06l-2.82-2.82a7.83 7.83 0 00-6.04-12.82z"
                    fill="currentColor"
                  />
                </svg>
              </span>
              <input
                ref={inputRef}
                type="text"
                placeholder="Search or type command..."
                className="h-11 w-full rounded-lg border border-gray-200 bg-white/70 py-2.5 pl-12 pr-14 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/15 dark:border-brand-500/15 dark:bg-white/[0.04] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-500/50 xl:w-[420px]"
              />
              <span className="absolute right-2.5 top-1/2 inline-flex -translate-y-1/2 items-center gap-0.5 rounded-lg border border-gray-200 bg-gray-50 px-[7px] py-[4.5px] text-xs text-gray-500 dark:border-brand-500/15 dark:bg-white/[0.04] dark:text-gray-400">
                <span>⌘</span>
                <span>K</span>
              </span>
            </div>
          </div>
        </div>

        <div
          className={`${
            isApplicationMenuOpen ? "flex" : "hidden"
          } w-full items-center justify-between gap-4 px-5 py-4 shadow-theme-md lg:flex lg:justify-end lg:px-0 lg:shadow-none`}
        >
          <div className="flex items-center gap-2 2xsm:gap-3">
            <span
              className={`hidden rounded-full px-2.5 py-1 text-xs font-semibold sm:inline-flex ${roleTone[currentRole]}`}
            >
              {roleLabels[currentRole]}
            </span>
            <ThemeToggleButton />
            <NotificationDropdown />
          </div>
          <RoleSwitcher />
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
