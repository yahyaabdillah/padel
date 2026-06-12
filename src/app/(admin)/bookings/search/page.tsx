"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { ClubDataProvider } from "@/components/club-core/ClubDataContext";
import NewBookingSearch from "@/components/booking/NewBookingSearch";

export default function NewBookingSearchPage() {
  return (
    <ClubDataProvider>
      <div>
        <PageBreadcrumb pageTitle="New Booking" />
        <NewBookingSearch />
      </div>
    </ClubDataProvider>
  );
}
