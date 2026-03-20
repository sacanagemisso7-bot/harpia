import { HrRequestCategory, HrRequestStatus, PeopleTaskPriority } from "@prisma/client";

import { addHrRequestCommentAction, createHrRequestAction, updateHrRequestStatusAction } from "@/app/(app)/requests/actions";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { hasPermission, requirePermission } from "@/lib/auth/permissions";
import { getTeamMembers } from "@/lib/team/queries";
import { listEmployeesForSelect } from "@/modules/employees/queries";
import { getHrRequestQueueSummary } from "@/modules/hr-requests/queries";

export default async function RequestsPage() {
  const user = await requirePermission("view_hr_requests");
  const [queue, employees, teamMembers] = await Promise.all([
    getHrRequestQueueSummary(user.organizationId),
    listEmployeesForSelect(user.organizationId),
    getTeamMembers(user.organizationId)
  ]);
  const canManage = hasPermission(user.role, "manage_hr_requests");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Internal RH service desk"
        title="Fila interna de solicitacoes"
        description="Centralize demandas de ferias, beneficios, documentos, politicas e suporte interno com status, SLA, responsavel e historico."
      />

      <section className="grid gap-5 xl:grid-cols-4">
        <Card className="panel-hover">
          <CardContent className="p-5">
            <p className="section-intro">Abertas</p>
            <p className="mt-3 text-3xl font-semibold">{queue.metrics.open}</p>
          </CardContent>
        </Card>
        <Card className="panel-hover">
          <CardContent className="p-5">
            <p className="section-intro">SLA em risco</p>
            <p className="mt-3 text-3xl font-semibold">{queue.metrics.atRisk}</p>
          </CardContent>
        </Card>
        <Card className="panel-hover">
          <CardContent className="p-5">
            <p className="section-intro">SLA estourado</p>
            <p className="mt-3 text-3xl font-semibold">{queue.metrics.breached}</p>
          </CardContent>
        </Card>
        <Card className="panel-hover">
          <CardContent className="p-5">
            <p className="section-intro">Resolucao media</p>
            <p className="mt-3 text-3xl font-semibold">{queue.metrics.avgResolutionHours}h</p>
          </CardContent>
        </Card>
      </section>

      <Card className="panel-hover">
        <CardHeader>
          <CardTitle>Abrir solicitacao</CardTitle>
          <CardDescription>Ative o service desk interno com uma trilha clara de dono e SLA.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createHrRequestAction} className="grid gap-4 lg:grid-cols-2">
            <input name="title" required placeholder="Titulo da solicitacao" className="h-11 rounded-2xl border border-border bg-white px-4" />
            <select name="category" defaultValue={HrRequestCategory.GENERAL_SUPPORT} className="h-11 rounded-2xl border border-border bg-white px-4">
              {Object.values(HrRequestCategory).map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <select name="priority" defaultValue={PeopleTaskPriority.MEDIUM} className="h-11 rounded-2xl border border-border bg-white px-4">
              {Object.values(PeopleTaskPriority).map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
            <input name="dueAt" type="date" className="h-11 rounded-2xl border border-border bg-white px-4" />
            <select name="requesterEmployeeId" defaultValue="" className="h-11 rounded-2xl border border-border bg-white px-4">
              <option value="">Solicitante sem colaborador vinculado</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.fullName} - {employee.title}
                </option>
              ))}
            </select>
            <select name="assigneeUserId" defaultValue="" className="h-11 rounded-2xl border border-border bg-white px-4">
              <option value="">Sem responsavel inicial</option>
              {teamMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} - {member.role}
                </option>
              ))}
            </select>
            <textarea name="description" required placeholder="Descricao detalhada da solicitacao" className="min-h-28 rounded-[1.25rem] border border-border bg-white px-4 py-3 lg:col-span-2" />
            <div className="lg:col-span-2">
              <Button type="submit">Criar solicitacao</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="panel-hover">
        <CardHeader>
          <CardTitle>Fila operacional</CardTitle>
          <CardDescription>Solicitacoes com status, SLA e historico curto da conversa.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {queue.requests.length ? (
            queue.requests.map((request) => (
              <div key={request.id} className="rounded-[1.25rem] border border-border/70 bg-white/75 p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{request.title}</p>
                      <Badge variant="outline">{request.category}</Badge>
                      <Badge variant={request.effectiveSlaStatus === "BREACHED" ? "destructive" : request.effectiveSlaStatus === "AT_RISK" ? "warning" : "success"}>
                        {request.effectiveSlaStatus}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{request.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {request.requesterEmployee?.fullName || request.requesterUser?.name || "Solicitante interno"} -{" "}
                      {request.assigneeUser?.name ? `responsavel ${request.assigneeUser.name}` : "sem responsavel definido"}
                    </p>
                  </div>
                  {canManage ? (
                    <form action={updateHrRequestStatusAction} className="flex gap-2">
                      <input type="hidden" name="requestId" value={request.id} />
                      <select name="status" defaultValue={request.status} className="h-11 rounded-2xl border border-border bg-white px-4">
                        {Object.values(HrRequestStatus).map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                      <Button type="submit" variant="outline">
                        Atualizar
                      </Button>
                    </form>
                  ) : null}
                </div>

                {request.comments.length ? (
                  <div className="mt-4 space-y-2">
                    {request.comments.map((comment) => (
                      <div key={comment.id} className="rounded-[1rem] border border-border/70 bg-white p-3 text-sm text-muted-foreground">
                        <strong>{comment.author?.name ?? "Sistema"}:</strong> {comment.message}
                      </div>
                    ))}
                  </div>
                ) : null}

                <form action={addHrRequestCommentAction} className="mt-4 flex gap-2">
                  <input type="hidden" name="requestId" value={request.id} />
                  <input name="message" required placeholder="Adicionar comentario" className="h-11 flex-1 rounded-2xl border border-border bg-white px-4" />
                  <Button type="submit" variant="outline">
                    Comentar
                  </Button>
                </form>
              </div>
            ))
          ) : (
            <div className="rounded-[1.25rem] border border-dashed border-border bg-white/75 p-5 text-sm text-muted-foreground">
              Nenhuma solicitacao interna aberta agora.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
