import { acknowledgePolicyAction } from "@/app/(app)/people/compliance/actions";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { getSelfServicePolicyWorkspace } from "@/modules/compliance/queries";

import styles from "../../workspace-expansion.module.css";

export default async function MyPoliciesPage() {
  const user = await requireCurrentUser();
  const workspace = await getSelfServicePolicyWorkspace({
    organizationId: user.organizationId,
    userId: user.id
  });
  const now = Date.now();

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="My policies"
        title="Aceites e políticas internas"
        description="Resolva rapidamente políticas pendentes, acompanhe o que ja foi confirmado e reduza atrito operacional com o RH."
      />

      {!workspace ? (
        <div className={styles.panel}>
          <div className={styles.surfaceMuted}>
            Seu usuário ainda não esta vinculado a um perfil de colaborador nesta organização.
          </div>
        </div>
      ) : (
        <>
          <section className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Colaborador</span>
              <strong className={styles.statValue}>{workspace.employee.fullName}</strong>
              <span className={styles.statHint}>{workspace.employee.title} em {workspace.employee.department}</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Pendentes</span>
              <strong className={styles.statValue}>{workspace.pendingAcknowledgements.length}</strong>
              <span className={styles.statHint}>Políticas que ainda precisam da sua confirmacao.</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Requisitos ligados</span>
              <strong className={styles.statValue}>{workspace.pendingPolicyRequirements.length}</strong>
              <span className={styles.statHint}>Itens de compliance associados a essas policies.</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Histórico</span>
              <strong className={styles.statValue}>{workspace.acknowledged.length}</strong>
              <span className={styles.statHint}>Aceites ja registrados para o seu perfil.</span>
            </div>
          </section>

          <section className={styles.detailLayout}>
            <div className={styles.column}>
              <div className={styles.panel}>
                <div className={styles.panelHeader}>
                  <span className={styles.panelEyebrow}>Pending acknowledgements</span>
                  <h2 className={styles.panelTitle}>Pendencias de aceite</h2>
                  <p className={styles.panelDescription}>Políticas que ainda precisam da sua confirmacao.</p>
                </div>
                {workspace.pendingAcknowledgements.length ? (
                  <div className={styles.list}>
                    {workspace.pendingAcknowledgements.map((item) => (
                      <div key={item.id} className={styles.listItem}>
                        <div className={styles.itemHeader}>
                          <div className={styles.itemLead}>
                            <strong className={styles.itemTitle}>{item.document?.title ?? item.title}</strong>
                            <span className={styles.itemSubtitle}>
                              {item.document?.versionLabel ? `${item.document.versionLabel} · ` : ""}
                              {item.title}
                              {item.dueAt ? ` · vence em ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(item.dueAt)}` : ""}
                            </span>
                          </div>
                          <Badge variant={item.dueAt && item.dueAt.getTime() < now ? "destructive" : "warning"}>
                            {item.dueAt && item.dueAt.getTime() < now ? "OVERDUE" : "PENDING"}
                          </Badge>
                        </div>
                        {item.document?.summary ? <span className={styles.itemDescription}>{item.document.summary}</span> : null}
                        <form action={acknowledgePolicyAction}>
                          <input type="hidden" name="acknowledgementId" value={item.id} />
                          <Button type="submit">Confirmar aceite</Button>
                        </form>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptyState}>Nenhuma política pendente para você no momento.</div>
                )}
              </div>

              <div className={styles.panel}>
                <div className={styles.panelHeader}>
                  <span className={styles.panelEyebrow}>History</span>
                  <h2 className={styles.panelTitle}>Histórico recente</h2>
                  <p className={styles.panelDescription}>Políticas ja confirmadas e contexto de compliance ligado a elas.</p>
                </div>
                {workspace.acknowledged.length ? (
                  <div className={styles.list}>
                    {workspace.acknowledged.map((item) => (
                      <div key={item.id} className={styles.listItem}>
                        <div className={styles.itemHeader}>
                          <div className={styles.itemLead}>
                            <strong className={styles.itemTitle}>{item.document?.title ?? item.title}</strong>
                            <span className={styles.itemSubtitle}>
                              {item.document?.versionLabel ? `${item.document.versionLabel} · ` : ""}
                              Confirmado em{" "}
                              {item.acknowledgedAt
                                ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(item.acknowledgedAt)
                                : "data indisponível"}
                            </span>
                          </div>
                          <Badge variant="success">ACKNOWLEDGED</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptyState}>Seus aceites aparecem aqui conforme forem sendo registrados.</div>
                )}
              </div>
            </div>

            <aside className={styles.stickyAside}>
              <div className={styles.spotlight}>
                <span className={styles.panelEyebrow}>Self service</span>
                <strong className={styles.spotlightValue}>{workspace.pendingAcknowledgements.length ? "Action" : "Clear"}</strong>
                <p className={styles.panelDescription}>Uma leitura r?pida para saber se ainda existe algo esperando você.</p>
              </div>
              <div className={styles.panel}>
                <div className={styles.list}>
                  <div className={styles.listItem}>
                    <strong className={styles.itemTitle}>Confirme assim que ler</strong>
                    <span className={styles.itemDescription}>Reduz follow-up manual do RH e limpa a fila mais rapido.</span>
                  </div>
                  <div className={styles.listItem}>
                    <strong className={styles.itemTitle}>Observe a versao</strong>
                    <span className={styles.itemDescription}>Quando houver nova policy, o histórico deixa claro o que mudou.</span>
                  </div>
                </div>
              </div>
            </aside>
          </section>
        </>
      )}
    </div>
  );
}
