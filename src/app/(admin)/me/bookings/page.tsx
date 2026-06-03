"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import Tabs from "@/components/ui/tabs/Tabs";
import { ModalDialog } from "@/components/ui/modal";
import EmptyState from "@/components/ui/feedback/EmptyState";
import { useToast } from "@/components/ui/toast/ToastContext";
import BookingCard from "@/components/member/BookingCard";
import { PlusIcon } from "@/components/member/icons";
import {
  memberBookings as seedBookings,
  type MemberBooking,
} from "@/data/padel/member";

const TODAY = "2026-06-02";

export default function MyBookingsPage() {
  const toast = useToast();
  const [bookings, setBookings] = useState<MemberBooking[]>(seedBookings);
  const [tab, setTab] = useState("upcoming");
  const [toCancel, setToCancel] = useState<MemberBooking | null>(null);

  const upcoming = useMemo(
    () =>
      bookings
        .filter((b) => b.date >= TODAY && b.status !== "cancelled" && b.status !== "completed")
        .sort((a, b) => a.date.localeCompare(b.date)),
    [bookings],
  );
  const history = useMemo(
    () =>
      bookings
        .filter((b) => b.date < TODAY || b.status === "completed" || b.status === "cancelled")
        .sort((a, b) => b.date.localeCompare(a.date)),
    [bookings],
  );

  const confirmCancel = () => {
    if (!toCancel) return;
    setBookings((prev) =>
      prev.map((b) => (b.id === toCancel.id ? { ...b, status: "cancelled" } : b)),
    );
    toast.info(`Booking ${toCancel.ref} cancelled · refund to wallet`, "Cancelled");
    setToCancel(null);
  };

  const list = tab === "upcoming" ? upcoming : history;

  return (
    <div>
      <PageBreadCrumb pageTitle="My Bookings" />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Tabs
          variant="segment"
          items={[
            { value: "upcoming", label: "Upcoming", badge: upcoming.length },
            { value: "history", label: "History", badge: history.length },
          ]}
          value={tab}
          onChange={setTab}
        />
        <Link href="/me/book">
          <Button size="sm" startIcon={<PlusIcon className="h-4 w-4" />}>
            New booking
          </Button>
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)]">
          <EmptyState
            title={tab === "upcoming" ? "No upcoming bookings" : "No past bookings yet"}
            description={
              tab === "upcoming"
                ? "Reserve a court and it will show up here."
                : "Your completed and cancelled sessions will appear here."
            }
            action={
              tab === "upcoming" ? (
                <Link href="/me/book">
                  <Button size="sm">Book a court</Button>
                </Link>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((b) => (
            <BookingCard key={b.id} booking={b} onCancel={tab === "upcoming" ? setToCancel : undefined} />
          ))}
        </div>
      )}

      <ModalDialog
        isOpen={!!toCancel}
        onClose={() => setToCancel(null)}
        title="Cancel this booking?"
        description={
          toCancel
            ? `${toCancel.courtName} · ${toCancel.date} ${toCancel.startTime}. Free cancellation up to 6h before.`
            : ""
        }
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setToCancel(null)}>
              Keep booking
            </Button>
            <Button onClick={confirmCancel}>Cancel &amp; refund</Button>
          </div>
        }
      >
        <p className="text-sm text-[var(--text-caption)]">
          The full amount will be credited back to your PadelHub wallet instantly.
        </p>
      </ModalDialog>
    </div>
  );
}
