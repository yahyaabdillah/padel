"use client";

// PadelHub — club operating hours (master). Single source of truth for when the
// club is open each weekday. Court schedules grey out / lock any hour outside
// the day's operating window. Persisted to tenant DB (m_operating_hours).

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getOperatingHoursAction,
  updateOperatingHourAction,
  setAllOperatingHoursAction,
  type OperatingHour,
} from "@/app/(admin)/settings/hours/actions";

/** Operating window for one weekday (0 = Sunday … 6 = Saturday). */
export interface DayOperatingHours {
  day: number;
  /** is the club open at all this weekday */
  open: boolean;
  /** open hour (0–23, inclusive) */
  openStart: number;
  /** close hour (1–24, exclusive) */
  openEnd: number;
}

/** Default: open every day 07:00–23:00 (weekends start earlier). */
export const defaultOperatingHours: DayOperatingHours[] = [
  { day: 0, open: true, openStart: 7, openEnd: 22 }, // Sun
  { day: 1, open: true, openStart: 7, openEnd: 23 }, // Mon
  { day: 2, open: true, openStart: 7, openEnd: 23 }, // Tue
  { day: 3, open: true, openStart: 7, openEnd: 23 }, // Wed
  { day: 4, open: true, openStart: 7, openEnd: 23 }, // Thu
  { day: 5, open: true, openStart: 7, openEnd: 24 }, // Fri
  { day: 6, open: true, openStart: 6, openEnd: 24 }, // Sat
];

type OperatingHoursContextType = {
  hours: DayOperatingHours[];
  /** booking slot fixed at 60 minutes */
  slotMinutes: 60;
  isReady: boolean;
  /** the operating window for a given weekday */
  getDay: (day: number) => DayOperatingHours;
  /** patch one weekday */
  updateDay: (day: number, patch: Partial<Omit<DayOperatingHours, "day">>) => void;
  /** replace the whole week */
  setAll: (next: DayOperatingHours[]) => void;
  /** no-op for backward compat (slot fixed 60) */
  setSlotMinutes: (m: 30 | 60) => void;
  reset: () => void;
};

const OperatingHoursContext = createContext<OperatingHoursContextType | undefined>(
  undefined,
);

export const useOperatingHours = () => {
  const ctx = useContext(OperatingHoursContext);
  if (!ctx)
    throw new Error(
      "useOperatingHours must be used within an OperatingHoursProvider",
    );
  return ctx;
};

const cloneDefaults = () => defaultOperatingHours.map((d) => ({ ...d }));

export const OperatingHoursProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [hours, setHours] = useState<DayOperatingHours[]>(cloneDefaults);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const fetched = await getOperatingHoursAction();
        if (fetched.length === 7) {
          setHours(fetched);
        }
      } catch {
        /* fallback to defaults */
      }
      setIsReady(true);
    })();
  }, []);

  const getDay = useCallback(
    (day: number) =>
      hours.find((h) => h.day === day) ?? {
        day,
        open: false,
        openStart: 0,
        openEnd: 0,
      },
    [hours],
  );

  const updateDay = useCallback(
    (day: number, patch: Partial<Omit<DayOperatingHours, "day">>) => {
      setHours((prev) => {
        const next = prev.map((h) => (h.day === day ? { ...h, ...patch } : h));
        // persist async
        updateOperatingHourAction(day, patch).catch(console.error);
        return next;
      });
    },
    [],
  );

  const setAll = useCallback((next: DayOperatingHours[]) => {
    setHours(next);
    setAllOperatingHoursAction(next).catch(console.error);
  }, []);

  const reset = useCallback(() => {
    const next = cloneDefaults();
    setHours(next);
    setAllOperatingHoursAction(next).catch(console.error);
  }, []);

  const setSlotMinutes = useCallback(() => {
    // no-op — slot fixed 60
  }, []);

  const value = useMemo<OperatingHoursContextType>(
    () => ({
      hours,
      slotMinutes: 60,
      isReady,
      getDay,
      updateDay,
      setAll,
      setSlotMinutes,
      reset,
    }),
    [hours, isReady, getDay, updateDay, setAll, reset, setSlotMinutes],
  );

  return (
    <OperatingHoursContext.Provider value={value}>
      {children}
    </OperatingHoursContext.Provider>
  );
};
