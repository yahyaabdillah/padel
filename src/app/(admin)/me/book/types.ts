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

/** Time grouping label for the hour axis (mirrors settings/hours groupings). */
export type MeTimeGroup = {
  id: string;
  name: string;
  startHour: number;
  endHour: number;
  color: string;
  sortOrder: number;
};

export type MeBookData = {
  courts: MeCourt[];
  membership: MeMembership;
  timeGroups: MeTimeGroup[];
};

/** One court session in a (possibly multi-session) member checkout. */
export type BookSessionInput = {
  courtId: string;
  dateKey: string; // YYYY-MM-DD
  startHour: number; // 0–23 (booking step is hourly)
  durationHours: number; // 1 | 1.5 | 2
  partySize: number;
};

export type CreateMyBookingInput = {
  sessions: BookSessionInput[];
  paymentMethod: MemberPaymentMethod;
};

export type CreateMyBookingResult = {
  success: boolean;
  error?: string;
  id?: string;
  paymentRef?: string;
  payable?: number;
  coveredCount?: number;
};

/** Per-session pricing line returned by the preview. */
export type PreviewLine = {
  courtId: string;
  courtName: string;
  dateKey: string;
  startHour: number;
  durationHours: number;
  label: string; // "14:00–15:30"
  basePrice: number;
  coveredByQuota: boolean;
  discountPct: number;
  payable: number;
};

export type PreviewMyBookingResult = {
  success: boolean;
  error?: string;
  lines: PreviewLine[];
  subtotal: number;
  quotaSavings: number;
  discountSavings: number;
  totalSavings: number;
  payable: number;
  quotaRemaining: number;
  quotaRemainingAfter: number;
};

export type CancelMyBookingResult = {
  success: boolean;
  error?: string;
};
