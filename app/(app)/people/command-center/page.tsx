import Link from "next/link";

import { CommandCenterView } from "@/components/people/command-center-view";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/permissions";
import { getPeopleDashboard } from "@/modules/people-ops/queries";

import styles from "@/components/operations/ops-workspace.module.css";

export default async function PeopleCommandCenterPage() {
  const user = await requirePermission("view_people_command_center");
  const dashboard = await getPeopleDashboard(user.organizationId);

  return (
    <div className={styles.workspace}>
      <div className={styles.header}>
        <span className={styles.eyebrow}>People ops</span>
        <h2 className={styles.title}>Centro operacional</h2>
        <p className={styles.description}>
          Uma leitura única da operação diária de people ops, com filas críticas, workflows, agenda, compliance e
          próximos passos do time.
        </p>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.toolbarMeta}>
          <div className={styles.tabs}>
            <Button asChild size="sm">
              <Link href="/requests">Abrir solicitações</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/people/tasks">Ver people tasks</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/people/calendar">Abrir agenda</Link>
            </Button>
          </div>
          <span className={styles.shortcutHint}>Menos telas de resumo separadas e mais uma fila realmente acionável.</span>
        </div>
      </div>

      <CommandCenterView data={dashboard} />
    </div>
  );
}
