"use client";

import React, { useMemo, useState } from "react";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import { ModalDialog } from "@/components/ui/modal";
import DataTable, { type Column } from "@/components/ui/table/DataTable";
import EmptyState from "@/components/ui/feedback/EmptyState";
import { useToast } from "@/components/ui/toast/ToastContext";
import StatCard from "@/components/member/StatCard";
import { ReceiptIcon, WalletIcon } from "@/components/member/icons";
import { useRole } from "@/context/RoleContext";
import {
  memberPayments,
  paymentStatusMeta,
  paymentSummary,
  idr,
  prettyDate,
  type PaymentRecord,
} from "@/data/padel/member";

const categories = ["All", "Booking", "Open Play", "Membership", "Pro Shop", "Top-up", "Coaching"];

export default function MemberPaymentsPage() {
  const toast = useToast();
  const { currentUser } = useRole();
  const [filter, setFilter] = useState("All");
  const [receipt, setReceipt] = useState<PaymentRecord | null>(null);

  const rows = useMemo(
    () => (filter === "All" ? memberPayments : memberPayments.filter((p) => p.category === filter)),
    [filter],
  );

  const columns: Column<PaymentRecord>[] = [
    {
      key: "invoiceNo",
      header: "Invoice",
      accessor: (r) => <span className="font-mono text-xs text-[var(--text-caption)]">{r.invoiceNo}</span>,
    },
    {
      key: "description",
      header: "Description",
      accessor: (r) => (
        <div>
          <p className="font-medium text-[var(--text-heading)]">{r.description}</p>
          <p className="text-xs text-[var(--text-muted)]">{r.category} · {r.method}</p>
        </div>
      ),
    },
    {
      key: "date",
      header: "Date",
      sortValue: (r) => r.date,
      accessor: (r) => <span className="text-[var(--text-caption)]">{prettyDate(r.date)}</span>,
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      accessor: (r) => {
        const m = paymentStatusMeta[r.status];
        return (
          <Badge variant="light" color={m.tone} size="sm">
            {m.label}
          </Badge>
        );
      },
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      sortValue: (r) => r.amount,
      accessor: (r) => <span className="font-semibold text-[var(--text-heading)]">{idr(r.amount)}</span>,
    },
    {
      key: "action",
      header: "",
      align: "right",
      accessor: (r) => (
        <Button size="sm" variant="ghost" onClick={() => setReceipt(r)}>
          Receipt
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageBreadCrumb pageTitle="Payments" />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Spent this month"
          value={idr(paymentSummary.spentThisMonth)}
          icon={<WalletIcon />}
          accent="primary"
          trend={{
            value: `${Math.round(((paymentSummary.spentThisMonth - paymentSummary.spentLastMonth) / paymentSummary.spentLastMonth) * 100)}%`,
            up: paymentSummary.spentThisMonth > paymentSummary.spentLastMonth,
          }}
          hint="vs last month"
        />
        <StatCard label="Lifetime spend" value={idr(paymentSummary.totalLifetime)} icon={<ReceiptIcon />} accent="teal" />
        <StatCard label="Receipts" value={paymentSummary.receiptsCount} icon={<ReceiptIcon />} accent="neutral" />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {categories.map((c) => (
          <Button key={c} variant="chip" size="sm" active={filter === c} onClick={() => setFilter(c)}>
            {c}
          </Button>
        ))}
      </div>

      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-2 sm:p-4">
        <DataTable
          columns={columns}
          data={rows}
          rowKey={(r) => r.id}
          defaultSort={{ key: "date", direction: "desc" }}
          emptyState={<EmptyState title="No payments" description="No transactions in this category yet." />}
        />
      </div>

      {/* receipt modal */}
      <ModalDialog
        isOpen={!!receipt}
        onClose={() => setReceipt(null)}
        title="Receipt"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setReceipt(null)}>
              Close
            </Button>
            <Button onClick={() => toast.success("Receipt downloaded (demo)", "Done")}>Download PDF</Button>
          </div>
        }
      >
        {receipt && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold text-[var(--text-heading)]">
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-accent)]" /> PadelHub
              </div>
              <Badge variant="light" color={paymentStatusMeta[receipt.status].tone} size="sm">
                {paymentStatusMeta[receipt.status].label}
              </Badge>
            </div>
            <div className="rounded-xl bg-[var(--surface-muted)] p-3 text-xs text-[var(--text-caption)]">
              <p className="font-mono">{receipt.invoiceNo}</p>
              <p>{prettyDate(receipt.date)} · {receipt.method}</p>
              <p>Billed to {currentUser.name} · {currentUser.email}</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-light)] text-left text-xs text-[var(--text-muted)]">
                  <th className="py-1.5">Item</th>
                  <th className="py-1.5 text-center">Qty</th>
                  <th className="py-1.5 text-right">Price</th>
                </tr>
              </thead>
              <tbody>
                {receipt.items.map((it, i) => (
                  <tr key={i} className="border-b border-[var(--border-light)] last:border-0">
                    <td className="py-2 text-[var(--text-body)]">{it.label}</td>
                    <td className="py-2 text-center text-[var(--text-caption)]">{it.qty}</td>
                    <td className="py-2 text-right text-[var(--text-body)]">{idr(it.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between border-t border-[var(--border-light)] pt-3">
              <span className="font-medium text-[var(--text-heading)]">Total</span>
              <span className="text-lg font-bold text-[var(--color-primary)]">{idr(receipt.amount)}</span>
            </div>
          </div>
        )}
      </ModalDialog>
    </div>
  );
}
