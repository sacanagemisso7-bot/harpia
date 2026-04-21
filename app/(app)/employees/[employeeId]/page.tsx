import { EmployeeCheckInType, EmployeeStatus, PeopleWorkflowKind } from "@prisma/client";
import { ClipboardCheck, ShieldCheck, UserRoundCog, Workflow } from "lucide-react";
import { notFound } from "next/navigation";

import {
  createEmployeeCheckInAction,
  startEmployeeWorkflowAction,
  updateEmployeeContextAction,
  updateEmployeeStatusAction
} from "@/app/(app)/employees/actions";
import { acknowledgePolicyAction } from "@/app/(app)/people/compliance/actions";
import { AiNextStepCard } from "@/components/ai/ai-next-step-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { buildEmployeeNextStep } from "@/lib/ai/next-step";
import { hasPermission, requirePermission } from "@/lib/auth/permissions";
import { getEmployeeProfile, listEmployeesForSelect } from "@/modules/employees/queries";

import styles from "@/components/operations/ops-workspace.module.css";

function getStatusVariant(status: EmployeeStatus) {
  if (status === EmployeeStatus.ACTIVE) {
    return "success" as const;
  }

  if (status === EmployeeStatus.OFFBOARDING || status === EmployeeStatus.INACTIVE) {
    return "warning" as const;
  }

  return "outline" as const;
}

