import { canViewMenu } from "@/lib/access-guard";
import AccessDenied from "@/components/club-core/AccessDenied";
import CompanySettingsClient from "./CompanySettingsClient";

export default async function CompanySettingsPage() {
  if (!(await canViewMenu("settings.company")))
    return <AccessDenied menuLabel="Company Settings" />;
  return <CompanySettingsClient />;
}
