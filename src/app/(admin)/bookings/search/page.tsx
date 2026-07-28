import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import NewBookingSearch from "@/components/booking/NewBookingSearch";
import { getBookingAvailabilityAction } from "@/app/(admin)/bookings/actions";
import { getMemberOptionsAction } from "@/app/(admin)/members/actions";
import { getTimeGroupsAction } from "@/app/(admin)/settings/hours/group-actions";
import { dateKeyInTimeZone } from "@/lib/booking-flow";

export default async function NewBookingSearchPage() {
  const [availability, members, timeGroups] = await Promise.all([
    getBookingAvailabilityAction({
      dateKey: dateKeyInTimeZone(),
      selectedSlots: [],
    }),
    getMemberOptionsAction(),
    getTimeGroupsAction(),
  ]);

  return (
    <div>
      <PageBreadcrumb pageTitle="New Booking" />
      <NewBookingSearch
        initialAvailability={availability.data}
        initialMembers={members}
        initialTimeGroups={timeGroups}
        initialError={availability.error?.message}
      />
    </div>
  );
}
