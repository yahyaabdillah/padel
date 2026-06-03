// PadelHub — Personal Training (PT) booking domain (dummy, no DB).
// Separate from engage/coaches.ts (which holds the legacy modal PTSession) so
// ownership stays disjoint: the PT-booking pages read coaches from
// @/data/padel/engage/coaches and the booking primitives from here.

export interface PTPackage {
  id: string;
  label: string;
  sessions: number;
  /** IDR per session (coach fee only; court is added separately) */
  pricePerSession: number;
  note?: string;
}

export const ptPackages: PTPackage[] = [
  { id: "pt-single", label: "Single Session", sessions: 1, pricePerSession: 350_000, note: "Coba dulu, sekali sesi" },
  { id: "pt-4", label: "4-Session Pack", sessions: 4, pricePerSession: 325_000, note: "Hemat 7% · cocok untuk progres awal" },
  { id: "pt-8", label: "8-Session Pack", sessions: 8, pricePerSession: 300_000, note: "Hemat 14% · paket paling populer" },
  { id: "pt-12", label: "12-Session Term", sessions: 12, pricePerSession: 280_000, note: "Hemat 20% · komitmen penuh" },
];

export const ptPackageById = (id: string): PTPackage | undefined =>
  ptPackages.find((p) => p.id === id);

export interface PTSlot {
  time: string; // "HH:MM"
  available: boolean;
}

/** Operating-hour slots offered for PT (07:00 .. 21:00, hourly). */
export const ptTimeSlots: string[] = Array.from({ length: 15 }, (_, i) => {
  const h = 7 + i;
  return `${String(h).padStart(2, "0")}:00`;
});

/** When a court is reserved alongside the coach, this fee is added per session. */
export const COURT_FEE_PER_SESSION = 150_000;

/**
 * Deterministic dummy availability for a coach on a given date. Same inputs
 * always yield the same grid (SSR-safe, no Math.random), and some slots are
 * marked booked so the schedule grid can grey them out / avoid double-booking.
 */
export function coachAvailability(coachId: string, date: string): PTSlot[] {
  // Stable hash of coachId + date.
  let h = 0;
  const key = `${coachId}::${date}`;
  for (let i = 0; i < key.length; i++) {
    h = (h * 31 + key.charCodeAt(i)) % 100_000;
  }
  return ptTimeSlots.map((time, idx) => {
    const hour = 7 + idx;
    // Pseudo-random-but-deterministic "booked" pattern, denser around peak.
    const peak = hour >= 17 && hour <= 21;
    const v = (h + idx * 37) % (peak ? 3 : 4);
    return { time, available: v !== 0 };
  });
}

/** Convenience: count of free slots for a coach on a date. */
export const coachFreeSlots = (coachId: string, date: string): number =>
  coachAvailability(coachId, date).filter((s) => s.available).length;
