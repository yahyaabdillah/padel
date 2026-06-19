// Client-side helpers shared by the member booking pages (search → courts →
// payment). Pure functions only (no DB, no "use server") so they can be used
// from any client component. Pricing/quotas are still computed authoritatively
// on the server (preview/create actions); these helpers only drive the UI for
// availability + labels.

import { SLOTS_PER_DAY, type MeCourt } from "./types";

/** Sessions are fixed at 60 minutes (same as the staff flow). */
export const SESSION_MINUTES = 60;
export const SESSION_SLOTS = SESSION_MINUTES / 30; // 2

export const pad2 = (n: number) => String(n).padStart(2, "0");
export const toKey = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
export const slotLabel = (slot: number) =>
  `${pad2(Math.floor(slot / 2))}:${slot % 2 === 0 ? "00" : "30"}`;
export const hourLabel = (hour: number) => slotLabel(hour * 2);

export const idr = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

export const prettyDate = (key: string) =>
  new Date(`${key}T00:00:00`).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export interface NowGuard {
  isToday: boolean;
  nowHour: number;
}

/**
 * Compute the 60-min session price + peak flag for a court at a start hour,
 * or null when unavailable (court closed at that slot, slot occupied, or in
 * the past for today).
 */
export function sessionAt(
  court: MeCourt,
  weekday: number,
  startHour: number,
  occupied: Set<number>,
  guard: NowGuard,
): { price: number; hasPeak: boolean } | null {
  const sched = court.schedule.find((s) => s.day === weekday);
  if (!sched || !sched.available) return null;
  if (guard.isToday && startHour < guard.nowHour) return null;

  const startSlot = startHour * 2;
  let price = 0;
  let hasPeak = false;
  for (let i = 0; i < SESSION_SLOTS; i++) {
    const slot = startSlot + i;
    if (slot >= SLOTS_PER_DAY) return null;
    const rate = sched.slots[slot];
    if (rate === "closed" || !rate) return null;
    if (occupied.has(slot)) return null;
    if (rate === "peak") hasPeak = true;
    price += ((rate === "peak" ? court.pricePeak : court.priceOffPeak) * 30) / 60;
  }
  return { price: Math.round(price), hasPeak };
}
