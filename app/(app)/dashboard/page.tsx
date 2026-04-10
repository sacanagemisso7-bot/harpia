import { HarpiaLayout } from "@/components/dashboard/system/harpia-layout";
import { requirePermission } from "@/lib/auth/permissions";
import { getPeopleDashboard } from "@/modules/people-ops/queries";

export default async function DashboardPage() {
  const user = await requirePermission("view_people_command_center");
  const dashboard = await getPeopleDashboard(user.organizationId);

  return <HarpiaLayout data={dashboard} viewer={{ name: user.name, organizationName: user.organizationName, role: user.role }} />;
}
