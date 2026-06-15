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
  const startSlot = Number(params.get("slot") ?? "0");
  const duration = Number(params.get("duration") ?? "60");
  const price = Number(params.get("price") ?? "0");
  const member = params.get("member") ?? "";

  return (
    <ClubDataProvider>
      <div>
        <PageBreadcrumb pageTitle="Pembayaran Booking" />
        <BookingPayment
          courtId={court}
          dateKey={date}
          startSlot={startSlot}
          durationMinutes={duration}
          price={price}
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
