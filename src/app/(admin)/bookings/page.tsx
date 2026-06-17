import { canViewMenu } from "@/lib/access-guard";
import AccessDenied from "@/components/club-core/AccessDenied";
import { BookingsClient } from "./BookingsClient";

export default async function BookingsPage() {
  if (!(await canViewMenu("booking.list"))) return <AccessDenied menuLabel="Booking" />;
  return <BookingsClient />;
}
