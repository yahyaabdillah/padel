"use client";

import React, { useMemo, useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import DataTable, { type Column } from "@/components/ui/table/DataTable";
import { ModalDialog } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import StatCard from "@/components/club-core/StatCard";
import ToneBadge from "@/components/club-core/ToneBadge";
import FinanceNav from "@/components/club-core/FinanceNav";
import ExportButton from "@/components/club-core/ExportButton";
import { formatIDR, formatDate } from "@/components/club-core/format";
import { useToast } from "@/components/ui/toast/ToastContext";
import {
  mockInvoices,
  invoiceTotal,
  type Invoice,
  invoiceStatusMeta,
} from "@/data/padel/club/finance";

export default function InvoicesPage() {
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [open, setOpen] = useState(false);
  const toast = useToast();

  const summary = useMemo(() => {
    const outstanding = mockInvoices
      .filter((i) => i.status === "sent" || i.status === "overdue")
      .reduce((s, i) => s + invoiceTotal(i), 0);
    const overdue = mockInvoices.filter((i) => i.status === "overdue").length;
    const paid = mockInvoices.filter((i) => i.status === "paid").reduce((s, i) => s + invoiceTotal(i), 0);
    return { outstanding, overdue, paid, count: mockInvoices.length };
  }, []);

  const openInvoice = (inv: Invoice) => {
    setSelected(inv);
    setOpen(true);
  };

  const columns: Column<Invoice>[] = [
    {
      key: "number",
      header: "Invoice",
      sortable: true,
      sortValue: (i) => i.number,
      accessor: (i) => <span className="font-mono text-xs font-medium text-gray-700 dark:text-gray-200">{i.number}</span>,
    },
    {
      key: "customer",
      header: "Customer",
      sortable: true,
      sortValue: (i) => i.customer,
      accessor: (i) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-gray-800 dark:text-white/90">{i.customer}</p>
          <p className="truncate text-xs text-gray-400 dark:text-gray-500">{i.email}</p>
        </div>
      ),
    },
    {
      key: "issuedAt",
      header: "Issued",
      sortable: true,
      sortValue: (i) => i.issuedAt,
      accessor: (i) => <span className="whitespace-nowrap text-gray-600 dark:text-gray-300">{formatDate(i.issuedAt)}</span>,
    },
    {
      key: "dueAt",
      header: "Due",
      sortable: true,
      sortValue: (i) => i.dueAt,
      accessor: (i) => <span className="whitespace-nowrap text-gray-600 dark:text-gray-300">{formatDate(i.dueAt)}</span>,
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      sortable: true,
      sortValue: (i) => i.status,
      accessor: (i) => {
        const m = invoiceStatusMeta[i.status];
        return <ToneBadge tone={m.tone}>{m.label}</ToneBadge>;
      },
    },
    {
      key: "total",
      header: "Total",
      align: "right",
      sortable: true,
      sortValue: (i) => invoiceTotal(i),
      accessor: (i) => <span className="font-semibold text-gray-800 dark:text-white/90">{formatIDR(invoiceTotal(i))}</span>,
    },
  ];

  return (
    <div>
      <PageBreadcrumb pageTitle="Invoices" />
      <FinanceNav />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Outstanding" value={formatIDR(summary.outstanding, true)} accent="#F59E0B" hint="sent + overdue" />
        <StatCard label="Overdue" value={summary.overdue} accent="#EF4444" hint="needs follow-up" />
        <StatCard label="Paid (recent)" value={formatIDR(summary.paid, true)} accent="#14B8A6" />
        <StatCard label="Total invoices" value={summary.count} accent="var(--color-primary)" />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">All invoices</h3>
          <div className="flex gap-2">
            <ExportButton filename="invoices.csv" />
            <Button
              variant="primary"
              size="sm"
              startIcon={<span className="text-base leading-none">+</span>}
              onClick={() => toast.info("Invoice draft created — add line items to send.", "New invoice")}
            >
              New invoice
            </Button>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={mockInvoices}
          rowKey={(i) => i.id}
          onRowClick={openInvoice}
          defaultSort={{ key: "issuedAt", direction: "desc" }}
        />
      </div>

      <ModalDialog
        isOpen={open}
        onClose={() => setOpen(false)}
        title={selected?.number}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                toast.success(`Invoice ${selected?.number} sent to the member.`, "Sent");
                setOpen(false);
              }}
            >
              Send invoice
            </Button>
          </div>
        }
      >
        {selected && (
          <div className="space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-400 dark:text-gray-500">Billed to</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selected.customer}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{selected.email}</p>
              </div>
              <ToneBadge tone={invoiceStatusMeta[selected.status].tone}>
                {invoiceStatusMeta[selected.status].label}
              </ToneBadge>
            </div>

            <div className="flex gap-6 text-sm">
              <div>
                <p className="text-gray-400 dark:text-gray-500">Issued</p>
                <p className="font-medium text-gray-800 dark:text-white/90">{formatDate(selected.issuedAt)}</p>
              </div>
              <div>
                <p className="text-gray-400 dark:text-gray-500">Due</p>
                <p className="font-medium text-gray-800 dark:text-white/90">{formatDate(selected.dueAt)}</p>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-white/[0.03]">
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                    <th className="px-4 py-2.5">Item</th>
                    <th className="px-4 py-2.5 text-center">Qty</th>
                    <th className="px-4 py-2.5 text-right">Unit</th>
                    <th className="px-4 py-2.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {selected.lines.map((l, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2.5 text-gray-800 dark:text-white/90">{l.label}</td>
                      <td className="px-4 py-2.5 text-center text-gray-600 dark:text-gray-300">{l.qty}</td>
                      <td className="px-4 py-2.5 text-right text-gray-600 dark:text-gray-300">{formatIDR(l.unitPrice)}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-gray-800 dark:text-white/90">
                        {formatIDR(l.qty * l.unitPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-200 dark:border-gray-700">
                    <td colSpan={3} className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-200">
                      Total
                    </td>
                    <td className="px-4 py-3 text-right text-lg font-bold text-brand-600 dark:text-brand-400">
                      {formatIDR(invoiceTotal(selected))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </ModalDialog>
    </div>
  );
}
