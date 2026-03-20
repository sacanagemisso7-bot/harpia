import Link from "next/link";

import { CommandCenterView } from "@/components/people/command-center-view";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/permissions";
import { getPeopleDashboard } from "@/modules/people-ops/queries";

export default async function DashboardPage() {
  const user = await requirePermission("view_people_command_center");
  const dashboard = await getPeopleDashboard(user.organizationId);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Internal operations home"
        title="People & internal operations OS"
        description="Acompanhe solicitacoes internas, tarefas operacionais, onboarding, offboarding, compliance leve e eventos da empresa em uma unica superficie de decisao."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/employees">Employees</Link>
            </Button>
            <Button asChild>
              <Link href="/people/command-center">Abrir command center</Link>
            </Button>
          </>
        }
      />

      <CommandCenterView data={dashboard} />
    </div>
  );
}
