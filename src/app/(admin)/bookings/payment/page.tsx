"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { ClubDataProvider } from "@/components/club-core/ClubDataContext";
import BookingPayment from "@/components/booking/BookingPayment";

function PaymentInner() {
  const params = useSearchParams();
  const court = params.get("court") ?? "";
  const date = params.get("date") ?? "";
  // multi-select: comma-separated storage-slot indices (e.g. "14,15,18")
  const slots = (params.get("slots") ?? "")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n));
  const member = params.get("member") ?? "";

  return (
    <ClubDataProvider>
      <div>
        <PageBreadcrumb pageTitle="Pembayaran Booking" />
        <BookingPayment
          courtId={court}
          dateKey={date}
          startSlots={slots}
          memberId={member}
        />
      </div>
    </ClubDataProvider>
  );
}

export default function BookingPaymentPage() {
  return (
    <Suspense fallback={null}>
      <PaymentInner />
    </Suspense>
  );
}
