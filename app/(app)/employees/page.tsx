import Link from "next/link";
import { EmployeeStatus } from "@prisma/client";
import { ArrowRight, Building2, MapPin, ShieldCheck, UsersRound } from "lucide-react";

import { createEmployeeAction } from "@/app/(app)/employees/actions";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { hasPermission, requirePermission } from "@/lib/auth/permissions";
import { listEmployees, listEmployeesForSelect } from "@/modules/employees/queries";

function getBadgeVariant(status: EmployeeStatus) {
  if (status === EmployeeStatus.ACTIVE) {
    return "success" as const;
  }

  if (status === EmployeeStatus.OFFBOARDING || status === EmployeeStatus.INACTIVE) {
    return "warning" as const;
  }

  return "outline" as const;
}

function getWorkflowProgress(steps: Array<{ status: string }>) {
  if (!steps.length) {
    return 0;
  }

  return Math.round((steps.filter((step) => step.status === "DONE").length / steps.length) * 100);
}

export default async function EmployeesPage() {
  const user = await requirePermission("view_employees");
  const [employees, managerOptions] = await Promise.all([listEmployees(user.organizationId), listEmployeesForSelect(user.organizationId)]);
  const canManage = hasPermission(user.role, "manage_employees");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Employee management"
        title="Diretorio interno e visao de colaboradores"
        description="Transforme cada colaborador em uma entidade operacional do produto, com contexto, gestor, status, fluxos ativos e ligacao com tarefas, solicitacoes e compliance."
        actions={
          canManage ? (
            <Button asChild>
              <Link href="/people/onboarding">Abrir onboarding</Link>
            </Button>
          ) : null
        }
      />

      {canManage ? (
        <Card className="panel-hover">
          <CardHeader>
            <CardTitle>Novo colaborador</CardTitle>
            <CardDescription>Cadastre uma pessoa na operacao. O onboarding padrao pode ser gerado automaticamente.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createEmployeeAction} className="grid gap-4 lg:grid-cols-2">
              <input name="fullName" required placeholder="Nome completo" className="h-11 rounded-2xl border border-border bg-white px-4" />
              <input name="preferredName" placeholder="Nome preferido" className="h-11 rounded-2xl border border-border bg-white px-4" />
              <input name="workEmail" type="email" placeholder="Email corporativo" className="h-11 rounded-2xl border border-border bg-white px-4" />
              <input name="personalEmail" type="email" placeholder="Email pessoal" className="h-11 rounded-2xl border border-border bg-white px-4" />
              <input name="title" required placeholder="Cargo" className="h-11 rounded-2xl border border-border bg-white px-4" />
              <input name="department" required placeholder="Time ou area" className="h-11 rounded-2xl border border-border bg-white px-4" />
              <input name="location" placeholder="Localizacao" className="h-11 rounded-2xl border border-border bg-white px-4" />
              <input name="employmentType" placeholder="Tipo de contratacao" className="h-11 rounded-2xl border border-border bg-white px-4" />
              <input name="startDate" type="date" className="h-11 rounded-2xl border border-border bg-white px-4" />
              <select name="status" defaultValue={EmployeeStatus.ONBOARDING} className="h-11 rounded-2xl border border-border bg-white px-4">
                {Object.values(EmployeeStatus).map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <select name="managerEmployeeId" defaultValue="" className="h-11 rounded-2xl border border-border bg-white px-4">
                <option value="">Sem gestor definido</option>
                {managerOptions.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.fullName} - {employee.title}
                  </option>
                ))}
              </select>
              <input name="phone" placeholder="Telefone" className="h-11 rounded-2xl border border-border bg-white px-4" />
              <textarea
                name="notes"
                placeholder="Notas operacionais iniciais"
                className="min-h-28 rounded-[1.25rem] border border-border bg-white px-4 py-3 lg:col-span-2"
              />
              <div className="lg:col-span-2">
                <Button type="submit">Cadastrar colaborador</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-3">
        {employees.length ? (
          employees.map((employee) => (
            <Card key={employee.id} className="panel-hover">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle>{employee.fullName}</CardTitle>
                    <CardDescription>{employee.title}</CardDescription>
                  </div>
                  <Badge variant={getBadgeVariant(employee.status)}>{employee.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    {employee.department}
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    {employee.location || "Localizacao nao informada"}
                  </div>
                  <div className="flex items-center gap-2">
                    <UsersRound className="h-4 w-4 text-primary" />
                    {employee.manager ? `Gestor: ${employee.manager.fullName}` : "Sem gestor definido"}
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    {employee.directReports.length} reporte(s) direto(s)
                  </div>
                </div>

                {employee.workflowRuns.length ? (
                  <div className="space-y-2">
                    {employee.workflowRuns.map((run) => (
                      <div key={run.id} className="rounded-[1rem] border border-border/70 bg-white/75 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold">{run.kind}</span>
                          <Badge variant={run.kind === "ONBOARDING" ? "success" : "warning"}>{getWorkflowProgress(run.steps)}%</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[1rem] border border-dashed border-border bg-white/75 p-3 text-sm text-muted-foreground">
                    Sem fluxos ativos agora.
                  </div>
                )}

                <Button asChild variant="outline">
                  <Link href={`/employees/${employee.id}`}>
                    Abrir perfil
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="panel-hover xl:col-span-3">
            <CardContent className="p-6 text-sm text-muted-foreground">
              Ainda nao ha colaboradores cadastrados. Esse modulo passa a ser a base operacional da empresa para pessoas, processos e historico interno.
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
