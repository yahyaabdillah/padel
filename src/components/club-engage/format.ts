// Shared formatting helpers for the Club-Engage module (coaching, matches,
// POS, marketing, settings). Pure functions — safe for client components.

/** Format IDR. `compact` => "Rp1,3jt" style for tight stat cards. */
export function formatIDR(value: number, compact = false): string {
  if (compact) {
    if (Math.abs(value) >= 1_000_000_000)
      return `Rp${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}M`;
    if (Math.abs(value) >= 1_000_000)
      return `Rp${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}jt`;
    if (Math.abs(value) >= 1_000)
      return `Rp${(value / 1_000).toFixed(0)}rb`;
    return `Rp${value}`;
  }
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}

export function formatDateLong(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export function pct(value: number, digits = 0): string {
  return `${value.toFixed(digits)}%`;
}

/** Initials avatar fallback string. */
export function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
