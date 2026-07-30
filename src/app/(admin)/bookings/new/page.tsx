import { redirect } from "next/navigation";

export default function LegacyNewBookingPage() {
  redirect("/bookings/search");
}
