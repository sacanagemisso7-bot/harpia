import Link from "next/link";

import { CommandCenterView } from "@/components/people/command-center-view";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/permissions";
import { getPeopleDashboard } from "@/modules/people-ops/queries";

export default async function PeopleCommandCenterPage() {
  const user = await requirePermission("view_people_command_center");
  const dashboard = await getPeopleDashboard(user.organizationId);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="HR command center"
        title="Centro operacional de RH e people ops"
        description="Visibilidade diaria da operacao de pessoas: fila interna, pendencias, eventos, compliance leve e riscos que pedem acao."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/requests">Fila interna</Link>
            </Button>
            <Button asChild>
              <Link href="/people/tasks">People tasks</Link>
            </Button>
          </>
        }
      />

      <CommandCenterView data={dashboard} />
    </div>
  );
}