function formatTokenLabel(value: string) {
  const labels: Record<string, string> = {
    ACTIVE: "Ativo",
    ONBOARDING: "Onboarding",
    OFFBOARDING: "Offboarding",
    INACTIVE: "Inativo",
    COMPLETED: "Concluído",
    PENDING: "Pendente",
    IN_PROGRESS: "Em andamento",
    BLOCKED: "Bloqueado",
    DONE: "Concluído",
    CHECK_IN: "Check-in",
    FOLLOW_UP: "Follow-up",
    ALERT: "Alerta"
  };

  if (labels[value]) {
    return labels[value];
  }

  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDateInput(date: Date | null) {
  if (!date) {
    return "";
  }

  const normalized = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return normalized.toISOString().slice(0, 10);
}

export default async function EmployeeProfilePage({
  params
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const user = await requirePermission("view_employees");
  const { employeeId } = await params;
  const [employee, managerOptions] = await Promise.all([
    getEmployeeProfile(user.organizationId, employeeId),
    listEmployeesForSelect(user.organizationId)
  ]);

  if (!employee) {
    notFound();
  }

  const canManageWorkflows = hasPermission(user.role, "manage_people_workflows");
  const canManageCheckins = hasPermission(user.role, "manage_checkins");
  const canManageCompliance = hasPermission(user.role, "manage_compliance");
  const canManageEmployees = hasPermission(user.role, "manage_employees");
  const openComplianceCount =
    employee.complianceRequirements.filter((item) => item.status === "PENDING").length +
    employee.policyAcknowledgements.filter((item) => !item.acknowledgedAt).length;
  const hasActiveOnboardingRun = employee.workflowRuns.some(
    (run) => run.kind === PeopleWorkflowKind.ONBOARDING && run.status !== "COMPLETED"
  );
  const openRequestCount = employee.requestedHrRequests.filter(
    (request) => request.status !== "RESOLVED" && request.status !== "CANCELED"
  ).length;
  const openTaskCount = employee.relatedTasks.filter((task) => task.status !== "DONE").length;
  const employeeNextStep = buildEmployeeNextStep({
    status: employee.status,
    hasActiveOnboardingRun,
    checkInCount: employee.checkIns.length,
    openComplianceCount,
    openRequestCount,
    openTaskCount
  });
  const now = Date.now();

  const stats = [
    { label: "Gestor", value: employee.manager?.fullName ?? "--" },
    { label: "Solicitações", value: employee.requestedHrRequests.length },
    { label: "Tarefas", value: employee.relatedTasks.length },
    { label: "Compliance", value: openComplianceCount }
  ];

  return (
    <div className={styles.workspace}>
      <div className={styles.header}>
        <span className={styles.eyebrow}>Colaborador</span>
        <h2 className={styles.title}>{employee.fullName}</h2>
        <p className={styles.description}>
          {employee.title} · {employee.department}
          {employee.location ? ` · ${employee.location}` : ""}
        </p>
      </div>

      <div className={styles.statRow}>
        {stats.map((stat) => (
          <div key={stat.label} className={styles.statPill}>
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </div>
        ))}
        <div className={styles.statPill}>
          <strong>{formatTokenLabel(employee.status)}</strong>
          <span>Status</span>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.detailColumn}>
          <section className={styles.detailPanel}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.panelTitle}>Fonte de verdade operacional</h3>
              <Badge variant={getStatusVariant(employee.status)}>{formatTokenLabel(employee.status)}</Badge>
            </div>

            <div className={styles.detailGrid}>
              <div className={styles.detailCell}>
                <span className={styles.metaLabel}>Cargo</span>
                <span className={styles.metaValue}>{employee.title}</span>
              </div>
              <div className={styles.detailCell}>
                <span className={styles.metaLabel}>Time</span>
                <span className={styles.metaValue}>{employee.department}</span>
              </div>
              <div className={styles.detailCell}>
                <span className={styles.metaLabel}>Localização</span>
                <span className={styles.metaValue}>{employee.location || "Não informada"}</span>
              </div>
              <div className={styles.detailCell}>
                <span className={styles.metaLabel}>Tipo de contratação</span>
                <span className={styles.metaValue}>{employee.employmentType || "Não informado"}</span>
              </div>
              <div className={styles.detailCell}>
                <span className={styles.metaLabel}>Entrada</span>
                <span className={styles.metaValue}>
                  {employee.startDate
                    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(employee.startDate)
                    : "Não informada"}
                </span>
              </div>
              <div className={styles.detailCell}>
                <span className={styles.metaLabel}>E-mail</span>
                <span className={styles.metaValue}>{employee.workEmail || "Não informado"}</span>
              </div>
            </div>

            <div className={styles.detailCell}>
              <span className={styles.metaLabel}>Notas iniciais</span>
              <p className={styles.detailText}>{employee.notes || "Sem notas iniciais registradas para este colaborador."}</p>
            </div>
          </section>

          <section className={styles.detailPanel}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.panelTitle}>Fluxos e progresso</h3>
            </div>

            {employee.workflowRuns.length ? (
              <div className={styles.commentList}>
                {employee.workflowRuns.map((run) => (
                  <div key={run.id} className={styles.commentItem}>
                    <div className={styles.sectionHeader}>
                      <span className={styles.commentAuthor}>{run.title}</span>
                      <Badge variant={run.status === "COMPLETED" ? "success" : "outline"}>{formatTokenLabel(run.status)}</Badge>
                    </div>
                    <p className={styles.commentBody}>{formatTokenLabel(run.kind)}</p>
                    <div className={styles.detailGrid}>
                      {run.steps.map((step) => (
                        <div key={step.id} className={styles.detailCell}>
                          <span className={styles.metaLabel}>{step.ownerLabel}</span>
                          <span className={styles.metaValue}>{step.title}</span>
                          <p className={styles.detailText}>{formatTokenLabel(step.status)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.emptyState}>Nenhum fluxo operacional registrado para este colaborador ainda.</p>
            )}
          </section>

          <section className={styles.detailPanel}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.panelTitle}>Carga operacional</h3>
            </div>

            <div className={styles.detailGrid}>
              <div className={styles.detailCell}>
                <span className={styles.metaLabel}>Solicitações</span>
                {employee.requestedHrRequests.length ? (
                  employee.requestedHrRequests.map((request) => (
                    <p key={request.id} className={styles.detailText}>
                      {request.title} · {formatTokenLabel(request.status)}
                    </p>
                  ))
                ) : (
                  <p className={styles.detailText}>Sem solicitações ligadas a este colaborador.</p>
                )}
              </div>

              <div className={styles.detailCell}>
                <span className={styles.metaLabel}>Tarefas</span>
                {employee.relatedTasks.length ? (
                  employee.relatedTasks.map((task) => (
                    <p key={task.id} className={styles.detailText}>
                      {task.title} · {formatTokenLabel(task.status)}
                    </p>
                  ))
                ) : (
                  <p className={styles.detailText}>Sem tarefas vinculadas neste momento.</p>
                )}
              </div>
            </div>
          </section>

          <section className={styles.formPanel}>
            <div className={styles.panelHeader}>
              <h3 className={styles.panelTitle}>Acompanhamento humano</h3>
              <p className={styles.panelDescription}>Registros rápidos, follow-ups e contexto qualitativo do time.</p>
            </div>

            {employee.checkIns.length ? (
              <div className={styles.commentList}>
                {employee.checkIns.map((entry) => (
                  <div key={entry.id} className={styles.commentItem}>
                    <div className={styles.sectionHeader}>
                      <span className={styles.commentAuthor}>{entry.title}</span>
                      <Badge variant="outline">{formatTokenLabel(entry.type)}</Badge>
                    </div>
                    <p className={styles.commentBody}>{entry.author.name}</p>
                    {entry.summary ? <p className={styles.commentBody}>{entry.summary}</p> : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.emptyState}>Nenhum registro de acompanhamento ainda.</p>
            )}
          </section>
        </div>

        <aside className={styles.detailColumn}>
          <AiNextStepCard
            recommendedStep={employeeNextStep.recommendedStep}
            reason={employeeNextStep.reason}
            tone={employeeNextStep.tone}
          >
            {employeeNextStep.actionKey === "start_onboarding" && canManageWorkflows ? (
              <form action={startEmployeeWorkflowAction}>
                <input type="hidden" name="employeeId" value={employee.id} />
                <input type="hidden" name="kind" value={PeopleWorkflowKind.ONBOARDING} />
                <Button type="submit" size="sm">
                  {employeeNextStep.actionLabel}
                </Button>
              </form>
            ) : employeeNextStep.actionKey === "open_request" ? (
              <Button asChild size="sm" variant="outline">
                <a href="/requests">{employeeNextStep.actionLabel}</a>
              </Button>
            ) : employeeNextStep.actionKey === "follow_up" && canManageCheckins ? (
              <Button asChild size="sm" variant="outline">
                <a href="#employee-checkin-compose">{employeeNextStep.actionLabel}</a>
              </Button>
            ) : (
              <Button asChild size="sm" variant="outline">
                <a href="/requests">Abrir request</a>
              </Button>
            )}
          </AiNextStepCard>

          {canManageEmployees ? (
            <section className={styles.formPanel}>
              <div className={styles.panelHeader}>
                <h3 className={styles.panelTitle}>Status do vínculo</h3>
                <p className={styles.panelDescription}>Altere o estado do colaborador sem abrir um fluxo separado.</p>
              </div>

              <div className={styles.quickActions}>
                {Object.values(EmployeeStatus).map((status) => (
                  <form key={status} action={updateEmployeeStatusAction}>
                    <input type="hidden" name="employeeId" value={employee.id} />
                    <input type="hidden" name="status" value={status} />
                    <Button
                      type="submit"
                      size="sm"
                      variant={status === employee.status ? "default" : "outline"}
                      className={styles.quickActionButton}
                      disabled={status === employee.status}
                    >
                      {formatTokenLabel(status)}
                    </Button>
                  </form>
                ))}
              </div>
            </section>
          ) : null}

          {canManageEmployees ? (
            <section className={styles.formPanel}>
              <div className={styles.panelHeader}>
                <h3 className={styles.panelTitle}>Contexto rápido</h3>
                <p className={styles.panelDescription}>Edite os dados mais usados sem sair do perfil.</p>
              </div>

              <form action={updateEmployeeContextAction} className={styles.formGrid}>
                <input type="hidden" name="employeeId" value={employee.id} />

                <div className={styles.formGrid2}>
                  <Input name="title" defaultValue={employee.title} placeholder="Cargo" className={styles.fieldCompact} />
                  <Input name="department" defaultValue={employee.department} placeholder="Time" className={styles.fieldCompact} />
                </div>

                <div className={styles.formGrid2}>
                  <Select name="managerEmployeeId" defaultValue={employee.manager?.id ?? ""} className={styles.selectCompact}>
                    <option value="">Sem gestor definido</option>
                    {managerOptions
                      .filter((option) => option.id !== employee.id)
                      .map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.fullName} - {option.title}
                        </option>
                      ))}
                  </Select>
                  <Input
                    name="employmentType"
                    defaultValue={employee.employmentType ?? ""}
                    placeholder="Tipo de contratação"
                    className={styles.fieldCompact}
                  />
                </div>

                <div className={styles.formGrid2}>
                  <Input name="location" defaultValue={employee.location ?? ""} placeholder="Localização" className={styles.fieldCompact} />
                  <Input
                    name="workEmail"
                    type="email"
                    defaultValue={employee.workEmail ?? ""}
                    placeholder="E-mail de trabalho"
                    className={styles.fieldCompact}
                  />
                </div>

                <Input
                  name="startDate"
                  type="date"
                  defaultValue={formatDateInput(employee.startDate)}
                  className={styles.fieldCompact}
                />

                <div className="flex justify-end">
                  <Button type="submit" variant="outline">
                    Salvar contexto
                  </Button>
                </div>
              </form>
            </section>
          ) : null}

          {canManageWorkflows ? (
            <section className={styles.formPanel}>
              <div className={styles.panelHeader}>
                <h3 className={styles.panelTitle}>Fluxos operacionais</h3>
                <p className={styles.panelDescription}>Inicie onboarding ou offboarding sem sair do perfil.</p>
              </div>

              <div className={styles.sectionStack}>
                <form action={startEmployeeWorkflowAction}>
                  <input type="hidden" name="employeeId" value={employee.id} />
                  <input type="hidden" name="kind" value={PeopleWorkflowKind.ONBOARDING} />
                  <Button type="submit" variant="outline" className="w-full">
                    <Workflow className="mr-2 h-4 w-4" />
                    Iniciar onboarding
                  </Button>
                </form>

                <form action={startEmployeeWorkflowAction}>
                  <input type="hidden" name="employeeId" value={employee.id} />
                  <input type="hidden" name="kind" value={PeopleWorkflowKind.OFFBOARDING} />
                  <Button type="submit" variant="destructive" className="w-full">
                    <Workflow className="mr-2 h-4 w-4" />
                    Iniciar offboarding
                  </Button>
                </form>
              </div>
            </section>
          ) : null}

          {canManageCheckins ? (
            <section id="employee-checkin-compose" className={styles.formPanel}>
              <div className={styles.panelHeader}>
                <h3 className={styles.panelTitle}>Novo registro</h3>
                <p className={styles.panelDescription}>Check-ins, alertas e follow-ups no mesmo fluxo.</p>
              </div>

              <form action={createEmployeeCheckInAction} className="grid gap-4">
                <input type="hidden" name="employeeId" value={employee.id} />
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="grid gap-2">
                    <span className="text-xs text-muted-foreground">Tipo</span>
                    <Select name="type" defaultValue={EmployeeCheckInType.CHECK_IN}>
                      {Object.values(EmployeeCheckInType).map((type) => (
                        <option key={type} value={type}>
                          {formatTokenLabel(type)}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <span className="text-xs text-muted-foreground">Follow-up</span>
                    <Input name="followUpAt" type="date" />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Input name="title" required placeholder="Título curto do registro" />
                </div>

                <details className={styles.disclosureCard}>
                  <summary className={styles.disclosureSummary}>
                    Adicionar resumo opcional
                  </summary>
                  <div className="mt-3 grid gap-2">
                    <Textarea name="summary" placeholder="Resumo do acompanhamento" className="min-h-24" />
                  </div>
                </details>

                <div className="flex justify-end">
                  <Button type="submit">
                    <ClipboardCheck className="mr-2 h-4 w-4" />
                    Salvar registro
                  </Button>
                </div>
              </form>
            </section>
          ) : null}

          <section className={styles.detailPanel}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.panelTitle}>Compliance</h3>
            </div>

            {employee.complianceRequirements.length ? (
              <div className={styles.sectionStack}>
                {employee.complianceRequirements.map((item) => (
                  <div key={item.id} className={styles.detailCell}>
                    <div className={styles.sectionHeader}>
                      <span className={styles.metaValue}>
                        <ShieldCheck className="mr-2 inline h-4 w-4" />
                        {item.title}
                      </span>
                      <Badge variant={item.status === "COMPLETED" ? "success" : "warning"}>{formatTokenLabel(item.status)}</Badge>
                    </div>
                    <p className={styles.detailText}>{formatTokenLabel(item.type)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.emptyState}>Nenhum item de compliance em aberto.</p>
            )}
          </section>

          <section className={styles.detailPanel}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.panelTitle}>Aceites de política</h3>
            </div>

            {employee.policyAcknowledgements.length ? (
              <div className={styles.sectionStack}>
                {employee.policyAcknowledgements.map((item) => (
                  <div key={item.id} className={styles.detailCell}>
                    <div className={styles.sectionHeader}>
                      <span className={styles.metaValue}>
                        <UserRoundCog className="mr-2 inline h-4 w-4" />
                        {item.title}
                      </span>
                      <Badge
                        variant={
                          item.acknowledgedAt
                            ? "success"
                            : item.dueAt && item.dueAt.getTime() < now
                              ? "destructive"
                              : "warning"
                        }
                      >
                        {item.acknowledgedAt ? "Aceito" : item.dueAt && item.dueAt.getTime() < now ? "Atrasado" : "Pendente"}
                      </Badge>
                    </div>
                    <p className={styles.detailText}>
                      {item.document?.title ?? "Política interna"}
                      {item.document?.versionLabel ? ` · ${item.document.versionLabel}` : ""}
                    </p>
                    {item.document?.summary ? <p className={styles.detailText}>{item.document.summary}</p> : null}

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
              <p className={styles.emptyState}>Nenhum aceite pendente para este colaborador.</p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
