import Link from "next/link";

import { acknowledgePolicyAction } from "@/app/(app)/people/compliance/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { getSelfServicePolicyWorkspace } from "@/modules/compliance/queries";

import styles from "@/components/operations/ops-workspace.module.css";

export default async function MyPoliciesPage() {
  const user = await requireCurrentUser();
  const workspace = await getSelfServicePolicyWorkspace({
    organizationId: user.organizationId,
    userId: user.id
  });
  const now = Date.now();

  if (!workspace) {
    return (
      <div className={styles.workspace}>
        <div className={styles.header}>
          <span className={styles.eyebrow}>Políticas</span>
          <h2 className={styles.title}>Self-service indisponível</h2>
          <p className={styles.description}>
            Seu acesso ainda não está vinculado a um perfil de colaborador nesta organização.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.workspace}>
      <div className={styles.header}>
        <span className={styles.eyebrow}>Políticas</span>
        <h2 className={styles.title}>Aceites e políticas internas</h2>
        <p className={styles.description}>
          Resolva o que está pendente, acompanhe o histórico e evite idas e voltas com o RH para checar o seu status.
        </p>
      </div>

      <div className={styles.statRow}>
        <div className={styles.statPill}>
          <strong>{workspace.pendingAcknowledgements.length}</strong>
          <span>pendentes</span>
        </div>
        <div className={styles.statPill}>
          <strong>{workspace.pendingPolicyRequirements.length}</strong>
          <span>requisitos ligados</span>
        </div>
        <div className={styles.statPill}>
          <strong>{workspace.acknowledged.length}</strong>
          <span>aceites concluídos</span>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.toolbarMeta}>
          <div className={styles.tabs}>
            <Button asChild size="sm">
              <Link href="/me">Voltar para minha área</Link>
            </Button>
          </div>
          <span className={styles.shortcutHint}>Priorize tudo que estiver atrasado ou sem confirmação.</span>
        </div>
      </div>

      <div className={styles.body}>
        <section className={styles.listPanel}>
          <div className={styles.panelHeader}>
            <div className={styles.panelHeaderRow}>
              <div>
                <h3 className={styles.panelTitle}>Pendências de aceite</h3>
                <p className={styles.panelDescription}>Tudo que ainda precisa da sua confirmação.</p>
              </div>
            </div>
          </div>

          <div className={styles.list}>
            {workspace.pendingAcknowledgements.length ? (
              workspace.pendingAcknowledgements.map((item) => {
                const overdue = item.dueAt ? item.dueAt.getTime() < now : false;

                return (
                  <div key={item.id} className={styles.row}>
                    <div className={styles.rowTop}>
                      <div className={styles.rowLead}>
                        <p className={styles.rowTitle}>{item.document?.title ?? item.title}</p>
                        <p className={styles.rowSubtitle}>
                          {item.document?.versionLabel ? `${item.document.versionLabel} · ` : ""}
                          {item.dueAt
                            ? `vence em ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(item.dueAt)}`
                            : "sem prazo definido"}
                        </p>
                      </div>
                      <Badge variant={overdue ? "destructive" : "warning"}>{overdue ? "Atrasado" : "Pendente"}</Badge>
                    </div>
                    {item.document?.summary ? <p className={styles.rowSubtitle}>{item.document.summary}</p> : null}
                    <form action={acknowledgePolicyAction}>
                      <input type="hidden" name="acknowledgementId" value={item.id} />
                      <Button type="submit" size="sm">
                        Confirmar aceite
                      </Button>
                    </form>
                  </div>
                );
              })
            ) : (
              <div className={styles.emptyWrap}>
                <p className={styles.emptyState}>Nenhuma política pendente para você no momento.</p>
              </div>
            )}
          </div>
        </section>

        <aside className={styles.detailColumn}>
          <section className={styles.detailPanel}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.panelTitle}>Histórico</h3>
            </div>

            <div className={styles.sectionStack}>
              {workspace.acknowledged.length ? (
                workspace.acknowledged.map((item) => (
                  <div key={item.id} className={styles.detailCell}>
                    <div className={styles.sectionHeader}>
                      <span className={styles.metaValue}>{item.document?.title ?? item.title}</span>
                      <Badge variant="success">Aceito</Badge>
                    </div>
                    <p className={styles.detailText}>
                      {item.document?.versionLabel ? `${item.document.versionLabel} · ` : ""}
                      {item.acknowledgedAt
                        ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(item.acknowledgedAt)
                        : "data indisponível"}
                    </p>
                  </div>
                ))
              ) : (
                <p className={styles.emptyState}>Seu histórico de aceites aparecerá aqui conforme for avançando.</p>
              )}
            </div>
          </section>

          <section className={styles.detailPanel}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.panelTitle}>Leitura rápida</h3>
            </div>

            <div className={styles.sectionStack}>
              <div className={styles.detailCell}>
                <span className={styles.metaLabel}>Situação</span>
                <p className={styles.detailText}>
                  {workspace.pendingAcknowledgements.length
                    ? "Ainda existe algo esperando sua ação."
                    : "Não há pendências abertas agora."}
                </p>
              </div>
              <div className={styles.detailCell}>
                <span className={styles.metaLabel}>Boas práticas</span>
                <p className={styles.detailText}>Confirme logo após a leitura para manter a fila limpa e rastreável.</p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
