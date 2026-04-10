import { PeopleWorkflowKind, PeopleWorkflowStepStatus } from "@prisma/client";

import { startEmployeeWorkflowAction } from "@/app/(app)/employees/actions";
import { updateWorkflowStepStatusAction } from "@/app/(app)/people/actions";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { hasPermission, requirePermission } from "@/lib/auth/permissions";
import { listEmployeesForSelect } from "@/modules/employees/queries";
import { listWorkflowRunsByKind } from "@/modules/people-ops/queries";

import styles from "../../workspace-expansion.module.css";

export default async function OnboardingPage() {
  const user = await requirePermission("view_people_command_center");
  const [runs, employees] = await Promise.all([
    listWorkflowRunsByKind(user.organizationId, PeopleWorkflowKind.ONBOARDING),
    listEmployeesForSelect(user.organizationId)
  ]);
  const canManage = hasPermission(user.role, "manage_people_workflows");
  const completedRuns = runs.filter((run) => run.status === "COMPLETED").length;
  const blockedSteps = runs.flatMap((run) => run.steps).filter((step) => step.status === "BLOCKED").length;

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Onboarding"
        title="Entrada operacional de novos colaboradores"
        description="Checklist por colaborador, owners, progresso e marcos iniciais da jornada em um fluxo unico."
      />

      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Ativos</span>
          <strong className={styles.statValue}>{runs.length}</strong>
          <span className={styles.statHint}>Planos de entrada atualmente acompanhados.</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Concluidos</span>
          <strong className={styles.statValue}>{completedRuns}</strong>
          <span className={styles.statHint}>Onboardings encerrados com sucesso.</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Bloqueios</span>
          <strong className={styles.statValue}>{blockedSteps}</strong>
          <span className={styles.statHint}>Etapas travadas que pedem destravamento.</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Base</span>
          <strong className={styles.statValue}>{employees.length}</strong>
          <span className={styles.statHint}>Colaboradores disponiveis para iniciar fluxo.</span>
        </div>
      </section>

      <section className={styles.detailLayout}>
        <div className={styles.column}>
          {canManage ? (
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <span className={styles.panelEyebrow}>Start flow</span>
                <h2 className={styles.panelTitle}>Iniciar onboarding</h2>
                <p className={styles.panelDescription}>Gere um plano operacional padrao a partir do cadastro do colaborador.</p>
              </div>
              <form action={startEmployeeWorkflowAction} className={styles.actionCluster}>
                <input type="hidden" name="kind" value={PeopleWorkflowKind.ONBOARDING} />
                <select name="employeeId" required defaultValue="" className={styles.select}>
                  <option value="" disabled>
                    Selecione um colaborador
                  </option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.fullName} - {employee.title}
                    </option>
                  ))}
                </select>
                <Button type="submit">Gerar onboarding</Button>
              </form>
            </div>
          ) : null}

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Active plans</span>
              <h2 className={styles.panelTitle}>Planos em andamento</h2>
              <p className={styles.panelDescription}>Checklist por colaborador com visibilidade do que esta feito, bloqueado ou pendente.</p>
            </div>
            {runs.length ? (
              <div className={styles.timeline}>
                {runs.map((run) => (
                  <div key={run.id} className={styles.timelineItem}>
                    <span className={styles.timelineDot} />
                    <div className={styles.timelineBody}>
                      <div className={styles.itemHeader}>
                        <div className={styles.itemLead}>
                          <strong className={styles.itemTitle}>{run.employee.fullName}</strong>
                          <span className={styles.itemSubtitle}>{run.employee.title}</span>
                        </div>
                        <Badge variant={run.status === "COMPLETED" ? "success" : "outline"}>{run.status}</Badge>
                      </div>
                      <div className={styles.list}>
                        {run.steps.map((step) => (
                          <div key={step.id} className={styles.listItem}>
                            <div className={styles.itemHeader}>
                              <div className={styles.itemLead}>
                                <strong className={styles.itemTitle}>{step.title}</strong>
                                <span className={styles.itemSubtitle}>
                                  {step.ownerLabel}
                                  {step.dueAt
                                    ? ` - vence em ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(step.dueAt)}`
                                    : ""}
                                </span>
                              </div>
                              {canManage ? (
                                <form action={updateWorkflowStepStatusAction} className={styles.rowBetween}>
                                  <input type="hidden" name="stepId" value={step.id} />
                                  <select name="status" defaultValue={step.status} className={styles.select}>
                                    {Object.values(PeopleWorkflowStepStatus).map((status) => (
                                      <option key={status} value={status}>
                                        {status}
                                      </option>
                                    ))}
                                  </select>
                                  <Button type="submit" variant="outline" size="sm">
                                    Atualizar
                                  </Button>
                                </form>
                              ) : (
                                <Badge variant={step.status === "DONE" ? "success" : step.status === "BLOCKED" ? "warning" : "outline"}>{step.status}</Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>Nenhum onboarding foi iniciado ainda.</div>
            )}
          </div>
        </div>

        <aside className={styles.stickyAside}>
          <div className={styles.spotlight}>
            <span className={styles.panelEyebrow}>Pipeline</span>
            <strong className={styles.spotlightValue}>{runs.length}</strong>
            <p className={styles.panelDescription}>Fluxos simultaneos de entrada hoje na operacao.</p>
          </div>
          <div className={styles.panel}>
            <div className={styles.list}>
              <div className={styles.listItem}>
                <strong className={styles.itemTitle}>Primeiros 7 dias</strong>
                <span className={styles.itemDescription}>Use esta fila para garantir hardware, acessos e rituais iniciais.</span>
              </div>
              <div className={styles.listItem}>
                <strong className={styles.itemTitle}>Owners claros</strong>
                <span className={styles.itemDescription}>Cada etapa mostra dono e prazo para evitar zonas cinzentas.</span>
              </div>
              <div className={styles.listItem}>
                <strong className={styles.itemTitle}>Bloqueios</strong>
                <span className={styles.itemDescription}>Quando travar, o time inteiro enxerga de imediato.</span>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
