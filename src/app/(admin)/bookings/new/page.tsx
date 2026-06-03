"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { ClubDataProvider } from "@/components/club-core/ClubDataContext";
import NewBookingStepper from "@/components/booking/NewBookingStepper";

function NewBookingInner() {
  const params = useSearchParams();
  const courtParam = params.get("court") ?? undefined;
  const dateParam = params.get("date") ?? undefined;
  const hourParam = params.get("hour");

  return (
    <ClubDataProvider>
      <div>
        <PageBreadcrumb pageTitle="New booking" />
        <NewBookingStepper
          initialCourtId={courtParam}
          initialDateKey={dateParam}
          initialHour={hourParam !== null ? Number(hourParam) : undefined}
        />
      </div>
    </ClubDataProvider>
  );
}

export default function NewBookingPage() {
  return (
    <Suspense fallback={null}>
      <NewBookingInner />
    </Suspense>
  );
}
