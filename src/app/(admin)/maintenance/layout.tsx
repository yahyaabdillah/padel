import { canViewMenu } from "@/lib/access-guard";
import AccessDenied from "@/components/club-core/AccessDenied";

export default async function Layout({ children }: { children: React.ReactNode }) {
  if (!(await canViewMenu("master.maintenance"))) return <AccessDenied menuLabel="Maintenance Lapangan" />;
  return <>{children}</>;
}
