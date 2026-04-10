import { acknowledgePolicyAction, assignPolicyAction } from "@/app/(app)/people/compliance/actions";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { hasPermission, requirePermission } from "@/lib/auth/permissions";
import { getPolicyRolloutOverview, listPolicyDocumentsForSelect } from "@/modules/knowledge/queries";
import { getComplianceSummary } from "@/modules/compliance/queries";
import { listEmployeesForSelect } from "@/modules/employees/queries";

import styles from "../../workspace-expansion.module.css";

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
    <div className={styles.page}>
      <PageHeader
        eyebrow="Light compliance"
        title="Rastreio operacional de obrigatorios"
        description="Documentos pendentes, trilhas obrigatorias e alertas do time em uma fila simples de operar."
      />

      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Total</span>
          <strong className={styles.statValue}>{compliance.metrics.total}</strong>
          <span className={styles.statHint}>Itens monitorados na camada operacional.</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Pendentes</span>
          <strong className={styles.statValue}>{compliance.metrics.pending}</strong>
          <span className={styles.statHint}>Ainda aguardando conclusao ou aceite.</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Atrasados</span>
          <strong className={styles.statValue}>{compliance.metrics.overdue}</strong>
          <span className={styles.statHint}>Itens com risco imediato de follow-up.</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Concluidos</span>
          <strong className={styles.statValue}>{compliance.metrics.completed}</strong>
          <span className={styles.statHint}>Ja resolvidos pelo time ou pelos colaboradores.</span>
        </div>
      </section>

      <section className={styles.detailLayout}>
        <div className={styles.column}>
          {canManageCompliance ? (
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <span className={styles.panelEyebrow}>Policy assignment</span>
                <h2 className={styles.panelTitle}>Distribuir politica</h2>
                <p className={styles.panelDescription}>Atribua uma policy, gere o requirement correlato e marque prazo.</p>
              </div>
              <form action={assignPolicyAction} className={styles.actionCluster}>
                <select name="documentId" required className={styles.select}>
                  <option value="">Selecione uma politica</option>
                  {policyDocuments.map((document) => (
                    <option key={document.id} value={document.id}>
                      {document.title}
                      {document.versionLabel ? ` · ${document.versionLabel}` : ""}
                      {!document.publishedAt ? " · nao publicada" : ""}
                    </option>
                  ))}
                </select>
                <select name="employeeIds" multiple required className={styles.textarea}>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.fullName} - {employee.title}
                    </option>
                  ))}
                </select>
                <div className={styles.subGrid2}>
                  <input name="dueAt" type="date" className={styles.field} />
                  <Button type="submit">Atribuir politica</Button>
                </div>
              </form>
            </div>
          ) : null}

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Open items</span>
              <h2 className={styles.panelTitle}>Requirements em aberto</h2>
              <p className={styles.panelDescription}>Itens obrigatorios por colaborador com prazo e status.</p>
            </div>
            {compliance.requirements.length ? (
              <div className={styles.list}>
                {compliance.requirements.map((item) => (
                  <div key={item.id} className={styles.listItem}>
                    <div className={styles.itemHeader}>
                      <div className={styles.itemLead}>
                        <strong className={styles.itemTitle}>{item.title}</strong>
                        <span className={styles.itemSubtitle}>
                          {item.employee.fullName} - {item.type}
                          {item.dueAt ? ` - vence em ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(item.dueAt)}` : ""}
                        </span>
                      </div>
                      <Badge variant={item.status === "COMPLETED" ? "success" : item.dueAt && item.dueAt.getTime() < now ? "destructive" : "warning"}>
                        {item.status}
                      </Badge>
                    </div>
                    {item.description ? <span className={styles.itemDescription}>{item.description}</span> : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>Nenhum item de compliance pendente no momento.</div>
            )}
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Acknowledgements</span>
              <h2 className={styles.panelTitle}>Aceites de politica</h2>
              <p className={styles.panelDescription}>Quem ja confirmou e quem ainda precisa responder.</p>
            </div>
            {compliance.policyAcknowledgements.length ? (
              <div className={styles.list}>
                {compliance.policyAcknowledgements.map((item) => (
                  <div key={item.id} className={styles.listItem}>
                    <div className={styles.itemHeader}>
                      <div className={styles.itemLead}>
                        <strong className={styles.itemTitle}>{item.title}</strong>
                        <span className={styles.itemSubtitle}>
                          {item.employee.fullName}
                          {item.document?.title ? ` - ${item.document.title}` : ""}
                          {item.document?.versionLabel ? ` · ${item.document.versionLabel}` : ""}
                        </span>
                      </div>
                      <Badge
                        variant={
                          item.acknowledgedAt
                            ? "success"
                            : item.dueAt && item.dueAt.getTime() < now
                              ? "destructive"
                              : "warning"
                        }
                      >
                        {item.acknowledgedAt ? "ACKNOWLEDGED" : item.dueAt && item.dueAt.getTime() < now ? "OVERDUE" : "PENDING"}
                      </Badge>
                    </div>
                    {item.document?.summary ? <span className={styles.itemDescription}>{item.document.summary}</span> : null}
                    {!item.acknowledgedAt && canManageCompliance ? (
                      <form action={acknowledgePolicyAction}>
                        <input type="hidden" name="acknowledgementId" value={item.id} />
                        <Button type="submit" variant="outline" size="sm">
                          Registrar aceite
                        </Button>
                      </form>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>Nenhum aceite de politica pendente no momento.</div>
            )}
          </div>
        </div>

        <aside className={styles.stickyAside}>
          <div className={styles.spotlight}>
            <span className={styles.panelEyebrow}>Risk</span>
            <strong className={styles.spotlightValue}>{compliance.metrics.overdue}</strong>
            <p className={styles.panelDescription}>Itens atrasados que merecem follow-up imediato.</p>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Rollouts</span>
              <h3 className={styles.panelTitle}>Campanhas de policy</h3>
            </div>
            {policyRollouts.length ? (
              <div className={styles.list}>
                {policyRollouts.map((rollout) => (
                  <div key={rollout.id} className={styles.listItem}>
                    <div className={styles.itemHeader}>
                      <div className={styles.itemLead}>
                        <strong className={styles.itemTitle}>{rollout.title}</strong>
                        <span className={styles.itemSubtitle}>
                          {rollout.document.title}
                          {rollout.document.versionLabel ? ` · ${rollout.document.versionLabel}` : ""}
                        </span>
                      </div>
                      <Badge variant={rollout.status === "COMPLETED" ? "success" : "outline"}>{rollout.status}</Badge>
                    </div>
                    <span className={styles.itemDescription}>
                      {rollout.metrics.acceptanceRate}% de aceite · {rollout.metrics.acknowledged}/{rollout.metrics.assigned} confirmados
                    </span>
                    <span className={styles.itemDescription}>
                      Pendentes: {rollout.metrics.pending}
                      {rollout.metrics.overdue ? ` · Atrasados: ${rollout.metrics.overdue}` : ""}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.surfaceMuted}>Nenhum rollout de policy foi iniciado ainda.</div>
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}
