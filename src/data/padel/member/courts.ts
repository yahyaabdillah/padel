// PadelHub — member-facing court catalog + bookable slots (dummy, no DB).
// Self-contained for the /me portal so it does not depend on club-app data.

export type CourtSurface = "Crystal" | "Panoramic" | "Wall";
export type CourtZone = "Indoor" | "Outdoor";

export interface MemberCourt {
  id: string;
  name: string;
  zone: CourtZone;
  surface: CourtSurface;
  /** marketing tag shown on the booking card */
  tag: string;
  /** per-hour off-peak price in IDR */
  priceOffPeak: number;
  /** per-hour peak price in IDR */
  pricePeak: number;
  image: string;
}

export const memberCourts: MemberCourt[] = [
  {
    id: "court-1",
    name: "Center Court",
    zone: "Indoor",
    surface: "Panoramic",
    tag: "Glass-back showcourt",
    priceOffPeak: 150_000,
    pricePeak: 220_000,
    image: "/images/cards/card-01.png",
  },
  {
    id: "court-2",
    name: "Court 2 — Rally",
    zone: "Indoor",
    surface: "Crystal",
    tag: "Air-conditioned",
    priceOffPeak: 130_000,
    pricePeak: 190_000,
    image: "/images/cards/card-02.png",
  },
  {
    id: "court-3",
    name: "Court 3 — Volley",
    zone: "Indoor",
    surface: "Crystal",
    tag: "Pro lighting",
    priceOffPeak: 130_000,
    pricePeak: 190_000,
    image: "/images/cards/card-03.png",
  },
  {
    id: "court-4",
    name: "Sky Court",
    zone: "Outdoor",
    surface: "Panoramic",
    tag: "Rooftop · golden hour",
    priceOffPeak: 110_000,
    pricePeak: 170_000,
    image: "/images/cards/card-01.png",
  },
  {
    id: "court-5",
    name: "Court 5 — Baseline",
    zone: "Outdoor",
    surface: "Wall",
    tag: "Open-air",
    priceOffPeak: 100_000,
    pricePeak: 150_000,
    image: "/images/cards/card-02.png",
  },
  {
    id: "court-6",
    name: "Court 6 — Smash",
    zone: "Indoor",
    surface: "Crystal",
    tag: "Tournament grade",
    priceOffPeak: 150_000,
    pricePeak: 220_000,
    image: "/images/cards/card-03.png",
  },
];

export const courtById = (id: string) =>
  memberCourts.find((c) => c.id === id) ?? memberCourts[0];

/** Hourly time slots the club operates (07:00 – 23:00). */
export const bookableHours: string[] = Array.from({ length: 16 }, (_, i) => {
  const h = 7 + i;
  return `${String(h).padStart(2, "0")}:00`;
});

/** Peak hours = evenings + weekend mornings. */
export const isPeakHour = (time: string) => {
  const h = parseInt(time.slice(0, 2), 10);
  return h >= 17 && h <= 21;
};

export type SlotStatus = "open" | "booked" | "mine" | "closed";

export interface CourtSlot {
  courtId: string;
  time: string;
  status: SlotStatus;
}

/**
 * Deterministic pseudo-availability grid for a given date so the same date
 * always renders the same slots (dummy — derived from a date+court+hour seed).
 */
export function buildSlotGrid(dateISO: string): Record<string, SlotStatus[]> {
  const seedBase = dateISO.split("-").reduce((a, b) => a + parseInt(b, 10), 0);
  const grid: Record<string, SlotStatus[]> = {};
  memberCourts.forEach((court, ci) => {
    grid[court.id] = bookableHours.map((time, hi) => {
      const h = parseInt(time.slice(0, 2), 10);
      if (h < 7) return "closed";
      const seed = (seedBase * 7 + ci * 13 + hi * 17) % 10;
      if (isPeakHour(time)) return seed < 6 ? "booked" : "open";
      return seed < 3 ? "booked" : "open";
    });
  });
  return grid;
}
