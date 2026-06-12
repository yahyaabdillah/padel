// PadelHub — club court mock data (dummy, no DB)
// Courts belong to the current club (tenant-smash / SmashCourt Padel Club).

export type CourtEnvironment = "indoor" | "outdoor";
export type CourtWall = "glass" | "mesh"; // panoramic glass vs steel mesh
export type CourtFormat = "single" | "double"; // 1v1 vs 2v2 court
export type CourtStatus = "active" | "maintenance" | "inactive";

export interface Court {
  id: string;
  name: string;
  environment: CourtEnvironment;
  wall: CourtWall;
  format: CourtFormat;
  status: CourtStatus;
  /** hourly price (IDR) during off-peak / normal hours */
  priceOffPeak: number;
  /** hourly price (IDR) during peak hours */
  pricePeak: number;
  /** per-weekday availability + hourly rate schedule (7 entries, day 0–6) */
  schedule: DaySchedule[];
  /** surface / accent color used across calendar + grid */
  color: string;
  /** short marketing note */
  note?: string;
  /** url-ish image placeholder */
  image?: string;
}

/** Rate applied to a single time slot of a court's day. */
export type RateType = "regular" | "peak" | "closed";

/**
 * Storage granularity for day schedules. We always store at 30-minute
 * resolution (48 slots/day) so a court can support both 60- and 30-minute
 * booking steps without losing data when the club switches interval. The
 * master operating hours' `slotMinutes` only controls the editing/booking step.
 */
export const STORAGE_SLOT_MINUTES = 30;
export const SLOTS_PER_DAY = (24 * 60) / STORAGE_SLOT_MINUTES; // 48

