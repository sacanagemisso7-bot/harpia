import { HrRequestCategory, HrRequestStatus, PeopleTaskPriority } from "@prisma/client";

import { addHrRequestCommentAction, createHrRequestAction, updateHrRequestStatusAction } from "@/app/(app)/requests/actions";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
    <div className="page-stage space-y-7">
      <PageHeader
        eyebrow="Internal RH service desk"
        title="Fila interna de solicitacoes"
        description="Centralize demandas de ferias, beneficios, documentos, politicas e suporte interno com status, SLA, responsavel e historico."
      />

      <section className="stagger-grid grid gap-5 xl:grid-cols-4">
        <Card className="metric-panel panel-hover">
          <CardContent className="p-5">
            <p className="section-intro">Abertas</p>
            <p className="mt-3 text-3xl font-semibold">{queue.metrics.open}</p>
          </CardContent>
        </Card>
        <Card className="metric-panel panel-hover">
          <CardContent className="p-5">
            <p className="section-intro">SLA em risco</p>
            <p className="mt-3 text-3xl font-semibold">{queue.metrics.atRisk}</p>
          </CardContent>
        </Card>
        <Card className="metric-panel panel-hover">
          <CardContent className="p-5">
            <p className="section-intro">SLA estourado</p>
            <p className="mt-3 text-3xl font-semibold">{queue.metrics.breached}</p>
          </CardContent>
        </Card>
        <Card className="metric-panel panel-hover">
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
            <Input name="title" required placeholder="Titulo da solicitacao" />
            <Select name="category" defaultValue={HrRequestCategory.GENERAL_SUPPORT}>
              {Object.values(HrRequestCategory).map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
            <Select name="priority" defaultValue={PeopleTaskPriority.MEDIUM}>
              {Object.values(PeopleTaskPriority).map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </Select>
            <Input name="dueAt" type="date" />
            <Select name="requesterEmployeeId" defaultValue="">
              <option value="">Solicitante sem colaborador vinculado</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.fullName} - {employee.title}
                </option>
              ))}
            </Select>
            <Select name="assigneeUserId" defaultValue="">
              <option value="">Sem responsavel inicial</option>
              {teamMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} - {member.role}
                </option>
              ))}
            </Select>
            <Textarea name="description" required placeholder="Descricao detalhada da solicitacao" className="min-h-28 lg:col-span-2" />
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
        <CardContent className="data-stack">
          {queue.requests.length ? (
            queue.requests.map((request) => (
              <div key={request.id} className="data-row p-5">
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
                      <Select name="status" defaultValue={request.status}>
                        {Object.values(HrRequestStatus).map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </Select>
                      <Button type="submit" variant="outline">
                        Atualizar
                      </Button>
                    </form>
                  ) : null}
                </div>

                {request.comments.length ? (
                  <div className="mt-4 data-stack">
                    {request.comments.map((comment) => (
                      <div key={comment.id} className="data-row p-3 text-sm text-muted-foreground">
                        <strong>{comment.author?.name ?? "Sistema"}:</strong> {comment.message}
                      </div>
                    ))}
                  </div>
                ) : null}

                <form action={addHrRequestCommentAction} className="mt-4 flex gap-2">
                  <input type="hidden" name="requestId" value={request.id} />
                  <Input name="message" required placeholder="Adicionar comentario" className="flex-1" />
                  <Button type="submit" variant="outline">
                    Comentar
                  </Button>
                </form>
              </div>
            ))
          ) : (
            <div className="data-row data-row-muted p-5 text-sm text-muted-foreground">
              Nenhuma solicitacao interna aberta agora.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
