import { PeopleWorkflowKind, PeopleWorkflowStepStatus } from "@prisma/client";

import { startEmployeeWorkflowAction } from "@/app/(app)/employees/actions";
import { updateWorkflowStepStatusAction } from "@/app/(app)/people/actions";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { hasPermission, requirePermission } from "@/lib/auth/permissions";
import { listEmployeesForSelect } from "@/modules/employees/queries";
import { listWorkflowRunsByKind } from "@/modules/people-ops/queries";

export default async function OnboardingPage() {
  const user = await requirePermission("view_people_command_center");
  const [runs, employees] = await Promise.all([
    listWorkflowRunsByKind(user.organizationId, PeopleWorkflowKind.ONBOARDING),
    listEmployeesForSelect(user.organizationId)
  ]);
  const canManage = hasPermission(user.role, "manage_people_workflows");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Onboarding"
        title="Entrada operacional de novos colaboradores"
        description="Acompanhe checklists por colaborador, owners, progresso, documentos obrigatorios e marcos iniciais da jornada."
      />

      {canManage ? (
        <Card className="panel-hover">
          <CardHeader>
            <CardTitle>Iniciar onboarding</CardTitle>
            <CardDescription>Gere um plano operacional padrao a partir do cadastro do colaborador.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={startEmployeeWorkflowAction} className="flex flex-col gap-4 lg:flex-row">
              <input type="hidden" name="kind" value={PeopleWorkflowKind.ONBOARDING} />
              <select name="employeeId" required defaultValue="" className="h-11 min-w-0 flex-1 rounded-2xl border border-border bg-white px-4">
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
          </CardContent>
        </Card>
      ) : null}

      <Card className="panel-hover">
        <CardHeader>
          <CardTitle>Planos ativos</CardTitle>
          <CardDescription>Checklist por colaborador com visibilidade do que esta feito, bloqueado ou pendente.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {runs.length ? (
            runs.map((run) => (
              <div key={run.id} className="rounded-[1.25rem] border border-border/70 bg-white/75 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold">{run.employee.fullName}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{run.employee.title}</p>
                  </div>
                  <Badge variant={run.status === "COMPLETED" ? "success" : "outline"}>{run.status}</Badge>
                </div>

                <div className="mt-4 grid gap-3">
                  {run.steps.map((step) => (
                    <div key={step.id} className="rounded-[1rem] border border-border/70 bg-white p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="font-medium">{step.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {step.ownerLabel}
                            {step.dueAt
                              ? ` - vence em ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(step.dueAt)}`
                              : ""}
                          </p>
                        </div>
                        {canManage ? (
                          <form action={updateWorkflowStepStatusAction} className="flex gap-2">
                            <input type="hidden" name="stepId" value={step.id} />
                            <select name="status" defaultValue={step.status} className="h-11 rounded-2xl border border-border bg-white px-4">
                              {Object.values(PeopleWorkflowStepStatus).map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                            <Button type="submit" variant="outline">
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
            ))
          ) : (
            <div className="rounded-[1.25rem] border border-dashed border-border bg-white/75 p-5 text-sm text-muted-foreground">
              Nenhum onboarding foi iniciado ainda.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
