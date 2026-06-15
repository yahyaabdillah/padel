"use client";

// PadelHub — club-core client store (dummy, in-memory + localStorage).
// Holds mutable courts + bookings so create/cancel actions reflect across
// the dashboard, bookings calendar, and courts pages within a session.
//
// NOTE: owned by the club-core agent. Other agents must not import/redefine.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  createCourtAction,
  updateCourtAction,
  deleteCourtAction,
  getCourtsAction,
  type Court as DbCourt,
} from "@/app/(admin)/courts/actions";
import {
  mockCourts,
  type Court,
} from "@/data/padel/club/courts";
import {
  mockBookings,
  type Booking,
} from "@/data/padel/club/bookings";

const LS_BOOKINGS = "padelhub.club.bookings.v1";

interface ClubDataValue {
  courts: Court[];
  bookings: Booking[];
  isReady: boolean;
  // courts
  addCourt: (court: Omit<Court, "id">) => Court;
  updateCourt: (id: string, patch: Partial<Court>) => void;
  deleteCourt: (id: string) => void;
  // bookings
  addBooking: (booking: Omit<Booking, "id">) => Booking;
  cancelBooking: (id: string) => void;
  updateBooking: (id: string, patch: Partial<Booking>) => void;
  reset: () => void;
}

const ClubDataContext = createContext<ClubDataValue | null>(null);

export const ClubDataProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [courts, setCourts] = useState<Court[]>(mockCourts);
  const [bookings, setBookings] = useState<Booking[]>(mockBookings);
  const [isReady, setIsReady] = useState(false);

  // hydrate courts from tenant DB once
  useEffect(() => {
    (async () => {
      try {
        const fetched = await getCourtsAction();
        if (fetched.length > 0) setCourts(fetched as unknown as Court[]);
      } catch {
        /* fallback to mock data */
      }
      setIsReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!isReady) return;
    try {
      localStorage.setItem(LS_BOOKINGS, JSON.stringify(bookings));
    } catch {
      /* ignore */
    }
  }, [bookings, isReady]);

  const addCourt = useCallback((court: Omit<Court, "id">) => {
    const created: Court = { ...court, id: `court-${Date.now().toString(36)}` };
    setCourts((prev) => [...prev, created]);
    createCourtAction(court as unknown as Omit<DbCourt, "id">).catch(console.error);
    return created;
  }, []);

  const updateCourt = useCallback((id: string, patch: Partial<Court>) => {
    setCourts((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    updateCourtAction(id, patch as unknown as Partial<Omit<DbCourt, "id">>).catch(console.error);
  }, []);

  const deleteCourt = useCallback((id: string) => {
    setCourts((prev) => prev.filter((c) => c.id !== id));
    deleteCourtAction(id).catch(console.error);
  }, []);

  const addBooking = useCallback((booking: Omit<Booking, "id">) => {
    const created: Booking = { ...booking, id: `bk-${Date.now().toString(36)}` };
    setBookings((prev) => [...prev, created]);
    return created;
  }, []);

  const cancelBooking = useCallback((id: string) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: "cancelled" } : b)),
    );
  }, []);

  const updateBooking = useCallback((id: string, patch: Partial<Booking>) => {
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }, []);

  const reset = useCallback(async () => {
    try {
      const fetched = await getCourtsAction();
      setCourts(fetched.length > 0 ? (fetched as unknown as Court[]) : mockCourts);
    } catch {
      setCourts(mockCourts);
    }
    setBookings(mockBookings);
    try {
      localStorage.removeItem(LS_BOOKINGS);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<ClubDataValue>(
    () => ({
      courts,
      bookings,
      isReady,
      addCourt,
      updateCourt,
      deleteCourt,
      addBooking,
      cancelBooking,
      updateBooking,
      reset,
    }),
    [courts, bookings, isReady, addCourt, updateCourt, deleteCourt, addBooking, cancelBooking, updateBooking, reset],
  );

  return <ClubDataContext.Provider value={value}>{children}</ClubDataContext.Provider>;
};

export function useClubData(): ClubDataValue {
  const ctx = useContext(ClubDataContext);
  if (!ctx) {
    throw new Error("useClubData must be used within a ClubDataProvider");
  }
  return ctx;
}
