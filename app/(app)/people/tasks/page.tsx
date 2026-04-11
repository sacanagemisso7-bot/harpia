import { PeopleTaskPriority, PeopleTaskStatus } from "@prisma/client";

import { addPeopleTaskCommentAction, createPeopleTaskAction, updatePeopleTaskStatusAction } from "@/app/(app)/people/actions";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { hasPermission, requirePermission } from "@/lib/auth/permissions";
import { getTeamMembers } from "@/lib/team/queries";
import { listEmployeesForSelect } from "@/modules/employees/queries";
import { getPeopleTaskSummary } from "@/modules/people-tasks/queries";

import styles from "../../workspace-expansion.module.css";

export default async function PeopleTasksPage() {
  const user = await requirePermission("view_people_tasks");
  const [taskSummary, employees, teamMembers] = await Promise.all([
    getPeopleTaskSummary(user.organizationId),
    listEmployeesForSelect(user.organizationId),
    getTeamMembers(user.organizationId)
  ]);
  const canManage = hasPermission(user.role, "manage_people_tasks");

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="People tasks"
        title="Execucao operacional do time de RH"
        description="Owners, prazos, comentarios e origem operacional de tudo que precisa sair do backlog."
      />

      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Total</span>
          <strong className={styles.statValue}>{taskSummary.metrics.total}</strong>
          <span className={styles.statHint}>Tarefas visiveis na fila operacional.</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Vencidas</span>
          <strong className={styles.statValue}>{taskSummary.metrics.overdue}</strong>
          <span className={styles.statHint}>Itens que pedem follow-up imediato.</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Bloqueadas</span>
          <strong className={styles.statValue}>{taskSummary.metrics.blocked}</strong>
          <span className={styles.statHint}>Demandas travadas por dependencia externa.</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Em progresso</span>
          <strong className={styles.statValue}>{taskSummary.metrics.inProgress}</strong>
          <span className={styles.statHint}>Tarefas que ja estao em execucao pelo time.</span>
        </div>
      </section>

      <section className={styles.detailLayout}>
        <div className={styles.column}>
          {canManage ? (
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <span className={styles.panelEyebrow}>New task</span>
                <h2 className={styles.panelTitle}>Criar tarefa operacional</h2>
                <p className={styles.panelDescription}>Item manual ou complementar a um fluxo existente.</p>
              </div>
              <form action={createPeopleTaskAction} className={styles.actionCluster}>
                <div className={styles.subGrid2}>
                  <input name="title" required placeholder="Titulo da tarefa" className={styles.field} />
                  <select name="priority" defaultValue={PeopleTaskPriority.MEDIUM} className={styles.select}>
                    {Object.values(PeopleTaskPriority).map((priority) => (
                      <option key={priority} value={priority}>
                        {priority}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.subGrid2}>
                  <select name="assigneeUserId" defaultValue="" className={styles.select}>
                    <option value="">Sem responsavel do time</option>
                    {teamMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name} - {member.role}
                      </option>
                    ))}
                  </select>
                  <select name="relatedEmployeeId" defaultValue="" className={styles.select}>
                    <option value="">Sem colaborador associado</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.fullName} - {employee.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.subGrid2}>
                  <input name="dueAt" type="date" className={styles.field} />
                  <input name="sourceType" defaultValue="manual" className={styles.field} />
                </div>
                <textarea name="description" placeholder="Descricao da tarefa" className={styles.textarea} />
                <Button type="submit">Criar tarefa</Button>
              </form>
            </div>
          ) : null}

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Backlog</span>
              <h2 className={styles.panelTitle}>Fila operacional</h2>
              <p className={styles.panelDescription}>Tarefas por status, owner e contexto operacional.</p>
            </div>
            {taskSummary.tasks.length ? (
              <div className={styles.list}>
                {taskSummary.tasks.map((task) => (
                  <div key={task.id} className={styles.listItem}>
                    <div className={styles.itemHeader}>
                      <div className={styles.itemLead}>
                        <strong className={styles.itemTitle}>{task.title}</strong>
                        <span className={styles.itemSubtitle}>
                          {task.assigneeUser ? `Responsavel: ${task.assigneeUser.name}` : "Sem responsavel"}
                          {task.relatedEmployee ? ` - Colaborador: ${task.relatedEmployee.fullName}` : ""}
                        </span>
                      </div>
                      <div className={styles.tagWrap}>
                        <Badge variant={task.isOverdue ? "destructive" : "outline"}>{task.priority}</Badge>
                        <Badge variant={task.status === "DONE" ? "success" : task.status === "BLOCKED" ? "warning" : "outline"}>{task.status}</Badge>
                      </div>
                    </div>
                    {task.description ? <span className={styles.itemDescription}>{task.description}</span> : null}

                    {canManage ? (
                      <form action={updatePeopleTaskStatusAction} className={styles.subGrid2}>
                        <input type="hidden" name="taskId" value={task.id} />
                        <select name="status" defaultValue={task.status} className={styles.select}>
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

                    {task.comments.length ? (
                      <div className={styles.list}>
                        {task.comments.map((comment) => (
                          <div key={comment.id} className={styles.surfaceMuted}>
                            <strong className={styles.itemTitle}>{comment.author?.name ?? "Sistema"}</strong>
                            <span className={styles.itemDescription}>{comment.message}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {canManage ? (
                      <form action={addPeopleTaskCommentAction} className={styles.subGrid2}>
                        <input type="hidden" name="taskId" value={task.id} />
                        <input name="message" required placeholder="Adicionar comentario" className={styles.field} />
                        <Button type="submit" variant="outline">
                          Comentar
                        </Button>
                      </form>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>Ainda não ha tarefas operacionais registradas.</div>
            )}
          </div>
        </div>

        <aside className={styles.stickyAside}>
          <div className={styles.spotlight}>
            <span className={styles.panelEyebrow}>Queue health</span>
            <strong className={styles.spotlightValue}>{taskSummary.metrics.overdue}</strong>
            <p className={styles.panelDescription}>Itens vencidos que mais pressionam a operação.</p>
          </div>
          <div className={styles.panel}>
            <div className={styles.list}>
              <div className={styles.listItem}>
                <strong className={styles.itemTitle}>Uma fila so</strong>
                <span className={styles.itemDescription}>Centralize o que nasceu de workflows e o que surgiu manualmente.</span>
              </div>
              <div className={styles.listItem}>
                <strong className={styles.itemTitle}>Comente na tarefa</strong>
                <span className={styles.itemDescription}>Deixe contexto curto e evite perder decisão no chat.</span>
              </div>
              <div className={styles.listItem}>
                <strong className={styles.itemTitle}>Owner visivel</strong>
                <span className={styles.itemDescription}>Toda tarefa critica precisa apontar para alguem do time.</span>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
