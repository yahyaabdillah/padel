// PadelHub — Marketing dummy data: promos, referrals, notification campaigns.

export type PromoStatus = "active" | "scheduled" | "expired" | "draft";
export type PromoType = "percentage" | "fixed" | "bogo" | "bundle";

export interface Promo {
  id: string;
  title: string;
  code: string;
  type: PromoType;
  value: number; // % for percentage, IDR for fixed
  status: PromoStatus;
  audience: string;
  startDate: string;
  endDate: string;
  redeemed: number;
  cap: number; // max redemptions
  revenue: number; // IDR attributed
  channel: string[];
}

export const promos: Promo[] = [
  {
    id: "promo-01",
    title: "Off-Peak Weekday 30%",
    code: "WEEKDAY30",
    type: "percentage",
    value: 30,
    status: "active",
    audience: "All members",
    startDate: "2026-05-01",
    endDate: "2026-06-30",
    redeemed: 184,
    cap: 500,
    revenue: 22_400_000,
    channel: ["WhatsApp", "App"],
  },
  {
    id: "promo-02",
    title: "Bring a Friend — Free Court Hour",
    code: "BRINGAFRIEND",
    type: "bogo",
    value: 1,
    status: "active",
    audience: "Pro & Elite",
    startDate: "2026-05-15",
    endDate: "2026-07-15",
    redeemed: 67,
    cap: 200,
    revenue: 9_850_000,
    channel: ["Email", "WhatsApp"],
  },
  {
    id: "promo-03",
    title: "New Member — Rp100K Off First Booking",
    code: "WELCOME100",
    type: "fixed",
    value: 100_000,
    status: "active",
    audience: "New signups",
    startDate: "2026-04-01",
    endDate: "2026-12-31",
    redeemed: 312,
    cap: 1000,
    revenue: 41_200_000,
    channel: ["App", "Web"],
  },
  {
    id: "promo-04",
    title: "Ramadan Night Bundle",
    code: "NIGHTBUNDLE",
    type: "bundle",
    value: 0,
    status: "expired",
    audience: "All members",
    startDate: "2026-03-01",
    endDate: "2026-03-31",
    redeemed: 540,
    cap: 540,
    revenue: 78_300_000,
    channel: ["WhatsApp", "Email", "App"],
  },
  {
    id: "promo-05",
    title: "Coaching Clinic Launch 20%",
    code: "CLINIC20",
    type: "percentage",
    value: 20,
    status: "scheduled",
    audience: "Intermediate players",
    startDate: "2026-06-10",
    endDate: "2026-07-10",
    redeemed: 0,
    cap: 150,
    revenue: 0,
    channel: ["Email"],
  },
  {
    id: "promo-06",
    title: "Pro-Shop Racket Clearance",
    code: "RACKET15",
    type: "percentage",
    value: 15,
    status: "draft",
    audience: "All members",
    startDate: "2026-06-20",
    endDate: "2026-07-05",
    redeemed: 0,
    cap: 300,
    revenue: 0,
    channel: [],
  },
];

export const promoStatusMeta: Record<
  PromoStatus,
  { label: string; tone: "success" | "info" | "neutral" | "warning" }
> = {
  active: { label: "Active", tone: "success" },
  scheduled: { label: "Scheduled", tone: "info" },
  expired: { label: "Expired", tone: "neutral" },
  draft: { label: "Draft", tone: "warning" },
};

export const promoTypeLabels: Record<PromoType, string> = {
  percentage: "% Discount",
  fixed: "Fixed Amount",
  bogo: "Buy 1 Get 1",
  bundle: "Bundle Deal",
};

/* ────────────────────────────────────────────────────────
 * Referral program
 * ──────────────────────────────────────────────────────── */
export interface ReferralTopReferrer {
  id: string;
  name: string;
  avatar: string;
  invites: number;
  converted: number;
  rewardEarned: number; // IDR wallet credit
}

