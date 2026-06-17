import { canViewMenu } from "@/lib/access-guard";
import AccessDenied from "@/components/club-core/AccessDenied";
import StaffClient from "./StaffClient";

export default async function StaffPage() {
  if (!(await canViewMenu("access.staff"))) return <AccessDenied menuLabel="Staff & User" />;
  return <StaffClient />;
}
