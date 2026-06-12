"use client";

// PadelHub — club operating hours (master). Single source of truth for when the
// club is open each weekday. Court schedules grey out / lock any hour outside
// the day's operating window. Persisted to localStorage (dummy, no DB).

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

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

const STORAGE_KEY = "padelhub.club.operating-hours.v1";
const STORAGE_KEY_SLOT = "padelhub.club.slot-minutes.v1";

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
  /** booking/editing step in minutes (30 or 60) */
  slotMinutes: 30 | 60;
  isReady: boolean;
  /** the operating window for a given weekday */
  getDay: (day: number) => DayOperatingHours;
  /** patch one weekday */
  updateDay: (day: number, patch: Partial<Omit<DayOperatingHours, "day">>) => void;
  /** replace the whole week */
  setAll: (next: DayOperatingHours[]) => void;
  /** set the booking/editing slot step */
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
  const [slotMinutes, setSlotMinutesState] = useState<30 | 60>(60);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as DayOperatingHours[];
        if (Array.isArray(parsed) && parsed.length === 7) setHours(parsed);
      }
      const rawSlot = window.localStorage.getItem(STORAGE_KEY_SLOT);
      if (rawSlot === "30" || rawSlot === "60") {
        setSlotMinutesState(Number(rawSlot) as 30 | 60);
      }
    } catch {
      /* ignore */
    }
    setIsReady(true);
  }, []);

  const persist = useCallback((next: DayOperatingHours[]) => {
    if (typeof window !== "undefined")
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const setSlotMinutes = useCallback((m: 30 | 60) => {
    setSlotMinutesState(m);
    if (typeof window !== "undefined")
      window.localStorage.setItem(STORAGE_KEY_SLOT, String(m));
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
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const setAll = useCallback(
    (next: DayOperatingHours[]) => {
      setHours(next);
      persist(next);
    },
    [persist],
  );

  const reset = useCallback(() => {
    const next = cloneDefaults();
    setHours(next);
    persist(next);
  }, [persist]);

  const value = useMemo<OperatingHoursContextType>(
    () => ({ hours, slotMinutes, isReady, getDay, updateDay, setAll, setSlotMinutes, reset }),
    [hours, slotMinutes, isReady, getDay, updateDay, setAll, setSlotMinutes, reset],
  );

  return (
    <OperatingHoursContext.Provider value={value}>
      {children}
    </OperatingHoursContext.Provider>
  );
};
