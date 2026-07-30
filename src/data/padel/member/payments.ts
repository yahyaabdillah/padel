// PadelHub — member payment history + receipts (dummy, no DB).

export type PaymentMethod =
  | "Wallet"
  | "Credit Card"
  | "GoPay"
  | "Bank Transfer"
  | "Transfer"
  | "QRIS"
  | "Cash";
export type PaymentStatus = "paid" | "pending" | "refunded" | "failed";

export interface PaymentRecord {
  id: string;
  invoiceNo: string;
  description: string;
  category: "Booking" | "Membership" | "Open Play" | "Pro Shop" | "Top-up" | "Coaching";
  date: string; // ISO
  amount: number; // IDR
  method: PaymentMethod;
  status: PaymentStatus;
  items: { label: string; qty: number; price: number }[];
}

export const memberPayments: PaymentRecord[] = [
  {
    id: "pay-7001",
    invoiceNo: "INV-2026-04821",
    description: "Center Court · 1.5h evening",
    category: "Booking",
    date: "2026-05-30",
    amount: 330_000,
    method: "Wallet",
    status: "paid",
    items: [{ label: "Center Court (peak) · 1.5h", qty: 1, price: 330_000 }],
  },
  {
    id: "pay-7000",
    invoiceNo: "INV-2026-04790",
    description: "Wallet top-up",
    category: "Top-up",
    date: "2026-05-30",
    amount: 250_000,
    method: "GoPay",
    status: "paid",
    items: [{ label: "Wallet top-up", qty: 1, price: 250_000 }],
  },
  {
    id: "pay-6988",
    invoiceNo: "INV-2026-04702",
    description: "Pro membership · May",
    category: "Membership",
    date: "2026-05-28",
    amount: 350_000,
    method: "Credit Card",
    status: "paid",
    items: [{ label: "Pro tier · monthly", qty: 1, price: 350_000 }],
  },
  {
    id: "pay-6970",
    invoiceNo: "INV-2026-04655",
    description: "Pro-shop · overgrip x3",
    category: "Pro Shop",
    date: "2026-05-25",
    amount: 75_000,
    method: "Wallet",
    status: "paid",
    items: [{ label: "Tourna grip (overgrip)", qty: 3, price: 25_000 }],
  },
  {
    id: "pay-6951",
    invoiceNo: "INV-2026-04590",
    description: "Court 5 · cancelled",
    category: "Booking",
    date: "2026-05-22",
    amount: 100_000,
    method: "Wallet",
    status: "refunded",
    items: [{ label: "Court 5 (off-peak) · 1h", qty: 1, price: 100_000 }],
  },
  {
    id: "pay-6930",
    invoiceNo: "INV-2026-04512",
    description: "Wednesday Mexicano",
    category: "Open Play",
    date: "2026-05-20",
    amount: 120_000,
    method: "Wallet",
    status: "paid",
    items: [{ label: "Mexicano entry", qty: 1, price: 120_000 }],
  },
  {
    id: "pay-6912",
    invoiceNo: "INV-2026-04450",
    description: "Private coaching · Coach Dimas",
    category: "Coaching",
    date: "2026-05-16",
    amount: 250_000,
    method: "Credit Card",
    status: "paid",
    items: [{ label: "1-on-1 coaching · 1h", qty: 1, price: 250_000 }],
  },
  {
    id: "pay-6900",
    invoiceNo: "INV-2026-04388",
    description: "Beginner clinic",
    category: "Coaching",
    date: "2026-05-12",
    amount: 180_000,
    method: "Bank Transfer",
    status: "paid",
    items: [{ label: "Group clinic · 1h", qty: 1, price: 180_000 }],
  },
];

export const paymentStatusMeta: Record<
  PaymentStatus,
  { label: string; tone: "success" | "warning" | "info" | "error" }
> = {
  paid: { label: "Paid", tone: "success" },
  pending: { label: "Pending", tone: "warning" },
  refunded: { label: "Refunded", tone: "info" },
  failed: { label: "Failed", tone: "error" },
};

export const paymentSummary = {
  spentThisMonth: 1_855_000,
  spentLastMonth: 1_420_000,
  totalLifetime: 18_640_000,
  receiptsCount: memberPayments.length,
};