/** Convert a storage slot index (0–47) to its "HH:MM" start label. */
export const slotLabel = (slot: number): string => {
  const totalMin = slot * STORAGE_SLOT_MINUTES;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

/** First storage-slot index for a given hour. */
export const hourToSlot = (hour: number): number =>
  Math.round((hour * 60) / STORAGE_SLOT_MINUTES);

/** A court's plan for one weekday. */
export interface DaySchedule {
  /** weekday: 0 = Sunday … 6 = Saturday */
  day: number;
  /** whether the court is open at all on this day */
  available: boolean;
  /** rate per 30-min slot (length 48; index = slot). "closed" = libur/maintenance */
  slots: RateType[];
}

export const rateTypeMeta: Record<
  RateType,
  { label: string; tone: "success" | "primary" | "error"; color: string }
> = {
  regular: { label: "Reguler", tone: "success", color: "#10B981" },
  peak: { label: "Peak", tone: "primary", color: "#6D5BFF" },
  closed: { label: "Libur", tone: "error", color: "#EF4444" },
};

/** Weekday metadata (0 = Sunday … 6 = Saturday); ordered Mon→Sun for display. */
export const weekdayMeta: { value: number; short: string; label: string }[] = [
  { value: 1, short: "Sen", label: "Senin" },
  { value: 2, short: "Sel", label: "Selasa" },
  { value: 3, short: "Rab", label: "Rabu" },
  { value: 4, short: "Kam", label: "Kamis" },
  { value: 5, short: "Jum", label: "Jumat" },
  { value: 6, short: "Sab", label: "Sabtu" },
  { value: 0, short: "Min", label: "Minggu" },
];

/** Sensible defaults applied to a brand-new court draft. */
export const defaultCourtPeak = {
  peakDays: [5, 6, 0], // Fri, Sat, Sun
  peakStart: 17, // 5pm
  peakEnd: 22, // 10pm
  openStart: 7, // 7am
  openEnd: 23, // 11pm (exclusive)
};

/** Build a 48-slot (30-min) rate array for one day. Hours are inclusive of the
 * full hour window: openStart..openEnd and peakStart..peakEnd are in hours. */
export const makeDaySlots = (opts?: {
  isPeakDay?: boolean;
  peakStart?: number;
  peakEnd?: number;
  openStart?: number;
  openEnd?: number;
}): RateType[] => {
  const {
    isPeakDay = false,
    peakStart = defaultCourtPeak.peakStart,
    peakEnd = defaultCourtPeak.peakEnd,
    openStart = defaultCourtPeak.openStart,
    openEnd = defaultCourtPeak.openEnd,
  } = opts ?? {};
  return Array.from({ length: SLOTS_PER_DAY }, (_, slot): RateType => {
    const hour = (slot * STORAGE_SLOT_MINUTES) / 60;
    if (hour < openStart || hour >= openEnd) return "closed";
    if (isPeakDay && hour >= peakStart && hour < peakEnd) return "peak";
    return "regular";
  });
};

/** Build a full 7-day schedule with peak days highlighted. */
export const makeDefaultSchedule = (opts?: {
  peakDays?: number[];
  peakStart?: number;
  peakEnd?: number;
  openStart?: number;
  openEnd?: number;
}): DaySchedule[] => {
  const peakDays = opts?.peakDays ?? defaultCourtPeak.peakDays;
  return [0, 1, 2, 3, 4, 5, 6].map((day) => ({
    day,
    available: true,
    slots: makeDaySlots({
      isPeakDay: peakDays.includes(day),
      peakStart: opts?.peakStart,
      peakEnd: opts?.peakEnd,
      openStart: opts?.openStart,
      openEnd: opts?.openEnd,
    }),
  }));
};

/** Ensure a DaySchedule has a valid 48-slot array (migrates old 24-hour data). */
export const normalizeDaySchedule = (sched: DaySchedule): DaySchedule => {
  if (Array.isArray(sched.slots) && sched.slots.length === SLOTS_PER_DAY) {
    return sched;
  }
  // Back-compat: older data stored `hours` (24 entries). Expand each hour into
  // two 30-min slots.
  const legacy = (sched as unknown as { hours?: RateType[] }).hours;
  if (Array.isArray(legacy) && legacy.length === 24) {
    const slots: RateType[] = [];
    legacy.forEach((r) => {
      slots.push(r, r);
    });
    return { day: sched.day, available: sched.available, slots };
  }
  // Fallback: rebuild a sane default.
  return {
    day: sched.day,
    available: sched.available,
    slots: makeDaySlots(),
  };
};

/** Compact "07:00–22:30" style summary of open (non-closed) slots for a day. */
export const dayOpenRangeLabel = (sched: DaySchedule): string => {
  if (!sched.available) return "Libur";
  const openSlots = sched.slots
    .map((t, s) => ({ t, s }))
    .filter((x) => x.t !== "closed")
    .map((x) => x.s);
  if (openSlots.length === 0) return "Libur";
  const start = Math.min(...openSlots);
  const end = Math.max(...openSlots) + 1; // exclusive end slot
  return `${slotLabel(start)}–${slotLabel(end)}`;
};

/** Count peak HOURS (peak slots × 30 min ÷ 60) in a day schedule. */
export const dayPeakCount = (sched: DaySchedule): number =>
  sched.available
    ? (sched.slots.filter((t) => t === "peak").length * STORAGE_SLOT_MINUTES) /
      60
    : 0;

export const courtEnvironmentMeta: Record<
  CourtEnvironment,
  { label: string; tone: "info" | "warning" }
> = {
  indoor: { label: "Indoor", tone: "info" },
  outdoor: { label: "Outdoor", tone: "warning" },
};

export const courtWallMeta: Record<CourtWall, { label: string }> = {
  glass: { label: "Panoramic Glass" },
  mesh: { label: "Steel Mesh" },
};

export const courtFormatMeta: Record<CourtFormat, { label: string }> = {
  single: { label: "Single (1v1)" },
  double: { label: "Double (2v2)" },
};

export const courtStatusMeta: Record<
  CourtStatus,
  { label: string; tone: "success" | "warning" | "neutral" }
> = {
  active: { label: "Active", tone: "success" },
  maintenance: { label: "Maintenance", tone: "warning" },
  inactive: { label: "Inactive", tone: "neutral" },
};

// Accent palette aligned with brand tokens (indigo / lime / teal family).
export const courtColors = [
  "#6D5BFF", // electric indigo
  "#14B8A6", // court teal
  "#C6FF3D", // padel lime
  "#F59E0B", // amber
  "#EC4899", // pink
  "#0EA5E9", // sky
];

export const mockCourts: Court[] = [
  {
    id: "court-01",
    name: "Center Court",
    environment: "indoor",
    wall: "glass",
    format: "double",
    status: "active",
    priceOffPeak: 180_000,
    pricePeak: 280_000,
    schedule: makeDefaultSchedule({ peakDays: [5, 6, 0], peakStart: 17, peakEnd: 22 }),
    color: "#6D5BFF",
    note: "Flagship panoramic court with broadcast lighting.",
    image: "/images/grid-image/image-01.png",
  },
  {
    id: "court-02",
    name: "Glass Arena",
    environment: "indoor",
    wall: "glass",
    format: "double",
    status: "active",
    priceOffPeak: 170_000,
    pricePeak: 260_000,
    schedule: makeDefaultSchedule({ peakDays: [5, 6, 0], peakStart: 17, peakEnd: 22 }),
    color: "#14B8A6",
    note: "Tournament-grade WPT blue surface.",
    image: "/images/grid-image/image-02.png",
  },
  {
    id: "court-03",
    name: "Lime Court",
    environment: "indoor",
    wall: "mesh",
    format: "double",
    status: "active",
    priceOffPeak: 150_000,
    pricePeak: 230_000,
    schedule: makeDefaultSchedule({ peakDays: [5, 6, 0], peakStart: 17, peakEnd: 22 }),
    color: "#C6FF3D",
    note: "Popular among casual league nights.",
    image: "/images/grid-image/image-03.png",
  },
  {
    id: "court-04",
    name: "Rooftop A",
    environment: "outdoor",
    wall: "glass",
    format: "double",
    status: "active",
    priceOffPeak: 140_000,
    pricePeak: 210_000,
    schedule: makeDefaultSchedule({ peakDays: [5, 6, 0], peakStart: 16, peakEnd: 22 }),
    color: "#F59E0B",
    note: "Open-air court with skyline view.",
    image: "/images/grid-image/image-04.png",
  },
  {
    id: "court-05",
    name: "Rooftop B",
    environment: "outdoor",
    wall: "mesh",
    format: "double",
    status: "maintenance",
    priceOffPeak: 130_000,
    pricePeak: 200_000,
    schedule: makeDefaultSchedule({ peakDays: [5, 6, 0], peakStart: 16, peakEnd: 22 }),
    color: "#EC4899",
    note: "Net replacement scheduled this week.",
    image: "/images/grid-image/image-05.png",
  },
  {
    id: "court-06",
    name: "Single Box",
    environment: "indoor",
    wall: "glass",
    format: "single",
    status: "active",
    priceOffPeak: 110_000,
    pricePeak: 160_000,
    schedule: makeDefaultSchedule({ peakDays: [5, 6, 0], peakStart: 17, peakEnd: 22 }),
    color: "#0EA5E9",
    note: "Compact 1v1 court for drills & coaching.",
    image: "/images/grid-image/image-06.png",
  },
];

/** Peak hours used across booking pricing + heatmaps (24h, local club tz). */
export const peakHours = {
  weekday: [{ from: 17, to: 22 }], // 5pm–10pm
  weekend: [
    { from: 8, to: 12 },
    { from: 16, to: 22 },
  ],
};

export const isPeakHour = (hour: number, isWeekend: boolean): boolean => {
  const ranges = isWeekend ? peakHours.weekend : peakHours.weekday;
  return ranges.some((r) => hour >= r.from && hour < r.to);
};

/** Resolve the rate type for a court at a specific weekday + storage slot (0–47). */
export const courtRateAtSlot = (
  court: Court,
  day: number,
  slot: number,
): RateType => {
  const sched = court.schedule?.find((s) => s.day === day);
  if (!sched || !sched.available) return "closed";
  return sched.slots[slot] ?? "closed";
};

/** Resolve the rate type for a court at a specific weekday + hour. */
export const courtRateAt = (
  court: Court,
  day: number,
  hour: number,
): RateType => courtRateAtSlot(court, day, hourToSlot(hour));

/** Resolve the hourly price (IDR) for a court at a weekday + hour (0 if closed). */
export const courtPriceAt = (
  court: Court,
  day: number,
  hour: number,
): number => {
  const rate = courtRateAt(court, day, hour);
  if (rate === "peak") return court.pricePeak;
  if (rate === "regular") return court.priceOffPeak;
  return 0;
};

/**
 * Price (IDR) for a booking starting at `startSlot` lasting `durationMinutes`,
 * summing each 30-min slot at its rate. Returns null if any slot is closed
 * (i.e. the booking would cross a libur / outside-operating boundary).
 */
export const courtBookingPrice = (
  court: Court,
  day: number,
  startSlot: number,
  durationMinutes: number,
): number | null => {
  const slotCount = Math.ceil(durationMinutes / STORAGE_SLOT_MINUTES);
  let total = 0;
  for (let i = 0; i < slotCount; i++) {
    const slot = startSlot + i;
    if (slot >= SLOTS_PER_DAY) return null;
    const rate = courtRateAtSlot(court, day, slot);
    if (rate === "closed") return null;
    total += (rate === "peak" ? court.pricePeak : court.priceOffPeak) / 2; // half-hour
  }
  return Math.round(total);
};

export const courtById = (id: string): Court | undefined =>
  mockCourts.find((c) => c.id === id);

/** One bookable option: a valid start slot + its computed price. */
export interface AvailableSlot {
  /** storage slot index (0–47) */
  startSlot: number;
  /** "HH:MM" start label */
  startLabel: string;
  /** "HH:MM" end label */
  endLabel: string;
  /** total price (IDR) for the duration */
  price: number;
  /** true if any slot in the window is peak-priced */
  hasPeak: boolean;
}

/**
 * Compute every valid start slot for a court on a weekday, for a booking of
 * `durationMinutes`, given the set of already-occupied 30-min slots.
 * A start is valid only if all its covered slots are open (regular/peak),
 * inside the same day, and not occupied. Optionally only offer starts that
 * align to `stepMinutes` (the club booking step).
 */
export const courtAvailableSlots = (
  court: Court,
  day: number,
  durationMinutes: number,
  occupiedSlots: Set<number>,
  stepMinutes = 60,
): AvailableSlot[] => {
  const span = Math.ceil(durationMinutes / STORAGE_SLOT_MINUTES);
  const step = Math.max(1, Math.round(stepMinutes / STORAGE_SLOT_MINUTES));
  const out: AvailableSlot[] = [];

  for (let start = 0; start + span <= SLOTS_PER_DAY; start += step) {
    let ok = true;
    let hasPeak = false;
    let price = 0;
    for (let i = 0; i < span; i++) {
      const slot = start + i;
      const rate = courtRateAtSlot(court, day, slot);
      if (rate === "closed" || occupiedSlots.has(slot)) {
        ok = false;
        break;
      }
      if (rate === "peak") hasPeak = true;
      price += (rate === "peak" ? court.pricePeak : court.priceOffPeak) / 2;
    }
    if (!ok) continue;
    out.push({
      startSlot: start,
      startLabel: slotLabel(start),
      endLabel: slotLabel(start + span),
      price: Math.round(price),
      hasPeak,
    });
  }
  return out;
};
