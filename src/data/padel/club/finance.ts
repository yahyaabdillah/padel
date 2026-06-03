// PadelHub — club finance mock data (dummy, no DB)

export type TxnCategory =
  | "court_booking"
  | "coaching"
  | "membership"
  | "pos"
  | "event"
  | "refund";
export type TxnMethod = "cash" | "card" | "qris" | "wallet" | "transfer";
export type TxnStatus = "paid" | "pending" | "refunded" | "failed";

export interface Transaction {
  id: string;
  ref: string; // human-friendly receipt code
  date: string; // ISO datetime
  category: TxnCategory;
  description: string;
  customer: string;
  method: TxnMethod;
  status: TxnStatus;
  amount: number; // IDR (negative for refund)
}

export type InvoiceStatus = "paid" | "sent" | "overdue" | "draft";

export interface InvoiceLine {
  label: string;
  qty: number;
  unitPrice: number;
}

export interface Invoice {
  id: string;
  number: string;
  customer: string;
  email: string;
  issuedAt: string; // ISO date
  dueAt: string; // ISO date
  status: InvoiceStatus;
  lines: InvoiceLine[];
}

export const txnCategoryMeta: Record<
  TxnCategory,
  { label: string; tone: "primary" | "info" | "success" | "warning" | "neutral" | "error" }
> = {
  court_booking: { label: "Court Booking", tone: "primary" },
  coaching: { label: "Coaching", tone: "info" },
  membership: { label: "Membership", tone: "success" },
  pos: { label: "Pro Shop", tone: "warning" },
  event: { label: "Event", tone: "neutral" },
  refund: { label: "Refund", tone: "error" },
};

export const txnMethodMeta: Record<TxnMethod, { label: string }> = {
  cash: { label: "Cash" },
  card: { label: "Card" },
  qris: { label: "QRIS" },
  wallet: { label: "Wallet" },
  transfer: { label: "Transfer" },
};

export const txnStatusMeta: Record<
  TxnStatus,
  { label: string; tone: "success" | "warning" | "neutral" | "error" }
> = {
  paid: { label: "Paid", tone: "success" },
  pending: { label: "Pending", tone: "warning" },
  refunded: { label: "Refunded", tone: "neutral" },
  failed: { label: "Failed", tone: "error" },
};

export const invoiceStatusMeta: Record<
  InvoiceStatus,
  { label: string; tone: "success" | "info" | "error" | "neutral" }
> = {
  paid: { label: "Paid", tone: "success" },
  sent: { label: "Sent", tone: "info" },
  overdue: { label: "Overdue", tone: "error" },
  draft: { label: "Draft", tone: "neutral" },
};

const pad = (n: number) => String(n).padStart(2, "0");

let seed = 776655;
const rand = () => {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
};
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];

const customers = [
  "Andi Wijaya",
  "Sarah Kusuma",
  "Reza Mahendra",
  "Bagus Setiawan",
  "Maya Pertiwi",
  "Fikri Ramadhan",
  "Walk-in Guest",
  "Yoga Pratama",
  "Nadia Salsabila",
  "Office League Corp",
];

const categories: { cat: TxnCategory; desc: string[]; min: number; max: number }[] = [
  { cat: "court_booking", desc: ["Center Court 90m", "Glass Arena 60m", "Lime Court 90m", "Rooftop A 60m"], min: 140_000, max: 560_000 },
  { cat: "coaching", desc: ["PT session w/ Coach Dimas", "Beginner clinic", "Advanced clinic"], min: 200_000, max: 350_000 },
  { cat: "membership", desc: ["Pro membership renewal", "Elite membership renewal", "Wallet top-up"], min: 500_000, max: 2_000_000 },
  { cat: "pos", desc: ["Bullpadel grips x2", "Head balls tube", "Adidas overgrip", "Isotonic drink x4", "Racket rental"], min: 40_000, max: 380_000 },
  { cat: "event", desc: ["Americano entry x6", "Mexicano social entry", "Open Play night"], min: 65_000, max: 540_000 },
];

