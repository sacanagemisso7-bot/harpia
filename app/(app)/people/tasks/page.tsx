import { PeopleTaskPriority, PeopleTaskStatus } from "@prisma/client";

import { addPeopleTaskCommentAction, createPeopleTaskAction, updatePeopleTaskStatusAction } from "@/app/(app)/people/actions";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { hasPermission, requirePermission } from "@/lib/auth/permissions";
import { getTeamMembers } from "@/lib/team/queries";
import { listEmployeesForSelect } from "@/modules/employees/queries";
import { getPeopleTaskSummary } from "@/modules/people-tasks/queries";

export default async function PeopleTasksPage() {
  const user = await requirePermission("view_people_tasks");
  const [taskSummary, employees, teamMembers] = await Promise.all([
    getPeopleTaskSummary(user.organizationId),
    listEmployeesForSelect(user.organizationId),
    getTeamMembers(user.organizationId)
  ]);
  const canManage = hasPermission(user.role, "manage_people_tasks");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People tasks"
        title="Execucao operacional do time de RH"
        description="Organize tarefas recorrentes, owners, prazos, comentarios e a origem operacional de cada trabalho que precisa sair do backlog."
      />

      <section className="grid gap-5 xl:grid-cols-4">
        <Card className="panel-hover">
          <CardContent className="p-5">
            <p className="section-intro">Total</p>
            <p className="mt-3 text-3xl font-semibold">{taskSummary.metrics.total}</p>
          </CardContent>
        </Card>
        <Card className="panel-hover">
          <CardContent className="p-5">
            <p className="section-intro">Vencidas</p>
            <p className="mt-3 text-3xl font-semibold">{taskSummary.metrics.overdue}</p>
          </CardContent>
        </Card>
        <Card className="panel-hover">
          <CardContent className="p-5">
            <p className="section-intro">Bloqueadas</p>
            <p className="mt-3 text-3xl font-semibold">{taskSummary.metrics.blocked}</p>
          </CardContent>
        </Card>
        <Card className="panel-hover">
          <CardContent className="p-5">
            <p className="section-intro">Em progresso</p>
            <p className="mt-3 text-3xl font-semibold">{taskSummary.metrics.inProgress}</p>
          </CardContent>
        </Card>
      </section>

      {canManage ? (
        <Card className="panel-hover">
          <CardHeader>
            <CardTitle>Nova tarefa</CardTitle>
            <CardDescription>Tarefa operacional manual ou complementar a um fluxo existente.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createPeopleTaskAction} className="grid gap-4 lg:grid-cols-2">
              <input name="title" required placeholder="Titulo da tarefa" className="h-11 rounded-2xl border border-border bg-white px-4" />
              <select name="priority" defaultValue={PeopleTaskPriority.MEDIUM} className="h-11 rounded-2xl border border-border bg-white px-4">
                {Object.values(PeopleTaskPriority).map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
              <select name="assigneeUserId" defaultValue="" className="h-11 rounded-2xl border border-border bg-white px-4">
                <option value="">Sem responsavel do time</option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} - {member.role}
                  </option>
                ))}
              </select>
              <select name="relatedEmployeeId" defaultValue="" className="h-11 rounded-2xl border border-border bg-white px-4">
                <option value="">Sem colaborador associado</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.fullName} - {employee.title}
                  </option>
                ))}
              </select>
              <input name="dueAt" type="date" className="h-11 rounded-2xl border border-border bg-white px-4" />
              <input name="sourceType" defaultValue="manual" className="h-11 rounded-2xl border border-border bg-white px-4" />
              <textarea name="description" placeholder="Descricao da tarefa" className="min-h-28 rounded-[1.25rem] border border-border bg-white px-4 py-3 lg:col-span-2" />
              <div className="lg:col-span-2">
                <Button type="submit">Criar tarefa</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card className="panel-hover">
        <CardHeader>
          <CardTitle>Backlog operacional</CardTitle>
          <CardDescription>Tarefas por status, owner e contexto operacional.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {taskSummary.tasks.length ? (
            taskSummary.tasks.map((task) => (
              <div key={task.id} className="rounded-[1.25rem] border border-border/70 bg-white/75 p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{task.title}</p>
                      <Badge variant={task.isOverdue ? "destructive" : "outline"}>{task.priority}</Badge>
                      <Badge variant={task.status === "DONE" ? "success" : task.status === "BLOCKED" ? "warning" : "outline"}>{task.status}</Badge>
                    </div>
                    {task.description ? <p className="text-sm text-muted-foreground">{task.description}</p> : null}
                    <p className="text-sm text-muted-foreground">
                      {task.assigneeUser ? `Responsavel: ${task.assigneeUser.name}` : "Sem responsavel"}{task.relatedEmployee ? ` - Colaborador: ${task.relatedEmployee.fullName}` : ""}
                    </p>
                  </div>
                  {canManage ? (
                    <form action={updatePeopleTaskStatusAction} className="flex gap-2">
                      <input type="hidden" name="taskId" value={task.id} />
                      <select name="status" defaultValue={task.status} className="h-11 rounded-2xl border border-border bg-white px-4">
                        {Object.values(PeopleTaskStatus).map((status) => (
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

                {task.comments.length ? (
                  <div className="mt-4 space-y-2">
                    {task.comments.map((comment) => (
                      <div key={comment.id} className="rounded-[1rem] border border-border/70 bg-white p-3 text-sm text-muted-foreground">
                        <strong>{comment.author?.name ?? "Sistema"}:</strong> {comment.message}
                      </div>
                    ))}
                  </div>
                ) : null}

                {canManage ? (
                  <form action={addPeopleTaskCommentAction} className="mt-4 flex gap-2">
                    <input type="hidden" name="taskId" value={task.id} />
                    <input name="message" required placeholder="Adicionar comentario" className="h-11 flex-1 rounded-2xl border border-border bg-white px-4" />
                    <Button type="submit" variant="outline">
                      Comentar
                    </Button>
                  </form>
                ) : null}
              </div>
            ))
          ) : (
            <div className="rounded-[1.25rem] border border-dashed border-border bg-white/75 p-5 text-sm text-muted-foreground">
              Ainda nao ha tarefas operacionais registradas.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
