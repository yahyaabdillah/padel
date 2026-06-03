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
  /** hourly price (IDR) during off-peak hours */
  priceOffPeak: number;
  /** hourly price (IDR) during peak hours */
  pricePeak: number;
  /** surface / accent color used across calendar + grid */
  color: string;
  /** short marketing note */
  note?: string;
  /** url-ish image placeholder */
  image?: string;
}

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

export const courtById = (id: string): Court | undefined =>
  mockCourts.find((c) => c.id === id);