export const referralProgram = {
  referrerReward: 100_000, // wallet credit per converted invite
  refereeReward: 75_000, // discount for the new member
  totalInvites: 1284,
  converted: 486,
  conversionRate: 37.8,
  walletCreditIssued: 48_600_000,
  monthlyTrend: {
    categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    series: [
      { name: "Invites Sent", data: [142, 168, 201, 224, 261, 288] },
      { name: "Converted", data: [48, 61, 74, 82, 101, 120] },
    ],
  },
};

export const topReferrers: ReferralTopReferrer[] = [
  { id: "p1", name: "Andi Wijaya", avatar: "/images/user/user-04.jpg", invites: 38, converted: 21, rewardEarned: 2_100_000 },
  { id: "p2", name: "Rina Kusuma", avatar: "/images/user/user-09.jpg", invites: 29, converted: 16, rewardEarned: 1_600_000 },
  { id: "p5", name: "Yusuf Hakim", avatar: "/images/user/user-13.jpg", invites: 24, converted: 14, rewardEarned: 1_400_000 },
  { id: "p4", name: "Putri Maharani", avatar: "/images/user/user-10.jpg", invites: 19, converted: 9, rewardEarned: 900_000 },
  { id: "p9", name: "Fikri Ramadhan", avatar: "/images/user/user-06.jpg", invites: 15, converted: 8, rewardEarned: 800_000 },
];

/* ────────────────────────────────────────────────────────
 * Notification campaigns (WhatsApp / Email — dummy composer)
 * ──────────────────────────────────────────────────────── */
export type NotifChannel = "whatsapp" | "email" | "push";
export type NotifStatus = "sent" | "scheduled" | "draft";

export interface NotificationCampaign {
  id: string;
  title: string;
  channel: NotifChannel;
  status: NotifStatus;
  audience: string;
  recipients: number;
  sentAt?: string;
  scheduledAt?: string;
  openRate?: number; // %
  clickRate?: number; // %
  preview: string;
}

export const notificationCampaigns: NotificationCampaign[] = [
  {
    id: "ntf-01",
    title: "Weekend Court Availability",
    channel: "whatsapp",
    status: "sent",
    audience: "All members",
    recipients: 482,
    sentAt: "2026-05-31 09:00",
    openRate: 88,
    clickRate: 41,
    preview: "Halo! Slot weekend masih tersedia. Booking sekarang & dapat 30% off dengan kode WEEKDAY30.",
  },
  {
    id: "ntf-02",
    title: "New Clinic Announcement",
    channel: "email",
    status: "sent",
    audience: "Intermediate players",
    recipients: 156,
    sentAt: "2026-05-28 14:30",
    openRate: 52,
    clickRate: 18,
    preview: "Introducing our Tactics & Match Play clinic with Coach Dimas — limited slots available.",
  },
  {
    id: "ntf-03",
    title: "Membership Renewal Reminder",
    channel: "whatsapp",
    status: "scheduled",
    audience: "Expiring this month",
    recipients: 64,
    scheduledAt: "2026-06-05 10:00",
    preview: "Membership-mu akan berakhir minggu ini. Perpanjang sekarang & nikmati harga member.",
  },
  {
    id: "ntf-04",
    title: "Open Play Friday Night",
    channel: "push",
    status: "draft",
    audience: "Pro & Elite",
    recipients: 210,
    preview: "Friday Night Americano is back! 8 spots, register now.",
  },
];

export const notifChannelMeta: Record<
  NotifChannel,
  { label: string; emoji: string; tone: "success" | "info" | "primary" }
> = {
  whatsapp: { label: "WhatsApp", emoji: "💬", tone: "success" },
  email: { label: "Email", emoji: "✉️", tone: "info" },
  push: { label: "Push", emoji: "🔔", tone: "primary" },
};

export const notifStatusMeta: Record<
  NotifStatus,
  { label: string; tone: "success" | "info" | "warning" }
> = {
  sent: { label: "Sent", tone: "success" },
  scheduled: { label: "Scheduled", tone: "info" },
  draft: { label: "Draft", tone: "warning" },
};

export const audienceOptions = [
  "All members",
  "New signups",
  "Pro & Elite",
  "Casual members",
  "Intermediate players",
  "Expiring this month",
  "Inactive 30+ days",
];
