import { HrRequestCategory, HrRequestStatus, PeopleTaskPriority } from "@prisma/client";

import { addHrRequestCommentAction, createHrRequestAction, updateHrRequestStatusAction } from "@/app/(app)/requests/actions";
import styles from "../workspace-expansion.module.css";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

  const categorySummary = Array.from(
    queue.requests.reduce((map, request) => {
      map.set(request.category, (map.get(request.category) ?? 0) + 1);
      return map;
    }, new Map<string, number>())
  )
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4);

  const ownershipSummary = Array.from(
    queue.requests.reduce((map, request) => {
      const key = request.assigneeUser?.name ?? "Sem responsavel";
      map.set(key, (map.get(key) ?? 0) + 1);
      return map;
    }, new Map<string, number>())
  )
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4);

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Internal RH service desk"
        title="Fila interna de solicitações"
        description="Demandas, SLA, ownership e histórico curto no mesmo fluxo para o RH operar sem perder contexto."
      />

      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Abertas</span>
          <strong className={styles.statValue}>{queue.metrics.open}</strong>
          <p className={styles.statHint}>Solicitações ainda em curso</p>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>SLA em risco</span>
          <strong className={styles.statValue}>{queue.metrics.atRisk}</strong>
          <p className={styles.statHint}>Itens perto de sair da faixa ideal</p>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>SLA estourado</span>
          <strong className={styles.statValue}>{queue.metrics.breached}</strong>
          <p className={styles.statHint}>Casos que pedem ação imediata</p>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Resolucao media</span>
          <strong className={styles.statValue}>{queue.metrics.avgResolutionHours}h</strong>
          <p className={styles.statHint}>Tempo medio para fechar um caso</p>
        </div>
      </section>

      <div className={styles.layout}>
        <div className={styles.column}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Queue</span>
              <h2 className={styles.panelTitle}>Solicitações em operação</h2>
              <p className={styles.panelDescription}>Cada item aparece com categoria, SLA, ownership, histórico curto e próximas ações na mesma linha de trabalho.</p>
            </div>

            <div className={styles.list}>
              {queue.requests.length ? (
                queue.requests.map((request) => (
                  <div key={request.id} className={styles.listItem}>
                    <div className={styles.itemHeader}>
                      <div className={styles.itemLead}>
                        <h3 className={styles.itemTitle}>{request.title}</h3>
                        <span className={styles.itemSubtitle}>{request.category}</span>
                      </div>

                      <div className={styles.actionRow}>
                        <Badge variant="outline">{request.status}</Badge>
                        <Badge
                          variant={
                            request.effectiveSlaStatus === "BREACHED"
                              ? "destructive"
                              : request.effectiveSlaStatus === "AT_RISK"
                                ? "warning"
                                : "success"
                          }
                        >
                          {request.effectiveSlaStatus}
                        </Badge>
                      </div>
                    </div>

                    <p className={styles.itemDescription}>{request.description}</p>
                    <p className={styles.itemMeta}>
                      {request.requesterEmployee?.fullName || request.requesterUser?.name || "Solicitante interno"} •{" "}
                      {request.assigneeUser?.name ? `responsavel ${request.assigneeUser.name}` : "sem responsavel definido"}
                    </p>

                    {canManage ? (
                      <form action={updateHrRequestStatusAction} className={styles.actionRow}>
                        <input type="hidden" name="requestId" value={request.id} />
                        <select name="status" defaultValue={request.status} className={styles.select}>
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

                    {request.comments.length ? (
                      <div className={styles.detailList}>
                        {request.comments.map((comment) => (
                          <div key={comment.id} className={styles.detailItem}>
                            <strong className={styles.itemTitle}>{comment.author?.name ?? "Sistema"}</strong>
                            <p className={styles.itemDescription}>{comment.message}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <form action={addHrRequestCommentAction} className={styles.actionRow}>
                      <input type="hidden" name="requestId" value={request.id} />
                      <input name="message" required placeholder="Adicionar comentario" className={`${styles.field} flex-1`} />
                      <Button type="submit" variant="outline">
                        Comentar
                      </Button>
                    </form>
                  </div>
                ))
              ) : (
                <div className={styles.emptyState}>Nenhuma solicitação interna aberta agora.</div>
              )}
            </div>
          </section>
        </div>

        <aside className={styles.column}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Nova solicitação</span>
              <h2 className={styles.panelTitle}>Abrir um caso</h2>
              <p className={styles.panelDescription}>Ative o service desk com dono, categoria, prioridade e contexto desde o primeiro envio.</p>
            </div>

            <form action={createHrRequestAction} className={styles.formGrid}>
              <input name="title" required placeholder="Titulo da solicitação" className={`${styles.field} ${styles.span2}`} />
              <select name="category" defaultValue={HrRequestCategory.GENERAL_SUPPORT} className={styles.select}>
                {Object.values(HrRequestCategory).map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <select name="priority" defaultValue={PeopleTaskPriority.MEDIUM} className={styles.select}>
                {Object.values(PeopleTaskPriority).map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
              <input name="dueAt" type="date" className={styles.field} />
              <select name="requesterEmployeeId" defaultValue="" className={styles.select}>
                <option value="">Solicitante sem colaborador vinculado</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.fullName} - {employee.title}
                  </option>
                ))}
              </select>
              <select name="assigneeUserId" defaultValue="" className={`${styles.select} ${styles.span2}`}>
                <option value="">Sem responsavel inicial</option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} - {member.role}
                  </option>
                ))}
              </select>
              <textarea name="description" required placeholder="Descricao detalhada da solicitação" className={`${styles.textarea} ${styles.span2}`} />
              <div className={styles.span2}>
                <Button type="submit">Criar solicitação</Button>
              </div>
            </form>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Resumo</span>
              <h2 className={styles.panelTitle}>Onde a fila esta concentrada</h2>
              <p className={styles.panelDescription}>Categorias mais frequentes e distribuicao de ownership ajudam a identificar onde o service desk esta acumulando carga.</p>
            </div>

            <div className={styles.summaryGrid}>
              {categorySummary.map(([category, count]) => (
                <div key={category} className={styles.summaryTile}>
                  <strong>{category}</strong>
                  <span>{count} caso(s)</span>
                </div>
              ))}
            </div>

            <div className={styles.detailList}>
              {ownershipSummary.map(([owner, count]) => (
                <div key={owner} className={styles.detailItem}>
                  <div className={styles.rowBetween}>
                    <strong className={styles.itemTitle}>{owner}</strong>
                    <span className={styles.itemMeta}>{count} item(ns)</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
