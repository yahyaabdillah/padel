import { canViewMenu } from "@/lib/access-guard";
import AccessDenied from "@/components/club-core/AccessDenied";
import CheckinClient from "./CheckinClient";

export default async function CheckinPage() {
  if (!(await canViewMenu("checkin"))) return <AccessDenied menuLabel="Check-in" />;
  return <CheckinClient />;
}
