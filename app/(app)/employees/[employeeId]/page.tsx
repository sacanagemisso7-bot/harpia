import { EmployeeCheckInType, EmployeeStatus, PeopleWorkflowKind } from "@prisma/client";
import { notFound } from "next/navigation";

import { createEmployeeCheckInAction, startEmployeeWorkflowAction } from "@/app/(app)/employees/actions";
import { acknowledgePolicyAction } from "@/app/(app)/people/compliance/actions";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { hasPermission, requirePermission } from "@/lib/auth/permissions";
import { getEmployeeProfile } from "@/modules/employees/queries";

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

  return (
    <div className="page-stage space-y-7">
      <PageHeader
        eyebrow="Employee profile"
        title={employee.fullName}
        description={`${employee.title} em ${employee.department}. Perfil operacional com historico, tarefas, solicitacoes, compliance e acompanhamento humano.`}
        actions={<Badge variant={getStatusVariant(employee.status)}>{employee.status}</Badge>}
      />

      <section className="stagger-grid grid gap-5 xl:grid-cols-4">
        <Card className="metric-panel panel-hover">
          <CardContent className="p-5">
            <p className="section-intro">Gestor</p>
            <p className="mt-3 text-lg font-semibold">{employee.manager?.fullName ?? "Sem gestor"}</p>
          </CardContent>
        </Card>
        <Card className="metric-panel panel-hover">
          <CardContent className="p-5">
            <p className="section-intro">Solicitacoes</p>
            <p className="mt-3 text-lg font-semibold">{employee.requestedHrRequests.length}</p>
          </CardContent>
        </Card>
        <Card className="metric-panel panel-hover">
          <CardContent className="p-5">
            <p className="section-intro">Tarefas</p>
            <p className="mt-3 text-lg font-semibold">{employee.relatedTasks.length}</p>
          </CardContent>
        </Card>
        <Card className="metric-panel panel-hover">
          <CardContent className="p-5">
            <p className="section-intro">Compliance</p>
            <p className="mt-3 text-lg font-semibold">
              {employee.complianceRequirements.filter((item) => item.status === "PENDING").length +
                employee.policyAcknowledgements.filter((item) => !item.acknowledgedAt).length}
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card className="panel-hover">
            <CardHeader>
              <CardTitle>Dados principais</CardTitle>
              <CardDescription>Fonte de verdade operacional para o colaborador.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm text-muted-foreground">
              <div className="data-row p-4">Cargo: {employee.title}</div>
              <div className="data-row p-4">Time: {employee.department}</div>
              <div className="data-row p-4">Localizacao: {employee.location || "Nao informada"}</div>
              <div className="data-row p-4">Tipo de contratacao: {employee.employmentType || "Nao informado"}</div>
              <div className="data-row p-4">
                Entrada: {employee.startDate ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(employee.startDate) : "Nao informada"}
              </div>
              <div className="data-row p-4">Email: {employee.workEmail || "Nao informado"}</div>
              <div className="data-row p-4">Observacoes: {employee.notes || "Sem notas iniciais"}</div>
            </CardContent>
          </Card>

          {canManageWorkflows ? (
            <Card className="panel-hover">
              <CardHeader>
                <CardTitle>Fluxos operacionais</CardTitle>
                <CardDescription>Gerar ou reabrir fluxos de onboarding e offboarding.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <form action={startEmployeeWorkflowAction}>
                  <input type="hidden" name="employeeId" value={employee.id} />
                  <input type="hidden" name="kind" value={PeopleWorkflowKind.ONBOARDING} />
                  <Button type="submit" variant="outline">
                    Iniciar onboarding
                  </Button>
                </form>
                <form action={startEmployeeWorkflowAction}>
                  <input type="hidden" name="employeeId" value={employee.id} />
                  <input type="hidden" name="kind" value={PeopleWorkflowKind.OFFBOARDING} />
                  <Button type="submit" variant="destructive">
                    Iniciar offboarding
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}

          {canManageCheckins ? (
            <Card className="panel-hover">
              <CardHeader>
                <CardTitle>Novo registro</CardTitle>
                <CardDescription>Check-in, feedback, probation ou nota operacional.</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={createEmployeeCheckInAction} className="grid gap-4">
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
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card className="panel-hover">
            <CardHeader>
              <CardTitle>Workflow history</CardTitle>
              <CardDescription>Onboarding, offboarding e progresso das etapas.</CardDescription>
            </CardHeader>
            <CardContent className="data-stack">
              {employee.workflowRuns.length ? (
                employee.workflowRuns.map((run) => (
                  <div key={run.id} className="data-row">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{run.title}</p>
                        <p className="text-sm text-muted-foreground">{run.kind}</p>
                      </div>
                      <Badge variant={run.status === "COMPLETED" ? "success" : "outline"}>{run.status}</Badge>
                    </div>
                    <div className="mt-4 data-stack">
                      {run.steps.map((step) => (
                        <div key={step.id} className="data-row p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-medium">{step.title}</p>
                              <p className="text-sm text-muted-foreground">{step.ownerLabel}</p>
                            </div>
                            <Badge variant={step.status === "DONE" ? "success" : step.status === "BLOCKED" ? "warning" : "outline"}>
                              {step.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="data-row data-row-muted p-4 text-sm text-muted-foreground">
                  Nenhum fluxo operacional registrado para este colaborador ainda.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="panel-hover">
            <CardHeader>
              <CardTitle>Requests e tasks</CardTitle>
              <CardDescription>Visao resumida da carga operacional ligada a esta pessoa.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3">
                <p className="section-intro">Solicitacoes</p>
                {employee.requestedHrRequests.length ? (
                  employee.requestedHrRequests.map((request) => (
                    <div key={request.id} className="data-row p-3">
                      <p className="font-medium">{request.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{request.status}</p>
                    </div>
                  ))
                ) : (
                  <div className="data-row data-row-muted p-3 text-sm text-muted-foreground">
                    Sem solicitacoes para este colaborador.
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <p className="section-intro">Tarefas</p>
                {employee.relatedTasks.length ? (
                  employee.relatedTasks.map((task) => (
                    <div key={task.id} className="data-row p-3">
                      <p className="font-medium">{task.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{task.status}</p>
                    </div>
                  ))
                ) : (
                  <div className="data-row data-row-muted p-3 text-sm text-muted-foreground">
                    Sem tarefas vinculadas agora.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <section className="grid gap-6 xl:grid-cols-2">
            <Card className="panel-hover">
              <CardHeader>
                <CardTitle>Compliance</CardTitle>
                <CardDescription>Documentos e trilhas obrigatorias.</CardDescription>
              </CardHeader>
              <CardContent className="data-stack">
                {employee.complianceRequirements.length ? (
                  employee.complianceRequirements.map((item) => (
                    <div key={item.id} className="data-row p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">{item.title}</p>
                          <p className="text-sm text-muted-foreground">{item.type}</p>
                        </div>
                        <Badge variant={item.status === "COMPLETED" ? "success" : "warning"}>{item.status}</Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="data-row data-row-muted p-3 text-sm text-muted-foreground">
                    Nenhum item de compliance em aberto.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="panel-hover">
              <CardHeader>
                <CardTitle>Policy acknowledgements</CardTitle>
                <CardDescription>Aceites de politica e confirmacoes operacionais desta pessoa.</CardDescription>
              </CardHeader>
              <CardContent className="data-stack">
                {employee.policyAcknowledgements.length ? (
                  employee.policyAcknowledgements.map((item) => (
                    <div key={item.id} className="data-row p-3">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="font-medium">{item.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.document?.title ?? "Politica interna"}
                            {item.document?.versionLabel ? ` - ${item.document.versionLabel}` : ""}
                            {item.dueAt ? ` - vence em ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(item.dueAt)}` : ""}
                          </p>
                          {item.document?.summary ? <p className="mt-2 text-sm text-muted-foreground">{item.document.summary}</p> : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant={
                              item.acknowledgedAt
                                ? "success"
                                : item.dueAt && item.dueAt.getTime() < Date.now()
                                  ? "destructive"
                                  : "warning"
                            }
                          >
                            {item.acknowledgedAt ? "ACKNOWLEDGED" : item.dueAt && item.dueAt.getTime() < Date.now() ? "OVERDUE" : "PENDING"}
                          </Badge>
                          {!item.acknowledgedAt && canManageCompliance ? (
                            <form action={acknowledgePolicyAction}>
                              <input type="hidden" name="acknowledgementId" value={item.id} />
                              <Button type="submit" variant="outline">
                                Registrar aceite
                              </Button>
                            </form>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="data-row data-row-muted p-3 text-sm text-muted-foreground">
                    Nenhum aceite de politica pendente para este colaborador.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="panel-hover">
              <CardHeader>
                <CardTitle>Check-ins e notas</CardTitle>
                <CardDescription>Acompanhamento humano e historico operacional.</CardDescription>
              </CardHeader>
              <CardContent className="data-stack">
                {employee.checkIns.length ? (
                  employee.checkIns.map((entry) => (
                    <div key={entry.id} className="data-row p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">{entry.title}</p>
                          <p className="text-sm text-muted-foreground">{entry.author.name}</p>
                        </div>
                        <Badge variant="outline">{entry.type}</Badge>
                      </div>
                      {entry.summary ? <p className="mt-2 text-sm text-muted-foreground">{entry.summary}</p> : null}
                    </div>
                  ))
                ) : (
                  <div className="data-row data-row-muted p-3 text-sm text-muted-foreground">
                    Nenhum registro de acompanhamento ainda.
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </div>
      </section>
    </div>
  );
}
