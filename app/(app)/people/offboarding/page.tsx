import { PeopleWorkflowKind, PeopleWorkflowStepStatus } from "@prisma/client";

import { startEmployeeWorkflowAction } from "@/app/(app)/employees/actions";
import { updateWorkflowStepStatusAction } from "@/app/(app)/people/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { hasPermission, requirePermission } from "@/lib/auth/permissions";
import { listEmployeesForSelect } from "@/modules/employees/queries";
import { listWorkflowRunsByKind } from "@/modules/people-ops/queries";

import styles from "@/components/operations/ops-workspace.module.css";

function getStepVariant(status: PeopleWorkflowStepStatus) {
  if (status === PeopleWorkflowStepStatus.DONE) return "success" as const;
  if (status === PeopleWorkflowStepStatus.BLOCKED) return "warning" as const;
  return "outline" as const;
}

function formatStatusLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function OffboardingPage() {
  const user = await requirePermission("view_people_command_center");
  const [runs, employees] = await Promise.all([
    listWorkflowRunsByKind(user.organizationId, PeopleWorkflowKind.OFFBOARDING),
    listEmployeesForSelect(user.organizationId)
  ]);
  const canManage = hasPermission(user.role, "manage_people_workflows");
  const completedRuns = runs.filter((run) => run.status === "COMPLETED").length;
  const blockedSteps = runs.flatMap((run) => run.steps).filter((step) => step.status === "BLOCKED").length;

  return (
    <div className={styles.workspace}>
      <div className={styles.header}>
        <span className={styles.eyebrow}>Offboarding</span>
        <h2 className={styles.title}>Saídas com rastreio operacional</h2>
        <p className={styles.description}>
          Checklist de desligamento, devolução de acessos e equipamentos e pendências finais em um único fluxo.
        </p>
      </div>

      <div className={styles.statRow}>
        <div className={styles.statPill}>
          <strong>{runs.length}</strong>
          <span>fluxos ativos</span>
        </div>
        <div className={styles.statPill}>
          <strong>{completedRuns}</strong>
          <span>concluídos</span>
        </div>
        <div className={styles.statPill}>
          <strong>{blockedSteps}</strong>
          <span>bloqueios</span>
        </div>
        <div className={styles.statPill}>
          <strong>{employees.length}</strong>
          <span>colaboradores disponíveis</span>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.detailColumn}>
          {canManage ? (
            <section className={styles.formPanel}>
              <div className={styles.panelHeader}>
                <h3 className={styles.panelTitle}>Iniciar offboarding</h3>
                <p className={styles.panelDescription}>Crie um fluxo de saída com etapas operacionais e dono claro.</p>
              </div>

              <form action={startEmployeeWorkflowAction} className="grid gap-4">
                <input type="hidden" name="kind" value={PeopleWorkflowKind.OFFBOARDING} />
                <select name="employeeId" required defaultValue="" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                  <option value="" disabled>
                    Selecione um colaborador
                  </option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.fullName} - {employee.title}
                    </option>
                  ))}
                </select>
                <div className="flex justify-end">
                  <Button type="submit" variant="destructive">
                    Gerar offboarding
                  </Button>
                </div>
              </form>
            </section>
          ) : null}

          <section className={styles.listPanel}>
            <div className={styles.panelHeader}>
              <div className={styles.panelHeaderRow}>
                <div>
                  <h3 className={styles.panelTitle}>Planos em andamento</h3>
                  <p className={styles.panelDescription}>Fluxos de saída com status por etapa e histórico do processo.</p>
                </div>
              </div>
            </div>

            <div className={styles.list}>
              {runs.length ? (
                runs.map((run) => (
                  <div key={run.id} className={styles.row}>
                    <div className={styles.rowTop}>
                      <div className={styles.rowLead}>
                        <p className={styles.rowTitle}>{run.employee.fullName}</p>
                        <p className={styles.rowSubtitle}>{run.employee.title}</p>
                      </div>
                      <Badge variant={run.status === "COMPLETED" ? "success" : "warning"}>{formatStatusLabel(run.status)}</Badge>
                    </div>

                    <div className={styles.sectionStack}>
                      {run.steps.map((step) => (
                        <div key={step.id} className={styles.detailCell}>
                          <div className={styles.sectionHeader}>
                            <div className={styles.rowLead}>
                              <p className={styles.rowTitle}>{step.title}</p>
                              <p className={styles.rowSubtitle}>
                                {step.ownerLabel}
                                {step.dueAt
                                  ? ` · vence em ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(step.dueAt)}`
                                  : ""}
                              </p>
                            </div>
                            {canManage ? (
                              <form action={updateWorkflowStepStatusAction} className="flex flex-wrap items-center gap-2">
                                <input type="hidden" name="stepId" value={step.id} />
                                <select
                                  name="status"
                                  defaultValue={step.status}
                                  className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                                >
                                  {Object.values(PeopleWorkflowStepStatus).map((status) => (
                                    <option key={status} value={status}>
                                      {formatStatusLabel(status)}
                                    </option>
                                  ))}
                                </select>
                                <Button type="submit" variant="outline" size="sm">
                                  Atualizar
                                </Button>
                              </form>
                            ) : (
                              <Badge variant={getStepVariant(step.status)}>{formatStatusLabel(step.status)}</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.emptyWrap}>
                  <p className={styles.emptyState}>Nenhum offboarding em andamento.</p>
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className={styles.detailColumn}>
          <section className={styles.detailPanel}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.panelTitle}>Leitura rápida</h3>
            </div>

            <div className={styles.sectionStack}>
              <div className={styles.detailCell}>
                <span className={styles.metaLabel}>Acessos e ativos</span>
                <p className={styles.detailText}>Use esta fila para não perder nenhum handoff sensível.</p>
              </div>
              <div className={styles.detailCell}>
                <span className={styles.metaLabel}>Prazos visíveis</span>
                <p className={styles.detailText}>Cada etapa mostra dono e data quando existir urgência operacional.</p>
              </div>
              <div className={styles.detailCell}>
                <span className={styles.metaLabel}>Saída sem caos</span>
                <p className={styles.detailText}>O objetivo é fechar desligamentos com o last mile controlado.</p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
