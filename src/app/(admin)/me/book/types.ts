// Shared constants/types for the member booking flow (importable by client +
// server; kept out of the "use server" actions file which may only export
// async functions).

export const MEMBER_PAYMENT_METHODS = ["QRIS", "Transfer"] as const;
export type MemberPaymentMethod = (typeof MEMBER_PAYMENT_METHODS)[number];

export const STORAGE_SLOT_MINUTES = 30;
export const SLOTS_PER_DAY = 48;

export type RateType = "regular" | "peak" | "closed";
export type DaySchedule = { day: number; available: boolean; slots: RateType[] };

export type MeCourt = {
  id: string;
  name: string;
  environment: string;
  wall: string;
  format: string;
  priceOffPeak: number;
  pricePeak: number;
  color: string;
  schedule: DaySchedule[];
};

export type MeBookedSlot = {
  courtId: string;
  /** storage slot indices (0–47) occupied on the selected date */
  slots: number[];
};

export type MeMembership = {
  planName: string | null;
  quotaRemaining: number;
  quotaTotal: number;
  courtDiscountPct: number;
  resetAt: string | null;
};

export type MeBookData = {
  courts: MeCourt[];
  membership: MeMembership;
};

export type CreateMyBookingInput = {
  courtId: string;
  dateKey: string; // YYYY-MM-DD
  startHour: number; // 0–23 (booking step is hourly)
  durationHours: number; // 1 | 1.5 | 2
  partySize: number;
  paymentMethod: MemberPaymentMethod;
};

export type CreateMyBookingResult = {
  success: boolean;
  error?: string;
  id?: string;
  payable?: number;
  coveredByQuota?: boolean;
};
