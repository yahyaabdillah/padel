// PadelHub — platform billing / invoices mock data (dummy, no DB).

import { mockTenants, planById, type PlanTier } from "@/data/padel/tenant";

export type InvoiceStatus = "paid" | "open" | "past_due" | "void" | "refunded";

export interface PlatformInvoice {
  id: string; // INV-2026-0001
  tenantId: string;
  tenantName: string;
  plan: PlanTier;
  period: string; // e.g. "Jun 2026"
  issuedAt: string; // ISO
  dueAt: string; // ISO
  amount: number; // IDR
  status: InvoiceStatus;
  method: "card" | "transfer" | "va" | "manual";
}

export const invoiceStatusMeta: Record<
  InvoiceStatus,
  { label: string; tone: "success" | "warning" | "error" | "neutral" | "info" }
> = {
  paid: { label: "Paid", tone: "success" },
  open: { label: "Open", tone: "info" },
  past_due: { label: "Past Due", tone: "error" },
  void: { label: "Void", tone: "neutral" },
  refunded: { label: "Refunded", tone: "warning" },
};

const methodLabel: Record<PlatformInvoice["method"], string> = {
  card: "Credit Card",
  transfer: "Bank Transfer",
  va: "Virtual Account",
  manual: "Manual",
};
export const invoiceMethodLabel = methodLabel;

// Generate 6 months of invoices for each non-trial tenant + recent open ones.
function buildInvoices(): PlatformInvoice[] {
  const list: PlatformInvoice[] = [];
  const months = [
    { label: "Jan 2026", iso: "2026-01-01" },
    { label: "Feb 2026", iso: "2026-02-01" },
    { label: "Mar 2026", iso: "2026-03-01" },
    { label: "Apr 2026", iso: "2026-04-01" },
    { label: "May 2026", iso: "2026-05-01" },
    { label: "Jun 2026", iso: "2026-06-01" },
  ];
  let seq = 1;
  const pad = (n: number) => String(n).padStart(4, "0");

  for (const tenant of mockTenants) {
    const plan = planById(tenant.plan);
    if (tenant.status === "trial") continue; // trials have no invoices yet
    months.forEach((m, idx) => {
      const isCurrent = idx === months.length - 1;
      let status: InvoiceStatus = "paid";
      if (isCurrent && tenant.status === "past_due") status = "past_due";
      else if (isCurrent && tenant.status === "suspended") status = "void";
      else if (isCurrent) status = "open";

      const issued = new Date(m.iso);
      const due = new Date(issued);
      due.setDate(due.getDate() + 7);

      list.push({
        id: `INV-2026-${pad(seq++)}`,
        tenantId: tenant.id,
        tenantName: tenant.name,
        plan: tenant.plan,
        period: m.label,
        issuedAt: m.iso,
        dueAt: due.toISOString().slice(0, 10),
        amount: plan.priceMonthly,
        status,
        method:
          tenant.plan === "enterprise"
            ? "transfer"
            : tenant.id.charCodeAt(8) % 2 === 0
            ? "card"
            : "va",
      });
    });
  }

  // A refunded edge-case for realism.
  list.push({
    id: `INV-2026-${pad(seq++)}`,
    tenantId: "tenant-drop",
    tenantName: "DropShot Arena",
    plan: "pro",
    period: "Dec 2025",
    issuedAt: "2025-12-01",
    dueAt: "2025-12-08",
    amount: 1_290_000,
    status: "refunded",
    method: "card",
  });

  return list.sort((a, b) => (a.issuedAt < b.issuedAt ? 1 : -1));
}

export const platformInvoices: PlatformInvoice[] = buildInvoices();

export const billingSummary = {
  collected: platformInvoices
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + i.amount, 0),
  outstanding: platformInvoices
    .filter((i) => i.status === "open" || i.status === "past_due")
    .reduce((s, i) => s + i.amount, 0),
  pastDue: platformInvoices
    .filter((i) => i.status === "past_due")
    .reduce((s, i) => s + i.amount, 0),
  refunded: platformInvoices
    .filter((i) => i.status === "refunded")
    .reduce((s, i) => s + i.amount, 0),
  count: platformInvoices.length,
};
