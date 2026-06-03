// PadelHub — club-core formatting helpers (IDR, dates, durations)

export const formatIDR = (value: number, compact = false): string =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    notation: compact ? "compact" : "standard",
    compactDisplay: "short",
  }).format(value);

export const formatNumber = (value: number, compact = false): string =>
  new Intl.NumberFormat("id-ID", {
    notation: compact ? "compact" : "standard",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  }).format(value);

const months = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "Jun 2, 2026" */
export const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
};

/** "Jun 2 · 18:00" */
export const formatDateTime = (iso: string): string => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${months[d.getMonth()]} ${d.getDate()} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** "18:00" */
export const formatTime = (iso: string): string => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** "18:00 – 19:30" */
export const formatTimeRange = (startIso: string, endIso: string): string =>
  `${formatTime(startIso)} – ${formatTime(endIso)}`;

/** duration in minutes between two ISO datetimes */
export const durationMinutes = (startIso: string, endIso: string): number =>
  Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000);

/** relative day label vs today (2026-06-02). */
export const relativeDayLabel = (iso: string): string => {
  const today = new Date(2026, 5, 2);
  today.setHours(0, 0, 0, 0);
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 1 && diff < 7) return `In ${diff} days`;
  return formatDate(iso);
};

export const initials = (name: string): string =>
  name
    .replace(/[^a-zA-Z\s]/g, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
