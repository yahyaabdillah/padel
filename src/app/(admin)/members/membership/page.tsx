import { canViewMenu } from "@/lib/access-guard";
import AccessDenied from "@/components/club-core/AccessDenied";
import MembershipLandingClient from "./MembershipLandingClient";

// Server guard: block READ access before the client list + data load.
export default async function MembershipPage() {
  if (!(await canViewMenu("members.membership"))) {
    return <AccessDenied menuLabel="Membership" />;
  }
  return <MembershipLandingClient />;
}
