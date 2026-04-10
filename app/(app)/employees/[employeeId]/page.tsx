import { EmployeeCheckInType, EmployeeStatus, PeopleWorkflowKind } from "@prisma/client";
import { ClipboardCheck, ShieldCheck, UserRoundCog, Workflow } from "lucide-react";
import { notFound } from "next/navigation";

import { createEmployeeCheckInAction, startEmployeeWorkflowAction } from "@/app/(app)/employees/actions";
import { acknowledgePolicyAction } from "@/app/(app)/people/compliance/actions";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { hasPermission, requirePermission } from "@/lib/auth/permissions";
import { getEmployeeProfile } from "@/modules/employees/queries";

import styles from "../../workspace-expansion.module.css";

function getStatusVariant(status: EmployeeStatus) {
  if (status === EmployeeStatus.ACTIVE) {
    return "success" as const;
  }

  if (status === EmployeeStatus.OFFBOARDING || status === EmployeeStatus.INACTIVE) {
    return "warning" as const;
  }

  return "outline" as const;
}

export default async function EmployeeProfilePage({
  params
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const user = await requirePermission("view_employees");
  const { employeeId } = await params;
  const employee = await getEmployeeProfile(user.organizationId, employeeId);

  if (!employee) {
    notFound();
  }

  const canManageWorkflows = hasPermission(user.role, "manage_people_workflows");
  const canManageCheckins = hasPermission(user.role, "manage_checkins");
  const canManageCompliance = hasPermission(user.role, "manage_compliance");
  const openComplianceCount =
    employee.complianceRequirements.filter((item) => item.status === "PENDING").length +
    employee.policyAcknowledgements.filter((item) => !item.acknowledgedAt).length;
  const now = Date.now();

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Employee profile"
        title={employee.fullName}
        description={`${employee.title} em ${employee.department}. Perfil operacional com historico, tasks, requests e compliance.`}
        actions={<Badge variant={getStatusVariant(employee.status)}>{employee.status}</Badge>}
      />

      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Gestor</span>
          <strong className={styles.statValue}>{employee.manager?.fullName ?? "--"}</strong>
          <span className={styles.statHint}>Owner humano principal desta pessoa.</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Requests</span>
          <strong className={styles.statValue}>{employee.requestedHrRequests.length}</strong>
          <span className={styles.statHint}>Demandas abertas ou historicas ligadas ao colaborador.</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Tasks</span>
          <strong className={styles.statValue}>{employee.relatedTasks.length}</strong>
          <span className={styles.statHint}>Carga operacional associada ao perfil.</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Compliance</span>
          <strong className={styles.statValue}>{openComplianceCount}</strong>
          <span className={styles.statHint}>Itens que ainda exigem conclusao ou aceite.</span>
        </div>
      </section>

      <section className={styles.detailLayout}>
        <div className={styles.column}>
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Core data</span>
              <h2 className={styles.panelTitle}>Fonte de verdade operacional</h2>
            </div>
            <div className={styles.infoGrid}>
              <div className={styles.infoTile}>
                <strong>Cargo</strong>
                <span>{employee.title}</span>
              </div>
              <div className={styles.infoTile}>
                <strong>Time</strong>
                <span>{employee.department}</span>
              </div>
              <div className={styles.infoTile}>
                <strong>Localizacao</strong>
                <span>{employee.location || "Nao informada"}</span>
              </div>
              <div className={styles.infoTile}>
                <strong>Tipo de contratacao</strong>
                <span>{employee.employmentType || "Nao informado"}</span>
              </div>
              <div className={styles.infoTile}>
                <strong>Entrada</strong>
                <span>
                  {employee.startDate
                    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(employee.startDate)
                    : "Nao informada"}
                </span>
              </div>
              <div className={styles.infoTile}>
                <strong>Email</strong>
                <span>{employee.workEmail || "Nao informado"}</span>
              </div>
            </div>
            <div className={styles.surfaceMuted}>{employee.notes || "Sem notas iniciais registradas para este colaborador."}</div>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Workflow history</span>
              <h2 className={styles.panelTitle}>Fluxos e progresso</h2>
            </div>
            {employee.workflowRuns.length ? (
              <div className={styles.timeline}>
                {employee.workflowRuns.map((run) => (
                  <div key={run.id} className={styles.timelineItem}>
                    <span className={styles.timelineDot} />
                    <div className={styles.timelineBody}>
                      <div className={styles.itemHeader}>
                        <div className={styles.itemLead}>
                          <strong className={styles.itemTitle}>{run.title}</strong>
                          <span className={styles.itemSubtitle}>{run.kind}</span>
                        </div>
                        <Badge variant={run.status === "COMPLETED" ? "success" : "outline"}>{run.status}</Badge>
                      </div>
                      <div className={styles.list}>
                        {run.steps.map((step) => (
                          <div key={step.id} className={styles.listItem}>
                            <div className={styles.itemHeader}>
                              <div className={styles.itemLead}>
                                <strong className={styles.itemTitle}>{step.title}</strong>
                                <span className={styles.itemSubtitle}>{step.ownerLabel}</span>
                              </div>
                              <Badge variant={step.status === "DONE" ? "success" : step.status === "BLOCKED" ? "warning" : "outline"}>
                                {step.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>Nenhum fluxo operacional registrado para este colaborador ainda.</div>
            )}
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Load</span>
              <h2 className={styles.panelTitle}>Requests e tasks</h2>
              <p className={styles.panelDescription}>Visao resumida da carga operacional ligada a esta pessoa.</p>
            </div>
            <div className={styles.subGrid2}>
              <div className={styles.column}>
                <span className={styles.panelEyebrow}>Requests</span>
                {employee.requestedHrRequests.length ? (
                  <div className={styles.list}>
                    {employee.requestedHrRequests.map((request) => (
                      <div key={request.id} className={styles.listItem}>
                        <strong className={styles.itemTitle}>{request.title}</strong>
                        <span className={styles.itemDescription}>{request.status}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.surfaceMuted}>Sem solicitacoes para este colaborador.</div>
                )}
              </div>
              <div className={styles.column}>
                <span className={styles.panelEyebrow}>Tasks</span>
                {employee.relatedTasks.length ? (
                  <div className={styles.list}>
                    {employee.relatedTasks.map((task) => (
                      <div key={task.id} className={styles.listItem}>
                        <strong className={styles.itemTitle}>{task.title}</strong>
                        <span className={styles.itemDescription}>{task.status}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.surfaceMuted}>Sem tarefas vinculadas agora.</div>
                )}
              </div>
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Check-ins</span>
              <h2 className={styles.panelTitle}>Acompanhamento humano</h2>
            </div>
            {employee.checkIns.length ? (
              <div className={styles.list}>
                {employee.checkIns.map((entry) => (
                  <div key={entry.id} className={styles.listItem}>
                    <div className={styles.itemHeader}>
                      <div className={styles.itemLead}>
                        <strong className={styles.itemTitle}>{entry.title}</strong>
                        <span className={styles.itemSubtitle}>{entry.author.name}</span>
                      </div>
                      <Badge variant="outline">{entry.type}</Badge>
                    </div>
                    {entry.summary ? <span className={styles.itemDescription}>{entry.summary}</span> : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>Nenhum registro de acompanhamento ainda.</div>
            )}
          </div>
        </div>

        <aside className={styles.stickyAside}>
          <div className={styles.spotlight}>
            <span className={styles.panelEyebrow}>Status</span>
            <strong className={styles.spotlightValue}>{employee.status}</strong>
            <p className={styles.panelDescription}>Leitura atual da situacao desta pessoa dentro da operacao.</p>
          </div>

          {canManageWorkflows ? (
            <div className={styles.panel}>
              <div className={styles.itemHeader}>
                <div className={styles.itemLead}>
                  <span className={styles.panelEyebrow}>Workflow actions</span>
                  <h3 className={styles.panelTitle}>Fluxos operacionais</h3>
                </div>
                <span className={styles.iconLead}>
                  <Workflow className="h-4 w-4" />
                </span>
              </div>
              <div className={styles.actionCluster}>
                <form action={startEmployeeWorkflowAction}>
                  <input type="hidden" name="employeeId" value={employee.id} />
                  <input type="hidden" name="kind" value={PeopleWorkflowKind.ONBOARDING} />
                  <Button type="submit" variant="outline" className="w-full">
                    Iniciar onboarding
                  </Button>
                </form>
                <form action={startEmployeeWorkflowAction}>
                  <input type="hidden" name="employeeId" value={employee.id} />
                  <input type="hidden" name="kind" value={PeopleWorkflowKind.OFFBOARDING} />
                  <Button type="submit" variant="destructive" className="w-full">
                    Iniciar offboarding
                  </Button>
                </form>
              </div>
            </div>
          ) : null}

          {canManageCheckins ? (
            <div className={styles.panel}>
              <div className={styles.itemHeader}>
                <div className={styles.itemLead}>
                  <span className={styles.panelEyebrow}>Record entry</span>
                  <h3 className={styles.panelTitle}>Novo registro</h3>
                </div>
                <span className={styles.iconLead}>
                  <ClipboardCheck className="h-4 w-4" />
                </span>
              </div>
              <form action={createEmployeeCheckInAction} className={styles.actionCluster}>
                <input type="hidden" name="employeeId" value={employee.id} />
                <Select name="type" defaultValue={EmployeeCheckInType.CHECK_IN}>
                  {Object.values(EmployeeCheckInType).map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </Select>
                <Input name="title" required placeholder="Titulo do registro" />
                <Input name="followUpAt" type="date" />
                <Textarea name="summary" placeholder="Resumo do acompanhamento" className="min-h-28" />
                <Button type="submit">Salvar registro</Button>
              </form>
            </div>
          ) : null}

          <div className={styles.panel}>
            <div className={styles.itemHeader}>
              <div className={styles.itemLead}>
                <span className={styles.panelEyebrow}>Compliance</span>
                <h3 className={styles.panelTitle}>Itens obrigatorios</h3>
              </div>
              <span className={styles.iconLead}>
                <ShieldCheck className="h-4 w-4" />
              </span>
            </div>
            {employee.complianceRequirements.length ? (
              <div className={styles.list}>
                {employee.complianceRequirements.map((item) => (
                  <div key={item.id} className={styles.listItem}>
                    <div className={styles.itemHeader}>
                      <div className={styles.itemLead}>
                        <strong className={styles.itemTitle}>{item.title}</strong>
                        <span className={styles.itemSubtitle}>{item.type}</span>
                      </div>
                      <Badge variant={item.status === "COMPLETED" ? "success" : "warning"}>{item.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.surfaceMuted}>Nenhum item de compliance em aberto.</div>
            )}
          </div>

          <div className={styles.panel}>
            <div className={styles.itemHeader}>
              <div className={styles.itemLead}>
                <span className={styles.panelEyebrow}>Policies</span>
                <h3 className={styles.panelTitle}>Aceites pendentes</h3>
              </div>
              <span className={styles.iconLead}>
                <UserRoundCog className="h-4 w-4" />
              </span>
            </div>
            {employee.policyAcknowledgements.length ? (
              <div className={styles.list}>
                {employee.policyAcknowledgements.map((item) => (
                  <div key={item.id} className={styles.listItem}>
                    <div className={styles.itemHeader}>
                      <div className={styles.itemLead}>
                        <strong className={styles.itemTitle}>{item.title}</strong>
                        <span className={styles.itemSubtitle}>
                          {item.document?.title ?? "Politica interna"}
                          {item.document?.versionLabel ? ` - ${item.document.versionLabel}` : ""}
                        </span>
                      </div>
                      <Badge
                        variant={
                          item.acknowledgedAt
                            ? "success"
                            : item.dueAt && item.dueAt.getTime() < now
                              ? "destructive"
                              : "warning"
                        }
                      >
                        {item.acknowledgedAt ? "ACKNOWLEDGED" : item.dueAt && item.dueAt.getTime() < now ? "OVERDUE" : "PENDING"}
                      </Badge>
                    </div>
                    {item.document?.summary ? <span className={styles.itemDescription}>{item.document.summary}</span> : null}
                    {!item.acknowledgedAt && canManageCompliance ? (
                      <form action={acknowledgePolicyAction}>
                        <input type="hidden" name="acknowledgementId" value={item.id} />
                        <Button type="submit" variant="outline" size="sm">
                          Registrar aceite
                        </Button>
                      </form>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.surfaceMuted}>Nenhum aceite de politica pendente para este colaborador.</div>
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}
