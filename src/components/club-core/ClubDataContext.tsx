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
  getBookingsAction,
  cancelBookingAction,
} from "@/app/(admin)/bookings/actions";
import { getMaintenanceAction, type MaintenanceRecord } from "@/app/(admin)/maintenance/actions";
import {
  mockCourts,
  type Court,
} from "@/data/padel/club/courts";
import {
  type Booking,
} from "@/data/padel/club/bookings";

interface ClubDataValue {
  courts: Court[];
  bookings: Booking[];
  /** active (non-deleted) court maintenance / closure windows */
  maintenance: MaintenanceRecord[];
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
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [isReady, setIsReady] = useState(false);

  // hydrate courts + bookings + maintenance from tenant DB once
  useEffect(() => {
    (async () => {
      try {
        const [fetchedCourts, fetchedBookings, fetchedMaint] = await Promise.all([
          getCourtsAction(),
          getBookingsAction(),
          getMaintenanceAction(),
        ]);
        if (fetchedCourts.length > 0) setCourts(fetchedCourts as unknown as Court[]);
        setBookings(fetchedBookings as unknown as Booking[]);
        setMaintenance(fetchedMaint);
      } catch {
        /* fallback: keep mock courts, empty bookings */
      }
      setIsReady(true);
    })();
  }, []);

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
    cancelBookingAction(id).catch(console.error);
  }, []);

  const updateBooking = useCallback((id: string, patch: Partial<Booking>) => {
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }, []);

  const reset = useCallback(async () => {
    try {
      const [fetchedCourts, fetchedBookings] = await Promise.all([
        getCourtsAction(),
        getBookingsAction(),
      ]);
      setCourts(fetchedCourts.length > 0 ? (fetchedCourts as unknown as Court[]) : mockCourts);
      setBookings(fetchedBookings as unknown as Booking[]);
    } catch {
      setCourts(mockCourts);
      setBookings([]);
    }
  }, []);

  const value = useMemo<ClubDataValue>(
    () => ({
      courts,
      bookings,
      maintenance,
      isReady,
      addCourt,
      updateCourt,
      deleteCourt,
      addBooking,
      cancelBooking,
      updateBooking,
      reset,
    }),
    [courts, bookings, maintenance, isReady, addCourt, updateCourt, deleteCourt, addBooking, cancelBooking, updateBooking, reset],
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
