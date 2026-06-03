"use client";

import React, { useEffect, useRef, useState } from "react";

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  time: string;
  read?: boolean;
  type?: "info" | "success" | "warning" | "error";
  avatar?: string;
};

interface NotificationBellProps {
  items: NotificationItem[];
  onItemClick?: (item: NotificationItem) => void;
  onMarkAllRead?: () => void;
  onViewAll?: () => void;
  className?: string;
}

const typeDot: Record<NonNullable<NotificationItem["type"]>, string> = {
  info: "bg-cyan-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  error: "bg-red-500",
};

const NotificationBell: React.FC<NotificationBellProps> = ({
  items,
  onItemClick,
  onMarkAllRead,
  onViewAll,
  className = "",
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const unreadCount = items.filter((i) => !i.read).length;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className={`${open ? "relative z-[60]" : "relative"} ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifikasi"
        aria-expanded={open}
        className={`relative flex h-11 w-11 items-center justify-center rounded-full border bg-[var(--surface-card)] text-[var(--text-caption)] transition-all duration-200 hover:bg-[var(--surface-muted)] hover:text-[var(--text-heading)] ${
          unreadCount > 0
            ? "border-[var(--color-primary)]/40 text-[var(--color-primary)]"
            : "border-[var(--border-default)]"
        }`}
      >
        <svg
          className={`h-5 w-5 ${unreadCount > 0 ? "origin-top animate-float" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span
            className="pulse-live absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-theme-md ring-2 ring-[var(--surface-card)]"
            style={{ ["--pulse-color" as string]: "rgba(239, 68, 68, 0.55)" }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="animate-dropdown absolute right-0 z-50 mt-2 w-80 origin-top-right overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--surface-popover)] shadow-theme-xl">
          <div className="surface-premium flex items-center justify-between border-b border-[var(--border-light)] px-4 py-3">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-[var(--text-heading)]">Notifikasi</h4>
              {unreadCount > 0 && (
                <span className="rounded-full bg-[var(--color-primary)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-primary-text)] shadow-theme-xs">
                  {unreadCount} baru
                </span>
              )}
            </div>
            {unreadCount > 0 && onMarkAllRead && (
              <button onClick={onMarkAllRead} className="text-xs font-medium text-[var(--color-primary)] transition-colors hover:underline">
                Tandai dibaca
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto custom-scrollbar">
            {items.length === 0 ? (
              <p className="py-10 text-center text-sm text-[var(--text-muted)]">Tidak ada notifikasi</p>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onItemClick?.(item)}
                  className={`relative flex w-full items-start gap-3 border-b border-[var(--border-light)] px-4 py-3 text-left transition-colors hover:bg-[var(--surface-muted)] ${
                    !item.read
                      ? "bg-[var(--color-primary-light)] before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-r-full before:bg-[var(--color-primary)]"
                      : ""
                  }`}
                >
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${typeDot[item.type || "info"]}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--text-heading)]">{item.title}</p>
                    <p className="line-clamp-2 text-xs text-[var(--text-caption)]">{item.message}</p>
                    <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">{item.time}</p>
                  </div>
                  {!item.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--color-primary)]" />}
                </button>
              ))
            )}
          </div>

          {onViewAll && items.length > 0 && (
            <button
              onClick={onViewAll}
              className="w-full border-t border-[var(--border-light)] py-3 text-center text-sm font-medium text-[var(--color-primary)] transition-colors hover:bg-[var(--surface-muted)]"
            >
              Lihat semua notifikasi
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