function buildTransactions(): Transaction[] {
  const today = new Date(2026, 5, 2);
  const out: Transaction[] = [];
  let counter = 1;

  for (let dayOffset = -29; dayOffset <= 0; dayOffset++) {
    const day = new Date(today);
    day.setDate(day.getDate() + dayOffset);
    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
    const count = isWeekend ? 10 + Math.floor(rand() * 8) : 6 + Math.floor(rand() * 6);

    for (let i = 0; i < count; i++) {
      const c = pick(categories);
      const amount = Math.round((c.min + rand() * (c.max - c.min)) / 5_000) * 5_000;
      const hour = 8 + Math.floor(rand() * 14);
      const status: TxnStatus = rand() < 0.93 ? "paid" : rand() < 0.5 ? "pending" : "refunded";
      const isRefund = status === "refunded";

      out.push({
        id: `txn-${pad(counter)}`,
        ref: `RCPT-${2026}${pad(day.getMonth() + 1)}${pad(day.getDate())}-${pad(counter)}`,
        date: `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}T${pad(hour)}:${pad(Math.floor(rand() * 60))}:00`,
        category: isRefund ? "refund" : c.cat,
        description: isRefund ? `Refund — ${pick(c.desc)}` : pick(c.desc),
        customer: pick(customers),
        method: pick<TxnMethod>(["cash", "card", "qris", "wallet", "transfer"]),
        status,
        amount: isRefund ? -amount : amount,
      });
      counter++;
    }
  }
  // newest first
  return out.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export const mockTransactions: Transaction[] = buildTransactions();

/** Daily revenue series for the last 30 days (for reports charts). */
export interface DailyRevenue {
  date: string; // YYYY-MM-DD
  label: string; // e.g. "May 12"
  total: number;
  byCategory: Record<TxnCategory, number>;
}

export function dailyRevenue(): DailyRevenue[] {
  const map = new Map<string, DailyRevenue>();
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  for (const t of mockTransactions) {
    if (t.status === "refunded" || t.status === "failed") continue;
    const key = t.date.slice(0, 10);
    if (!map.has(key)) {
      const [, m, d] = key.split("-").map(Number);
      map.set(key, {
        date: key,
        label: `${months[m - 1]} ${d}`,
        total: 0,
        byCategory: {
          court_booking: 0,
          coaching: 0,
          membership: 0,
          pos: 0,
          event: 0,
          refund: 0,
        },
      });
    }
    const row = map.get(key)!;
    row.total += t.amount;
    row.byCategory[t.category] += t.amount;
  }
  return Array.from(map.values()).sort((a, b) => (a.date < b.date ? -1 : 1));
}

const FINANCE_TODAY_KEY = "2026-06-02";

/** Quick aggregate figures for finance dashboard cards. */
export function financeSummary() {
  const series = dailyRevenue();
  const todayRow = series.find((r) => r.date === FINANCE_TODAY_KEY);
  const monthTotal = series.reduce((s, r) => s + r.total, 0);
  const refunds = mockTransactions
    .filter((t) => t.status === "refunded")
    .reduce((s, t) => s + Math.abs(t.amount), 0);
  const paidCount = mockTransactions.filter((t) => t.status === "paid").length;
  const pendingCount = mockTransactions.filter((t) => t.status === "pending").length;

  // category mix across the month
  const byCat: Record<TxnCategory, number> = {
    court_booking: 0,
    coaching: 0,
    membership: 0,
    pos: 0,
    event: 0,
    refund: 0,
  };
  for (const r of series) {
    (Object.keys(byCat) as TxnCategory[]).forEach((k) => (byCat[k] += r.byCategory[k]));
  }

  return {
    today: todayRow?.total ?? 0,
    monthTotal,
    refunds,
    paidCount,
    pendingCount,
    avgTicket: paidCount ? Math.round(monthTotal / paidCount) : 0,
    byCategory: byCat,
    series,
  };
}

export const mockInvoices: Invoice[] = [
  {
    id: "inv-001",
    number: "INV-2026-0142",
    customer: "Office League Corp",
    email: "finance@officeleague.id",
    issuedAt: "2026-05-28",
    dueAt: "2026-06-11",
    status: "sent",
    lines: [
      { label: "Corporate court block — 8 sessions", qty: 8, unitPrice: 420_000 },
      { label: "Equipment rental", qty: 8, unitPrice: 50_000 },
    ],
  },
  {
    id: "inv-002",
    number: "INV-2026-0141",
    customer: "Bagus Setiawan",
    email: "bagus.s@email.com",
    issuedAt: "2026-05-25",
    dueAt: "2026-05-25",
    status: "paid",
    lines: [{ label: "Elite membership — annual", qty: 1, unitPrice: 12_000_000 }],
  },
  {
    id: "inv-003",
    number: "INV-2026-0140",
    customer: "Andi Wijaya",
    email: "andi@email.com",
    issuedAt: "2026-05-20",
    dueAt: "2026-06-03",
    status: "sent",
    lines: [
      { label: "Private coaching pack — 10 sessions", qty: 10, unitPrice: 300_000 },
    ],
  },
  {
    id: "inv-004",
    number: "INV-2026-0138",
    customer: "Padel Friday League",
    email: "league@padelfriday.id",
    issuedAt: "2026-05-02",
    dueAt: "2026-05-16",
    status: "overdue",
    lines: [
      { label: "Americano tournament hosting", qty: 1, unitPrice: 6_500_000 },
      { label: "Prize fund management fee", qty: 1, unitPrice: 750_000 },
    ],
  },
  {
    id: "inv-005",
    number: "INV-2026-0136",
    customer: "Maya Pertiwi",
    email: "maya.p@email.com",
    issuedAt: "2026-04-30",
    dueAt: "2026-04-30",
    status: "paid",
    lines: [{ label: "Pro membership — quarterly", qty: 1, unitPrice: 3_000_000 }],
  },
  {
    id: "inv-006",
    number: "INV-2026-0145",
    customer: "Glow Beverages",
    email: "ap@glowbev.co",
    issuedAt: "2026-06-01",
    dueAt: "2026-06-30",
    status: "draft",
    lines: [
      { label: "Vending placement — June", qty: 1, unitPrice: 2_500_000 },
    ],
  },
];

export const invoiceTotal = (inv: Invoice): number =>
  inv.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
