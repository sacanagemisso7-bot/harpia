import Link from "next/link";
import { FileCheck2, ShieldCheck, UserRound } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { getSelfServicePolicyWorkspace } from "@/modules/compliance/queries";

import styles from "../workspace-expansion.module.css";

export default async function MePage() {
  const user = await requireCurrentUser();
  const workspace = await getSelfServicePolicyWorkspace({
    organizationId: user.organizationId,
    userId: user.id
  });

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="My workspace"
        title="Minha area"
        description="Um ponto único para acompanhar políticas, pendencias e o seu contexto dentro da operação."
        actions={<Badge variant="outline">{user.email}</Badge>}
      />

      {workspace ? (
        <>
          <section className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Colaborador</span>
              <strong className={styles.statValue}>{workspace.employee.fullName}</strong>
              <span className={styles.statHint}>{workspace.employee.title} em {workspace.employee.department}</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Pendencias</span>
              <strong className={styles.statValue}>{workspace.pendingAcknowledgements.length}</strong>
              <span className={styles.statHint}>Aceites que ainda exigem sua confirmacao.</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Requisitos</span>
              <strong className={styles.statValue}>{workspace.pendingPolicyRequirements.length}</strong>
              <span className={styles.statHint}>Itens de compliance ligados a policies ativas.</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Histórico</span>
              <strong className={styles.statValue}>{workspace.acknowledged.length}</strong>
              <span className={styles.statHint}>Aceites ja registrados no seu perfil.</span>
            </div>
          </section>

          <section className={styles.detailLayout}>
            <div className={styles.column}>
              <div className={styles.panel}>
                <div className={styles.panelHeader}>
                  <span className={styles.panelEyebrow}>Self service</span>
                  <h2 className={styles.panelTitle}>Seus atalhos</h2>
                  <p className={styles.panelDescription}>Acesse rapido o que costuma exigir ação sua.</p>
                </div>
                <div className={styles.linkList}>
                  <Link href="/me/policies" className={styles.linkItem}>
                    <strong>Políticas e aceites</strong>
                    <span>Resolva pendencias e acompanhe confirmacoes ja registradas.</span>
                  </Link>
                  <Link href={`/employees/${workspace.employee.id}`} className={styles.linkItem}>
                    <strong>Perfil do colaborador</strong>
                    <span>Abra sua ficha operacional dentro da empresa.</span>
                  </Link>
                </div>
              </div>

              <div className={styles.panel}>
                <div className={styles.panelHeader}>
                  <span className={styles.panelEyebrow}>Pending now</span>
                  <h2 className={styles.panelTitle}>O que precisa da sua ação</h2>
                </div>
                {workspace.pendingAcknowledgements.length ? (
                  <div className={styles.list}>
                    {workspace.pendingAcknowledgements.map((item) => (
                      <div key={item.id} className={styles.listItem}>
                        <strong className={styles.itemTitle}>{item.document?.title ?? item.title}</strong>
                        <span className={styles.itemDescription}>
                          {item.document?.versionLabel ? `${item.document.versionLabel} · ` : ""}
                          {item.title}
                        </span>
                        <span className={styles.itemDescription}>
                          {item.dueAt
                            ? `Vence em ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(item.dueAt)}`
                            : "Sem prazo definido"}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptyState}>Nenhuma pendencia de aceite no momento.</div>
                )}
              </div>
            </div>

            <aside className={styles.stickyAside}>
              <div className={styles.spotlight}>
                <span className={styles.panelEyebrow}>Status</span>
                <strong className={styles.spotlightValue}>{workspace.pendingAcknowledgements.length ? "Pendente" : "Em dia"}</strong>
                <p className={styles.panelDescription}>Sua situacao atual em relacao a policies da organização.</p>
              </div>
              <div className={styles.panel}>
                <div className={styles.metricStack}>
                  <div className={styles.metricRow}>
                    <span><ShieldCheck className="mr-2 inline h-4 w-4" /> Policies</span>
                    <strong>{workspace.pendingAcknowledgements.length}</strong>
                  </div>
                  <div className={styles.metricRow}>
                    <span><FileCheck2 className="mr-2 inline h-4 w-4" /> Confirmadas</span>
                    <strong>{workspace.acknowledged.length}</strong>
                  </div>
                  <div className={styles.metricRow}>
                    <span><UserRound className="mr-2 inline h-4 w-4" /> Perfil</span>
                    <strong>Ativo</strong>
                  </div>
                </div>
              </div>
            </aside>
          </section>
        </>
      ) : (
        <div className={styles.panel}>
          <div className={styles.surfaceMuted}>
            Seu usuário ainda não esta vinculado a um perfil de colaborador nesta organização.
          </div>
        </div>
      )}
    </div>
  );
}
