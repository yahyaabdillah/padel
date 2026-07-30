export type CourtRate = "regular" | "peak" | "closed";

export interface CourtDaySchedule {
  day: number;
  available: boolean;
  slots: CourtRate[];
}

export interface CourtPriceConfig {
  schedule: CourtDaySchedule[];
  priceOffPeak: number;
  pricePeak: number;
}

export function calculateCourtBasePrice(
  court: CourtPriceConfig,
  start: Date,
  end: Date,
): number {
  const durationMinutes = (end.getTime() - start.getTime()) / 60_000;
  if (
    !Number.isSafeInteger(court.priceOffPeak) ||
    !Number.isSafeInteger(court.pricePeak) ||
    court.priceOffPeak < 0 ||
    court.pricePeak < 0 ||
    durationMinutes <= 0 ||
    durationMinutes % 30 !== 0 ||
    start.getSeconds() !== 0 ||
    start.getMinutes() % 30 !== 0
  ) {
    throw new Error("Invalid court price interval.");
  }

  const day = court.schedule.find((item) => item.day === start.getDay());
  if (!day?.available) throw new Error("Court is closed.");

  const startSlot = start.getHours() * 2 + start.getMinutes() / 30;
  const slots = durationMinutes / 30;
  let total = 0;
  for (let index = 0; index < slots; index++) {
    const rate = day.slots[startSlot + index];
    if (!rate || rate === "closed") throw new Error("Court is closed.");
    total +=
      (rate === "peak" ? court.pricePeak : court.priceOffPeak) / 2;
  }
  return Math.round(total);
}
