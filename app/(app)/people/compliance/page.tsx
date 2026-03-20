import { acknowledgePolicyAction } from "@/app/(app)/people/compliance/actions";
import { assignPolicyAction } from "@/app/(app)/people/compliance/actions";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { hasPermission, requirePermission } from "@/lib/auth/permissions";
import { getComplianceSummary } from "@/modules/compliance/queries";
import { listEmployeesForSelect } from "@/modules/employees/queries";
import { getPolicyRolloutOverview, listPolicyDocumentsForSelect } from "@/modules/knowledge/queries";

export default async function CompliancePage() {
  const user = await requirePermission("view_compliance");
  const [compliance, employees, policyDocuments, policyRollouts] = await Promise.all([
    getComplianceSummary(user.organizationId),
    listEmployeesForSelect(user.organizationId),
    listPolicyDocumentsForSelect(user.organizationId, { publishedOnly: true }),
    getPolicyRolloutOverview(user.organizationId)
  ]);
  const canManageCompliance = hasPermission(user.role, "manage_compliance");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Light compliance"
        title="Rastreio operacional de obrigatorios"
        description="Tenha visibilidade de documentos pendentes, trilhas obrigatorias e alertas operacionais sem transformar o produto em consultoria juridica."
      />

      <section className="grid gap-5 xl:grid-cols-4">
        <Card className="panel-hover">
          <CardContent className="p-5">
            <p className="section-intro">Total</p>
            <p className="mt-3 text-3xl font-semibold">{compliance.metrics.total}</p>
          </CardContent>
        </Card>
        <Card className="panel-hover">
          <CardContent className="p-5">
            <p className="section-intro">Pendentes</p>
            <p className="mt-3 text-3xl font-semibold">{compliance.metrics.pending}</p>
          </CardContent>
        </Card>
        <Card className="panel-hover">
          <CardContent className="p-5">
            <p className="section-intro">Atrasados</p>
            <p className="mt-3 text-3xl font-semibold">{compliance.metrics.overdue}</p>
          </CardContent>
        </Card>
        <Card className="panel-hover">
          <CardContent className="p-5">
            <p className="section-intro">Concluidos</p>
            <p className="mt-3 text-3xl font-semibold">{compliance.metrics.completed}</p>
          </CardContent>
        </Card>
      </section>

      {canManageCompliance ? (
        <Card className="panel-hover">
          <CardHeader>
            <CardTitle>Distribuir politica</CardTitle>
            <CardDescription>Atribua uma politica para varios colaboradores, gere o requirement correlato e agende lembretes automaticamente.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={assignPolicyAction} className="grid gap-4 xl:grid-cols-[minmax(0,280px)_minmax(0,1fr)_180px_auto] xl:items-end">
              <label className="grid gap-2 text-sm text-muted-foreground">
                <span>Politica</span>
                <select name="documentId" required className="h-11 rounded-2xl border border-border bg-white px-4">
                  <option value="">Selecione uma politica</option>
                  {policyDocuments.map((document) => (
                    <option key={document.id} value={document.id}>
                      {document.title}
                      {document.versionLabel ? ` · ${document.versionLabel}` : ""}
                      {!document.publishedAt ? " · nao publicada" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm text-muted-foreground">
                <span>Colaboradores</span>
                <select name="employeeIds" multiple required className="min-h-40 rounded-[1.25rem] border border-border bg-white px-4 py-3">
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.fullName} - {employee.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm text-muted-foreground">
                <span>Prazo</span>
                <input name="dueAt" type="date" className="h-11 rounded-2xl border border-border bg-white px-4" />
              </label>
              <Button type="submit" className="h-11">
                Atribuir politica
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card className="panel-hover">
        <CardHeader>
          <CardTitle>Rollouts de policy</CardTitle>
          <CardDescription>Taxa de aceite, pendencias e visibilidade das campanhas de politica em andamento.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {policyRollouts.length ? (
            policyRollouts.map((rollout) => (
              <div key={rollout.id} className="rounded-[1.25rem] border border-border/70 bg-white/75 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="font-semibold">{rollout.title}</p>
                      <Badge variant={rollout.status === "COMPLETED" ? "success" : "outline"}>{rollout.status}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {rollout.document.title}
                      {rollout.document.versionLabel ? ` · ${rollout.document.versionLabel}` : ""}
                      {rollout.document.supersedesDocumentTitle ? ` · supersede ${rollout.document.supersedesDocumentTitle}` : ""}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {rollout.metrics.acceptanceRate}% de aceite · {rollout.metrics.acknowledged}/{rollout.metrics.assigned} confirmados
                    </p>
                  </div>
                  <div className="grid gap-2 text-sm text-muted-foreground">
                    <div className="rounded-full border border-border/70 bg-white px-3 py-2">
                      Pendentes: {rollout.metrics.pending}
                      {rollout.metrics.overdue ? ` · Atrasados: ${rollout.metrics.overdue}` : ""}
                    </div>
                    <div className="rounded-full border border-border/70 bg-white px-3 py-2">
                      Prazo:{" "}
                      {rollout.dueAt ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(rollout.dueAt) : "Sem prazo"}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[1.25rem] border border-dashed border-border bg-white/75 p-5 text-sm text-muted-foreground">
              Nenhum rollout de policy foi iniciado ainda.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="panel-hover">
        <CardHeader>
          <CardTitle>Itens em aberto</CardTitle>
          <CardDescription>Itens obrigatorios por colaborador, com visibilidade de prazo e status.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {compliance.requirements.length ? (
            compliance.requirements.map((item) => (
              <div key={item.id} className="rounded-[1.25rem] border border-border/70 bg-white/75 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {item.employee.fullName} - {item.type}
                      {item.dueAt ? ` - vence em ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(item.dueAt)}` : ""}
                    </p>
                    {item.description ? <p className="mt-2 text-sm text-muted-foreground">{item.description}</p> : null}
                  </div>
                  <Badge variant={item.status === "COMPLETED" ? "success" : item.dueAt && item.dueAt.getTime() < Date.now() ? "destructive" : "warning"}>
                    {item.status}
                  </Badge>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[1.25rem] border border-dashed border-border bg-white/75 p-5 text-sm text-muted-foreground">
              Nenhum item de compliance pendente no momento.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="panel-hover">
        <CardHeader>
          <CardTitle>Aceites de politica</CardTitle>
          <CardDescription>Confirme politicas internas pendentes e acompanhe quem ja registrou aceite.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {compliance.policyAcknowledgements.length ? (
            compliance.policyAcknowledgements.map((item) => (
              <div key={item.id} className="rounded-[1.25rem] border border-border/70 bg-white/75 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {item.employee.fullName}
                      {item.document?.title ? ` - ${item.document.title}` : ""}
                      {item.document?.versionLabel ? ` · ${item.document.versionLabel}` : ""}
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
            <div className="rounded-[1.25rem] border border-dashed border-border bg-white/75 p-5 text-sm text-muted-foreground">
              Nenhum aceite de politica pendente no momento.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
