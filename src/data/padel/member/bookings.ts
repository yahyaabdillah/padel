// PadelHub — member's own bookings (dummy, no DB).

export type BookingStatus = "confirmed" | "completed" | "cancelled" | "pending";
export type BookingKind = "court" | "open-play" | "class" | "coaching";

export interface MemberBooking {
  id: string;
  courtId: string;
  courtName: string;
  zone: "Indoor" | "Outdoor";
  date: string; // ISO yyyy-mm-dd
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  durationHours: number;
  kind: BookingKind;
  status: BookingStatus;
  price: number; // IDR
  paidWith: "Wallet" | "Card" | "Cash" | "Membership";
  partners: string[]; // co-players
  ref: string; // booking reference code
}

const today = new Date("2026-06-02");
const iso = (offsetDays: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

export const memberBookings: MemberBooking[] = [
  {
    id: "bk-2001",
    courtId: "court-1",
    courtName: "Center Court",
    zone: "Indoor",
    date: iso(0),
    startTime: "19:00",
    endTime: "20:30",
    durationHours: 1.5,
    kind: "court",
    status: "confirmed",
    price: 330_000,
    paidWith: "Wallet",
    partners: ["Bagus P.", "Rian S.", "Tika W."],
    ref: "SC-9F2A",
  },
  {
    id: "bk-2002",
    courtId: "court-3",
    courtName: "Court 3 — Volley",
    zone: "Indoor",
    date: iso(2),
    startTime: "07:00",
    endTime: "08:00",
    durationHours: 1,
    kind: "coaching",
    status: "confirmed",
    price: 250_000,
    paidWith: "Card",
    partners: ["Coach Dimas"],
    ref: "SC-A71C",
  },
  {
    id: "bk-2003",
    courtId: "court-4",
    courtName: "Sky Court",
    zone: "Outdoor",
    date: iso(4),
    startTime: "17:00",
    endTime: "18:30",
    durationHours: 1.5,
    kind: "open-play",
    status: "pending",
    price: 120_000,
    paidWith: "Wallet",
    partners: ["Open play · 6 joined"],
    ref: "SC-B0D4",
  },
  {
    id: "bk-1980",
    courtId: "court-2",
    courtName: "Court 2 — Rally",
    zone: "Indoor",
    date: iso(-3),
    startTime: "20:00",
    endTime: "21:30",
    durationHours: 1.5,
    kind: "court",
    status: "completed",
    price: 285_000,
    paidWith: "Wallet",
    partners: ["Bagus P.", "Rian S.", "Yoga A."],
    ref: "SC-77E1",
  },
  {
    id: "bk-1975",
    courtId: "court-1",
    courtName: "Center Court",
    zone: "Indoor",
    date: iso(-6),
    startTime: "18:00",
    endTime: "19:30",
    durationHours: 1.5,
    kind: "open-play",
    status: "completed",
    price: 120_000,
    paidWith: "Membership",
    partners: ["Mexicano · 8 players"],
    ref: "SC-6620",
  },
  {
    id: "bk-1960",
    courtId: "court-5",
    courtName: "Court 5 — Baseline",
    zone: "Outdoor",
    date: iso(-9),
    startTime: "08:00",
    endTime: "09:00",
    durationHours: 1,
    kind: "court",
    status: "cancelled",
    price: 100_000,
    paidWith: "Wallet",
    partners: ["Rian S."],
    ref: "SC-5410",
  },
  {
    id: "bk-1948",
    courtId: "court-6",
    courtName: "Court 6 — Smash",
    zone: "Indoor",
    date: iso(-12),
    startTime: "19:00",
    endTime: "20:00",
    durationHours: 1,
    kind: "class",
    status: "completed",
    price: 180_000,
    paidWith: "Card",
    partners: ["Beginner clinic · Coach Sari"],
    ref: "SC-4F09",
  },
];

export const bookingStatusMeta: Record<
  BookingStatus,
  { label: string; tone: "success" | "warning" | "error" | "info" | "neutral" }
> = {
  confirmed: { label: "Confirmed", tone: "success" },
  pending: { label: "Pending", tone: "warning" },
  completed: { label: "Completed", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "error" },
};

export const bookingKindMeta: Record<BookingKind, { label: string; icon: string }> = {
  court: { label: "Court rental", icon: "🎾" },
  "open-play": { label: "Open play", icon: "🤝" },
  class: { label: "Clinic / class", icon: "📣" },
  coaching: { label: "Private coaching", icon: "🏆" },
};
