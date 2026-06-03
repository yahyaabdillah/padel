"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import {
  useNotifications,
  type AppNotification,
  type NotificationType,
} from "@/context/NotificationContext";

/* Header notification bell — wired to NotificationContext. Shows a ping dot +
 * count when there are unread items, lists the real notifications, supports
 * "mark all read", and navigates on item click (marking it read). */

const typeMeta: Record<
  NotificationType,
  { label: string; tint: string; icon: React.ReactNode }
> = {
  checkin: {
    label: "Check-in",
    tint: "bg-[var(--color-primary-light)] text-[var(--color-primary)]",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  booking: {
    label: "Booking",
    tint: "bg-[var(--color-secondary-light)] text-[var(--color-secondary)]",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  payment: {
    label: "Pembayaran",
    tint: "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3M3.75 5.25h16.5a1.5 1.5 0 011.5 1.5v10.5a1.5 1.5 0 01-1.5 1.5H3.75a1.5 1.5 0 01-1.5-1.5V6.75a1.5 1.5 0 011.5-1.5z" />
      </svg>
    ),
  },
  match: {
    label: "Match",
    tint: "bg-accent-100 text-accent-800 dark:bg-accent-300/15 dark:text-accent-300",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18zM3.6 9h16.8M3.6 15h16.8M12 3a13.5 13.5 0 000 18M12 3a13.5 13.5 0 010 18" />
      </svg>
    ),
  },
  system: {
    label: "Sistem",
    tint: "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
};

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  // Anchor to the demo "now" so seeded times read naturally.
  const now = new Date("2026-06-02T14:00:00").getTime();
  const diff = Math.max(0, now - then);
  const min = Math.round(diff / 60_000);
  if (min < 1) return "baru saja";
  if (min < 60) return `${min} mnt lalu`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} jam lalu`;
  const d = Math.round(hr / 24);
  return `${d} hari lalu`;
}

export default function NotificationDropdown() {
  const { notifications, unreadCount, markRead, markAllRead } =
    useNotifications();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const closeDropdown = () => setIsOpen(false);

  const handleItemClick = (n: AppNotification) => {
    markRead(n.id);
    closeDropdown();
    if (n.href) router.push(n.href);
  };

  return (
    <div className="relative">
      <button
        aria-label="Notifications"
        className="dropdown-toggle relative flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white/85 text-gray-500 transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 dark:border-brand-500/15 dark:bg-white/[0.04] dark:text-gray-400 dark:hover:border-brand-500/30 dark:hover:bg-brand-500/10 dark:hover:text-brand-300"
        onClick={() => setIsOpen((v) => !v)}
      >
        {unreadCount > 0 && (
          <span className="absolute right-0.5 top-0.5 z-10 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-400" />
          </span>
        )}
        <svg className="fill-current" width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
            fill="currentColor"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute -right-[200px] mt-[17px] flex max-h-[480px] w-[340px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[380px] lg:right-0"
      >
        <div className="mb-3 flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-700">
          <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Notifikasi
            {unreadCount > 0 && (
              <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                {unreadCount} baru
              </span>
            )}
          </h5>
          {notifications.length > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs font-medium text-brand-600 transition hover:text-brand-700 dark:text-brand-300"
            >
              Tandai dibaca
            </button>
          )}
        </div>

        <ul className="flex h-auto flex-col overflow-y-auto custom-scrollbar">
          {notifications.length === 0 ? (
            <li className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-white/5">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0" />
                </svg>
              </span>
              <p className="text-sm text-gray-500 dark:text-gray-400">Belum ada notifikasi</p>
            </li>
          ) : (
            notifications.map((n) => {
              const meta = typeMeta[n.type] ?? typeMeta.system;
              return (
                <li key={n.id}>
                  <button
                    onClick={() => handleItemClick(n)}
                    className={`flex w-full items-start gap-3 rounded-lg border-b border-gray-100 px-2 py-3 text-left transition-colors last:border-0 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/5 ${
                      n.read ? "" : "bg-brand-50/40 dark:bg-brand-500/[0.06]"
                    }`}
                  >
                    <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${meta.tint}`}>
                      {meta.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-gray-800 dark:text-white/90">
                          {n.title}
                        </span>
                        {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
                      </span>
                      <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
                        {n.message}
                      </span>
                      <span className="mt-1 flex items-center gap-2 text-[11px] text-gray-400">
                        <span>{meta.label}</span>
                        <span className="h-1 w-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                        <span>{relativeTime(n.createdAt)}</span>
                      </span>
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>

        <Link
          href="/marketing/notifications"
          onClick={closeDropdown}
          className="mt-3 block rounded-lg border border-gray-300 bg-white px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Lihat semua
        </Link>
      </Dropdown>
    </div>
  );
}
