import Link from "next/link";
import type { Route } from "next";
import { BellRing, BriefcaseBusiness, CalendarClock, ClipboardList, ShieldAlert, Sparkles } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { requirePermission } from "@/lib/auth/permissions";
import { getPeopleDashboard } from "@/modules/people-ops/queries";

import styles from "../../workspace-expansion.module.css";

export default async function OperationsInboxPage() {
  const user = await requirePermission("view_ops_inbox");
  const inbox = await getPeopleDashboard(user.organizationId);

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Operations inbox"
        title="Inbox operacional da empresa"
        description="Priorize o que esta travando people ops, service desk interno, compliance e processos do dia a dia."
      />

      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Solicitações abertas</span>
          <strong className={styles.statValue}>{inbox.metrics.openRequests}</strong>
          <span className={styles.statHint}>Itens que ainda exigem retorno ou resolucao.</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Tarefas vencidas</span>
          <strong className={styles.statValue}>{inbox.metrics.overdueTasks}</strong>
          <span className={styles.statHint}>Atrasos que podem contaminar a rotina do time.</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Compliance pendente</span>
          <strong className={styles.statValue}>{inbox.metrics.pendingCompliance}</strong>
          <span className={styles.statHint}>Policies e obrigatorios ainda em aberto.</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>SLAs em risco</span>
          <strong className={styles.statValue}>{inbox.metrics.requestsAtRisk}</strong>
          <span className={styles.statHint}>Casos que pedem decisão ou resposta mais r?pida.</span>
        </div>
      </section>

      <section className={styles.detailLayout}>
        <div className={styles.column}>
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Priority queue</span>
              <h2 className={styles.panelTitle}>Fila de prioridades</h2>
              <p className={styles.panelDescription}>Leitura unica do que esta exigindo ação imediata na operação interna.</p>
            </div>
            {inbox.alerts.length ? (
              <div className={styles.linkList}>
                {inbox.alerts.map((item, index) => (
                  <Link key={`${item.type}-${index}`} href={item.href as Route} className={styles.linkItem}>
                    <strong>
                      {item.type === "overdue_task" ? (
                        <ClipboardList className="mr-2 inline h-4 w-4 text-amber-600" />
                      ) : item.type === "hr_request" ? (
                        <ShieldAlert className="mr-2 inline h-4 w-4 text-destructive" />
                      ) : (
                        <Sparkles className="mr-2 inline h-4 w-4 text-primary" />
                      )}
                      {item.title}
                    </strong>
                    <span>{item.description}</span>
                    <span>{item.severity === "high" ? "Alta prioridade" : "Aten??o"}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>Nenhum item critico no inbox operacional agora.</div>
            )}
          </div>
        </div>

        <aside className={styles.stickyAside}>
          <div className={styles.spotlight}>
            <span className={styles.panelEyebrow}>Now</span>
            <strong className={styles.spotlightValue}>{inbox.alerts.length}</strong>
            <p className={styles.panelDescription}>Itens com prioridade real aguardando ação do time.</p>
          </div>

          <div className={styles.panel}>
            <div className={styles.itemHeader}>
              <div className={styles.itemLead}>
                <span className={styles.panelEyebrow}>Quick read</span>
                <h3 className={styles.panelTitle}>Resumo curto</h3>
              </div>
              <span className={styles.iconLead}>
                <BellRing className="h-4 w-4" />
              </span>
            </div>
            <div className={styles.metricStack}>
              <div className={styles.metricRow}>
                <span>Onboarding ativo</span>
                <strong>{inbox.metrics.onboardingActive}</strong>
              </div>
              <div className={styles.metricRow}>
                <span>Offboarding ativo</span>
                <strong>{inbox.metrics.offboardingActive}</strong>
              </div>
              <div className={styles.metricRow}>
                <span>Eventos hoje</span>
                <strong>{inbox.metrics.eventsToday}</strong>
              </div>
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.itemHeader}>
              <div className={styles.itemLead}>
                <span className={styles.panelEyebrow}>Hiring</span>
                <h3 className={styles.panelTitle}>Módulo complementar</h3>
              </div>
              <span className={styles.iconLead}>
                <BriefcaseBusiness className="h-4 w-4" />
              </span>
            </div>
            <div className={styles.surfaceMuted}>
              <span className={styles.itemDescription}>
                {inbox.hiring.applicationCount} aplicações, {inbox.hiring.jobCount} vagas abertas e {inbox.hiring.slaAlerts} alertas operacionais.
              </span>
            </div>
            <Link href="/hiring" className={styles.linkItem}>
              <strong>Abrir módulo de hiring</strong>
              <span>Continue a leitura do lado de recrutamento quando necessario.</span>
            </Link>
          </div>

          <div className={styles.panel}>
            <div className={styles.metricStack}>
              <div className={styles.metricRow}>
                <span>
                  <CalendarClock className="mr-2 inline h-4 w-4" />
                  Eventos
                </span>
                <strong>{inbox.metrics.eventsToday}</strong>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
