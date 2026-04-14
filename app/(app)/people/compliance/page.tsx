import { acknowledgePolicyAction, assignPolicyAction } from "@/app/(app)/people/compliance/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { hasPermission, requirePermission } from "@/lib/auth/permissions";
import { getComplianceSummary } from "@/modules/compliance/queries";
import { listEmployeesForSelect } from "@/modules/employees/queries";
import { getPolicyRolloutOverview, listPolicyDocumentsForSelect } from "@/modules/knowledge/queries";

import styles from "@/components/operations/ops-workspace.module.css";

function formatStatusLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function CompliancePage() {
  const user = await requirePermission("view_compliance");
  const [compliance, employees, policyDocuments, policyRollouts] = await Promise.all([
    getComplianceSummary(user.organizationId),
    listEmployeesForSelect(user.organizationId),
    listPolicyDocumentsForSelect(user.organizationId, { publishedOnly: true }),
    getPolicyRolloutOverview(user.organizationId)
  ]);
  const canManageCompliance = hasPermission(user.role, "manage_compliance");
  const now = Date.now();

  return (
    <div className={styles.workspace}>
      <div className={styles.header}>
        <span className={styles.eyebrow}>Compliance</span>
        <h2 className={styles.title}>Rastreio operacional de obrigatórios</h2>
        <p className={styles.description}>
          Documentos pendentes, trilhas obrigatórias e alertas do time em uma fila simples de distribuir e fechar.
        </p>
      </div>

      <div className={styles.statRow}>
        <div className={styles.statPill}>
          <strong>{compliance.metrics.total}</strong>
          <span>itens monitorados</span>
        </div>
        <div className={styles.statPill}>
          <strong>{compliance.metrics.pending}</strong>
          <span>pendentes</span>
        </div>
        <div className={styles.statPill}>
          <strong>{compliance.metrics.overdue}</strong>
          <span>atrasados</span>
        </div>
        <div className={styles.statPill}>
          <strong>{compliance.metrics.completed}</strong>
          <span>concluídos</span>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.detailColumn}>
          {canManageCompliance ? (
            <section className={styles.formPanel}>
              <div className={styles.panelHeader}>
                <h3 className={styles.panelTitle}>Distribuir política</h3>
                <p className={styles.panelDescription}>Atribua uma policy, gere o requirement correlato e marque prazo.</p>
              </div>

              <form action={assignPolicyAction} className="grid gap-4">
                <select name="documentId" required className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                  <option value="">Selecione uma política</option>
                  {policyDocuments.map((document) => (
                    <option key={document.id} value={document.id}>
                      {document.title}
                      {document.versionLabel ? ` · ${document.versionLabel}` : ""}
                    </option>
                  ))}
                </select>

                <select
                  name="employeeIds"
                  multiple
                  required
                  className="min-h-40 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.fullName} - {employee.title}
                    </option>
                  ))}
                </select>

                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                  <input name="dueAt" type="date" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
                  <Button type="submit">Atribuir política</Button>
                </div>
              </form>
            </section>
          ) : null}

          <section className={styles.listPanel}>
            <div className={styles.panelHeader}>
              <div className={styles.panelHeaderRow}>
                <div>
                  <h3 className={styles.panelTitle}>Requirements em aberto</h3>
                  <p className={styles.panelDescription}>Itens obrigatórios por colaborador com prazo e status.</p>
                </div>
              </div>
            </div>

            <div className={styles.list}>
              {compliance.requirements.length ? (
                compliance.requirements.map((item) => {
                  const overdue = item.dueAt ? item.dueAt.getTime() < now : false;
                  const variant =
                    item.status === "COMPLETED" ? "success" : overdue ? "destructive" : "warning";

                  return (
                    <div key={item.id} className={styles.row}>
                      <div className={styles.rowTop}>
                        <div className={styles.rowLead}>
                          <p className={styles.rowTitle}>{item.title}</p>
                          <p className={styles.rowSubtitle}>
                            {item.employee.fullName} · {formatStatusLabel(item.type)}
                            {item.dueAt
                              ? ` · vence em ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(item.dueAt)}`
                              : ""}
                          </p>
                        </div>
                        <Badge variant={variant}>{formatStatusLabel(item.status)}</Badge>
                      </div>
                      {item.description ? <p className={styles.rowSubtitle}>{item.description}</p> : null}
                    </div>
                  );
                })
              ) : (
                <div className={styles.emptyWrap}>
                  <p className={styles.emptyState}>Nenhum item de compliance pendente no momento.</p>
                </div>
              )}
            </div>
          </section>

          <section className={styles.listPanel}>
            <div className={styles.panelHeader}>
              <div className={styles.panelHeaderRow}>
                <div>
                  <h3 className={styles.panelTitle}>Aceites de política</h3>
                  <p className={styles.panelDescription}>Quem já confirmou e quem ainda precisa responder.</p>
                </div>
              </div>
            </div>

            <div className={styles.list}>
              {compliance.policyAcknowledgements.length ? (
                compliance.policyAcknowledgements.map((item) => {
                  const overdue = item.dueAt ? item.dueAt.getTime() < now : false;
                  const variant = item.acknowledgedAt ? "success" : overdue ? "destructive" : "warning";

                  return (
                    <div key={item.id} className={styles.row}>
                      <div className={styles.rowTop}>
                        <div className={styles.rowLead}>
                          <p className={styles.rowTitle}>{item.title}</p>
                          <p className={styles.rowSubtitle}>
                            {item.employee.fullName}
                            {item.document?.title ? ` · ${item.document.title}` : ""}
                            {item.document?.versionLabel ? ` · ${item.document.versionLabel}` : ""}
                          </p>
                        </div>
                        <Badge variant={variant}>
                          {item.acknowledgedAt ? "Aceito" : overdue ? "Atrasado" : "Pendente"}
                        </Badge>
                      </div>
                      {item.document?.summary ? <p className={styles.rowSubtitle}>{item.document.summary}</p> : null}
                      {!item.acknowledgedAt && canManageCompliance ? (
                        <form action={acknowledgePolicyAction}>
                          <input type="hidden" name="acknowledgementId" value={item.id} />
                          <Button type="submit" variant="outline" size="sm">
                            Registrar aceite
                          </Button>
                        </form>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <div className={styles.emptyWrap}>
                  <p className={styles.emptyState}>Nenhum aceite de política pendente no momento.</p>
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className={styles.detailColumn}>
          <section className={styles.detailPanel}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.panelTitle}>Leitura rápida</h3>
              <Badge variant={compliance.metrics.overdue ? "destructive" : "outline"}>{compliance.metrics.overdue} em risco</Badge>
            </div>

            <div className={styles.sectionStack}>
              <div className={styles.detailCell}>
                <span className={styles.metaLabel}>Prioridade</span>
                <p className={styles.detailText}>Ataque primeiro itens atrasados e depois tudo que ainda está sem aceite.</p>
              </div>
            </div>
          </section>

          <section className={styles.detailPanel}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.panelTitle}>Rollouts de policy</h3>
            </div>

            <div className={styles.sectionStack}>
              {policyRollouts.length ? (
                policyRollouts.map((rollout) => (
                  <div key={rollout.id} className={styles.detailCell}>
                    <div className={styles.sectionHeader}>
                      <span className={styles.metaValue}>{rollout.title}</span>
                      <Badge variant={rollout.status === "COMPLETED" ? "success" : "outline"}>{rollout.status}</Badge>
                    </div>
                    <p className={styles.detailText}>
                      {rollout.document.title}
                      {rollout.document.versionLabel ? ` · ${rollout.document.versionLabel}` : ""}
                    </p>
                    <p className={styles.detailText}>
                      {rollout.metrics.acceptanceRate}% de aceite · {rollout.metrics.acknowledged}/{rollout.metrics.assigned} confirmados
                    </p>
                    <p className={styles.detailText}>
                      Pendentes: {rollout.metrics.pending}
                      {rollout.metrics.overdue ? ` · Atrasados: ${rollout.metrics.overdue}` : ""}
                    </p>
                  </div>
                ))
              ) : (
                <p className={styles.emptyState}>Nenhum rollout de policy foi iniciado ainda.</p>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
