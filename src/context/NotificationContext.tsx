"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/* In-app notification store (dummy, no backend). Seeded with a few realistic
 * rows, persisted to localStorage, surfaced in the header NotificationBell.
 * Producers (e.g. the check-in flow) call push() to add notifications live. */

export type NotificationType =
  | "checkin"
  | "booking"
  | "payment"
  | "system"
  | "match";

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  createdAt: string; // ISO
  href?: string;
  icon?: string;
}

type PushInput = Omit<AppNotification, "id" | "read" | "createdAt"> &
  Partial<Pick<AppNotification, "createdAt">>;

type NotificationContextType = {
  notifications: AppNotification[];
  unreadCount: number;
  push: (n: PushInput) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clear: () => void;
};

const STORAGE_KEY = "padelhub-notifications";

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx)
    throw new Error(
      "useNotifications must be used within a NotificationProvider",
    );
  return ctx;
};

const genId = () =>
  `ntf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

// Seed relative to the demo "now" (2026-06-02T14:00).
const seedNotifications: AppNotification[] = [
  {
    id: "ntf-seed-1",
    title: "Booking dikonfirmasi",
    message: "Center Court · hari ini 18:00 atas nama Bagus Setiawan.",
    type: "booking",
    read: false,
    createdAt: "2026-06-02T13:42:00",
    href: "/bookings",
  },
  {
    id: "ntf-seed-2",
    title: "Pembayaran diterima",
    message: "Top-up wallet Rp1.000.000 dari Andi Wijaya berhasil.",
    type: "payment",
    read: false,
    createdAt: "2026-06-02T12:10:00",
    href: "/finance",
  },
  {
    id: "ntf-seed-3",
    title: "Undangan match",
    message: "Americano Friday Night butuh 1 pemain lagi.",
    type: "match",
    read: true,
    createdAt: "2026-06-02T09:30:00",
    href: "/bookings",
  },
  {
    id: "ntf-seed-4",
    title: "Check-in berhasil",
    message: "Sarah Kusuma check-in di Glass Arena.",
    type: "checkin",
    read: true,
    createdAt: "2026-06-02T08:32:00",
    href: "/checkin",
  },
];

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Seed in state init (SSR-safe); hydrate from localStorage after mount.
  const [notifications, setNotifications] =
    useState<AppNotification[]>(seedNotifications);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AppNotification[];
        if (Array.isArray(parsed)) setNotifications(parsed);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const persist = useCallback((next: AppNotification[]) => {
    if (typeof window !== "undefined")
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const commit = useCallback(
    (updater: (prev: AppNotification[]) => AppNotification[]) => {
      setNotifications((prev) => {
        const next = updater(prev);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const push = useCallback<NotificationContextType["push"]>(
    (n) => {
      const created: AppNotification = {
        id: genId(),
        read: false,
        createdAt: n.createdAt ?? new Date().toISOString(),
        title: n.title,
        message: n.message,
        type: n.type,
        href: n.href,
        icon: n.icon,
      };
      commit((prev) => [created, ...prev]);
    },
    [commit],
  );

  const markRead = useCallback(
    (id: string) => {
      commit((prev) =>
        prev.map((x) => (x.id === id ? { ...x, read: true } : x)),
      );
    },
    [commit],
  );

  const markAllRead = useCallback(() => {
    commit((prev) => prev.map((x) => ({ ...x, read: true })));
  }, [commit]);

  const clear = useCallback(() => {
    commit(() => []);
  }, [commit]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const value = useMemo<NotificationContextType>(
    () => ({ notifications, unreadCount, push, markRead, markAllRead, clear }),
    [notifications, unreadCount, push, markRead, markAllRead, clear],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
