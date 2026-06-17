import { canViewMenu } from "@/lib/access-guard";
import AccessDenied from "@/components/club-core/AccessDenied";
import MembersClient from "./MembersClient";

// Server guard: block READ access before the client table + data load.
export default async function MembersPage() {
  if (!(await canViewMenu("members.data"))) return <AccessDenied menuLabel="Data Member" />;
  return <MembersClient />;
}
