import Link from "next/link";
import type { Route } from "next";
import { BellRing, BriefcaseBusiness, CalendarClock, ClipboardList, ShieldAlert, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/permissions";
import { getPeopleDashboard } from "@/modules/people-ops/queries";

import styles from "@/components/operations/ops-workspace.module.css";

function getAlertIcon(type: string) {
  if (type === "overdue_task") {
    return ClipboardList;
  }

  if (type === "hr_request") {
    return ShieldAlert;
  }

  if (type === "watchtower") {
    return Sparkles;
  }

  return BellRing;
}

export default async function OperationsInboxPage() {
  const user = await requirePermission("view_ops_inbox");
  const inbox = await getPeopleDashboard(user.organizationId);

  const stats = [
    { label: "Solicitações abertas", value: inbox.metrics.openRequests },
    { label: "Tarefas vencidas", value: inbox.metrics.overdueTasks },
    { label: "Compliance pendente", value: inbox.metrics.pendingCompliance },
    { label: "SLAs em risco", value: inbox.metrics.requestsAtRisk }
  ];

  return (
    <div className={styles.workspace}>
      <div className={styles.header}>
        <span className={styles.eyebrow}>Operations inbox</span>
        <h2 className={styles.title}>Inbox operacional</h2>
        <p className={styles.description}>
          Uma fila única para enxergar o que está travando requests, tasks, compliance e a operação diária do time.
        </p>
      </div>

      <div className={styles.statRow}>
        {stats.map((stat) => (
          <div key={stat.label} className={styles.statPill}>
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </div>
        ))}
      </div>

      <div className={styles.toolbar}>
        <div className={styles.toolbarMeta}>
          <div className={styles.tabs}>
            <Button asChild variant="outline" size="sm">
              <Link href="/requests">Solicitações</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/people/tasks">People tasks</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/people/command-center">Command center</Link>
            </Button>
          </div>
          <span className={styles.shortcutHint}>A ideia aqui é priorizar rápido, não navegar por vários resumos diferentes.</span>
        </div>
      </div>

      <div className={styles.body}>
        <section className={styles.listPanel}>
          <div className={styles.panelHeader}>
            <div className={styles.panelHeaderRow}>
              <div>
                <h3 className={styles.panelTitle}>Fila prioritária</h3>
                <p className={styles.panelDescription}>O que pede ação primeiro dentro da operação interna.</p>
              </div>
            </div>
          </div>

          <div className={styles.list}>
            {inbox.alerts.length ? (
              inbox.alerts.map((item, index) => {
                const Icon = getAlertIcon(item.type);

                return (
                  <Link key={`${item.type}-${index}`} href={item.href as Route} className={styles.row}>
                    <div className={styles.rowTop}>
                      <div className={styles.rowLead}>
                        <p className={styles.rowTitle}>
                          <Icon className="mr-2 inline h-4 w-4" />
                          {item.title}
                        </p>
                        <p className={styles.rowSubtitle}>{item.description}</p>
                      </div>
                      <Badge variant={item.severity === "high" ? "destructive" : "warning"}>
                        {item.severity === "high" ? "Alta" : "Atenção"}
                      </Badge>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className={styles.emptyWrap}>
                <p className={styles.emptyState}>Nenhum item crítico no inbox operacional agora.</p>
              </div>
            )}
          </div>
        </section>

        <aside className={styles.detailColumn}>
          <section className={styles.detailPanel}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.panelTitle}>Leitura curta</h3>
            </div>

            <div className={styles.detailGrid}>
              <div className={styles.detailCell}>
                <span className={styles.metaLabel}>Onboarding ativo</span>
                <span className={styles.metaValue}>{inbox.metrics.onboardingActive}</span>
              </div>
              <div className={styles.detailCell}>
                <span className={styles.metaLabel}>Offboarding ativo</span>
                <span className={styles.metaValue}>{inbox.metrics.offboardingActive}</span>
              </div>
              <div className={styles.detailCell}>
                <span className={styles.metaLabel}>Eventos hoje</span>
                <span className={styles.metaValue}>{inbox.metrics.eventsToday}</span>
              </div>
              <div className={styles.detailCell}>
                <span className={styles.metaLabel}>Alertas ativos</span>
                <span className={styles.metaValue}>{inbox.alerts.length}</span>
              </div>
            </div>
          </section>

          <section className={styles.detailPanel}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.panelTitle}>Navegação rápida</h3>
            </div>

            <div className={styles.sectionStack}>
              <Link href="/requests" className={styles.detailCell}>
                <span className={styles.metaValue}>Abrir solicitações</span>
                <p className={styles.detailText}>Continue a triagem dos casos internos e dos SLAs.</p>
              </Link>
              <Link href="/people/tasks" className={styles.detailCell}>
                <span className={styles.metaValue}>Abrir people tasks</span>
                <p className={styles.detailText}>Veja os atrasos, pendências e tarefas operacionais do time.</p>
              </Link>
              <Link href="/people/compliance" className={styles.detailCell}>
                <span className={styles.metaValue}>Abrir compliance</span>
                <p className={styles.detailText}>Verifique políticas, aceites e itens críticos em aberto.</p>
              </Link>
            </div>
          </section>

          <section className={styles.formPanel}>
            <div className={styles.panelHeader}>
              <h3 className={styles.panelTitle}>Hiring complementar</h3>
              <p className={styles.panelDescription}>O módulo de recrutamento aparece aqui só quando ajuda a leitura da operação.</p>
            </div>

            <div className={styles.sectionStack}>
              <div className={styles.detailCell}>
                <div className={styles.sectionHeader}>
                  <span className={styles.metaValue}>
                    <BriefcaseBusiness className="mr-2 inline h-4 w-4" />
                    Hiring
                  </span>
                  <Badge variant="outline">{inbox.hiring.applicationCount}</Badge>
                </div>
                <p className={styles.detailText}>
                  {inbox.hiring.jobCount} vagas abertas e {inbox.hiring.slaAlerts} alertas operacionais no recrutamento.
                </p>
              </div>

              <div className={styles.detailCell}>
                <div className={styles.sectionHeader}>
                  <span className={styles.metaValue}>
                    <CalendarClock className="mr-2 inline h-4 w-4" />
                    Eventos
                  </span>
                  <Badge variant="outline">{inbox.metrics.eventsToday}</Badge>
                </div>
                <p className={styles.detailText}>Agenda do dia e marcos próximos dentro da operação.</p>
              </div>

              <Button asChild variant="outline">
                <Link href="/hiring">Abrir módulo de hiring</Link>
              </Button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
