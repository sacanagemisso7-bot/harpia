import Link from "next/link";
import { FileCheck2, ShieldCheck, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { getSelfServicePolicyWorkspace } from "@/modules/compliance/queries";

import styles from "@/components/operations/ops-workspace.module.css";

export default async function MePage() {
  const user = await requireCurrentUser();
  const workspace = await getSelfServicePolicyWorkspace({
    organizationId: user.organizationId,
    userId: user.id
  });

  if (!workspace) {
    return (
      <div className={styles.workspace}>
        <div className={styles.header}>
          <span className={styles.eyebrow}>Minha área</span>
          <h2 className={styles.title}>Seu acesso ainda não está vinculado</h2>
          <p className={styles.description}>
            O usuário atual ainda não está associado a um perfil de colaborador nesta organização.
          </p>
        </div>

        <section className={styles.detailPanel}>
          <p className={styles.emptyState}>Peça ao time administrador para vincular o seu perfil e liberar o self-service.</p>
        </section>
      </div>
    );
  }

  return (
    <div className={styles.workspace}>
      <div className={styles.header}>
        <span className={styles.eyebrow}>Minha área</span>
        <h2 className={styles.title}>{workspace.employee.fullName}</h2>
        <p className={styles.description}>
          {workspace.employee.title} · {workspace.employee.department}
        </p>
      </div>

      <div className={styles.statRow}>
        <div className={styles.statPill}>
          <strong>{workspace.pendingAcknowledgements.length}</strong>
          <span>aceites pendentes</span>
        </div>
        <div className={styles.statPill}>
          <strong>{workspace.pendingPolicyRequirements.length}</strong>
          <span>itens de compliance</span>
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
              <Link href="/me/policies">Abrir políticas</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/employees/${workspace.employee.id}`}>Ver perfil</Link>
            </Button>
          </div>
          <span className={styles.shortcutHint}>Tudo que normalmente exigiria voltar ao RH está concentrado aqui.</span>
        </div>
      </div>

      <div className={styles.body}>
        <section className={styles.listPanel}>
          <div className={styles.panelHeader}>
            <div className={styles.panelHeaderRow}>
              <div>
                <h3 className={styles.panelTitle}>O que precisa da sua ação</h3>
                <p className={styles.panelDescription}>Aceites pendentes e próximos passos do seu contexto interno.</p>
              </div>
              <Badge variant={workspace.pendingAcknowledgements.length ? "warning" : "success"}>
                {workspace.pendingAcknowledgements.length ? "Pendente" : "Em dia"}
              </Badge>
            </div>
          </div>

          <div className={styles.list}>
            {workspace.pendingAcknowledgements.length ? (
              workspace.pendingAcknowledgements.map((item) => (
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
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.emptyWrap}>
                <p className={styles.emptyState}>Nenhuma pendência de aceite no momento.</p>
              </div>
            )}
          </div>
        </section>

        <aside className={styles.detailColumn}>
          <section className={styles.detailPanel}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.panelTitle}>Atalhos</h3>
            </div>

            <div className={styles.sectionStack}>
              <Link href="/me/policies" className={styles.detailCell}>
                <span className={styles.metaValue}>
                  <ShieldCheck className="mr-2 inline h-4 w-4" />
                  Políticas e aceites
                </span>
                <p className={styles.detailText}>Resolva pendências e acompanhe o histórico já confirmado.</p>
              </Link>
              <Link href={`/employees/${workspace.employee.id}`} className={styles.detailCell}>
                <span className={styles.metaValue}>
                  <UserRound className="mr-2 inline h-4 w-4" />
                  Perfil do colaborador
                </span>
                <p className={styles.detailText}>Abra sua ficha operacional e veja tarefas, requests e contexto.</p>
              </Link>
            </div>
          </section>

          <section className={styles.detailPanel}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.panelTitle}>Resumo rápido</h3>
            </div>

            <div className={styles.sectionStack}>
              <div className={styles.detailCell}>
                <span className={styles.metaValue}>
                  <FileCheck2 className="mr-2 inline h-4 w-4" />
                  Histórico
                </span>
                <p className={styles.detailText}>{workspace.acknowledged.length} aceite(s) já registrados para você.</p>
              </div>
              <div className={styles.detailCell}>
                <span className={styles.metaValue}>Status atual</span>
                <p className={styles.detailText}>
                  {workspace.pendingAcknowledgements.length
                    ? "Ainda existe pelo menos um aceite esperando sua confirmação."
                    : "Você está em dia com as políticas ativas no momento."}
                </p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
