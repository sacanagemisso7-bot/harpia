import Link from "next/link";
import type { Route } from "next";
import {
  BellRing,
  BriefcaseBusiness,
  CalendarClock,
  ClipboardList,
  ShieldAlert,
  Sparkles,
  UsersRound
} from "lucide-react";

import { Badge } from "@/components/ui/badge";

import styles from "./command-center-view.module.css";

type CommandCenterViewProps = {
  data: {
    metrics: {
      employees: number;
      onboardingActive: number;
      offboardingActive: number;
      openRequests: number;
      overdueTasks: number;
      pendingCompliance: number;
      eventsToday: number;
      requestsAtRisk: number;
    };
    alerts: Array<{
      type: string;
      title: string;
      description: string;
      href: string;
      severity: "high" | "medium";
    }>;
    requests: Array<{
      id: string;
      title: string;
      status: string;
      effectiveSlaStatus: string;
      assigneeUser: { name: string } | null;
    }>;
    overdueTasks: Array<{
      id: string;
      title: string;
      status: string;
      relatedEmployee: { fullName: string } | null;
    }>;
    onboarding: Array<{
      id: string;
      employee: { fullName: string; title: string };
      steps: Array<{ status: string }>;
    }>;
    offboarding: Array<{
      id: string;
      employee: { fullName: string; title: string };
      steps: Array<{ status: string }>;
    }>;
    events: Array<{
      id: string;
      title: string;
      startsAt: Date;
      relatedEmployee: { fullName: string } | null;
    }>;
    compliance: Array<{
      id: string;
      title: string;
      employee: { fullName: string } | null;
      dueAt: Date | null;
    }>;
    hiring: {
      jobCount: number;
      applicationCount: number;
      slaAlerts: number;
    };
  };
};

function getProgress(steps: Array<{ status: string }>) {
  if (!steps.length) {
    return 0;
  }

  const completed = steps.filter((step) => step.status === "DONE").length;
  return Math.round((completed / steps.length) * 100);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function humanizeStatus(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function CommandCenterView({ data }: CommandCenterViewProps) {
  const nowCards = [
    {
      label: "Solicitações abertas",
      value: data.metrics.openRequests,
      hint: `${data.metrics.requestsAtRisk} em risco`,
      href: "/requests" as Route
    },
    {
      label: "Tarefas vencidas",
      value: data.metrics.overdueTasks,
      hint: "Pendências pedindo ação",
      href: "/people/tasks?view=overdue" as Route
    },
    {
      label: "Compliance pendente",
      value: data.metrics.pendingCompliance,
      hint: "Itens sem fechamento",
      href: "/people/compliance" as Route
    },
    {
      label: "Eventos hoje",
      value: data.metrics.eventsToday,
      hint: `${data.metrics.onboardingActive} entradas em curso`,
      href: "/people/calendar" as Route
    }
  ];

  const quickActions = [
    {
      href: "/requests?view=risk" as Route,
      label: "Abrir SLAs em risco",
      hint: "Fila crítica",
      icon: BellRing
    },
    {
      href: "/people/tasks?view=overdue" as Route,
      label: "Ver tarefas vencidas",
      hint: "Pendências do time",
      icon: ClipboardList
    },
    {
      href: "/employees?view=managerless" as Route,
      label: "Revisar pessoas sem gestor",
      hint: "Ownership",
      icon: UsersRound
    },
    {
      href: "/chat" as Route,
      label: "Perguntar ao Harpia",
      hint: "Assistência contextual",
      icon: Sparkles
    }
  ];

  const atRiskRequests = data.requests.filter((request) => request.effectiveSlaStatus !== "ON_TRACK").slice(0, 4);
  const overdueTasks = data.overdueTasks.slice(0, 4);
  const nextEvents = data.events.slice(0, 4);
  const onboardingRuns = data.onboarding.slice(0, 3);
  const offboardingRuns = data.offboarding.slice(0, 3);
  const complianceItems = data.compliance.slice(0, 4);

  return (
    <div className={styles.workspace}>
      <section className={styles.hero}>
        <div className={styles.heroIntro}>
          <span className={styles.eyebrow}>Agora</span>
          <h2 className={styles.heroTitle}>O que pede ação primeiro.</h2>
          <p className={styles.heroDescription}>Menos leitura de painel e mais rotas claras para fila, owner e próximo passo.</p>
        </div>

        <div className={styles.metricStrip}>
          {nowCards.map((metric) => (
            <Link key={metric.label} href={metric.href} className={styles.metricTile}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <p>{metric.hint}</p>
            </Link>
          ))}
        </div>

        <div className={styles.quickActions}>
          {quickActions.map((item) => {
            const Icon = item.icon;

            return (
              <Link key={item.href} href={item.href} className={styles.quickLink}>
                <div className={styles.quickLinkIcon}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className={styles.quickLinkCopy}>
                  <strong>{item.label}</strong>
                  <span>{item.hint}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <div className={styles.grid}>
        <div className={styles.primaryColumn}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.eyebrow}>Fila crítica</span>
              <h3 className={styles.panelTitle}>Onde o RH pode travar</h3>
              <p className={styles.panelDescription}>Alertas, SLAs e pendências atrasadas organizados por impacto imediato.</p>
            </div>

            <div className={styles.stack}>
              {data.alerts.length ? (
                data.alerts.slice(0, 3).map((alert) => (
                  <Link key={`${alert.type}-${alert.title}`} href={alert.href as Route} className={styles.actionRow}>
                    <div className={styles.actionCopy}>
                      <strong>{alert.title}</strong>
                      <p>{alert.description}</p>
                    </div>
                    <Badge variant={alert.severity === "high" ? "destructive" : "warning"}>
                      {alert.severity === "high" ? "Crítico" : "Atenção"}
                    </Badge>
                  </Link>
                ))
              ) : (
                <div className={styles.emptyRow}>Nenhum alerta crítico no momento.</div>
              )}
            </div>

            <div className={styles.subSection}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionLabel}>Solicitações em risco</span>
                <Link href={"/requests?view=risk" as Route} className={styles.inlineLink}>
                  Abrir fila
                </Link>
              </div>

              <div className={styles.stack}>
                {atRiskRequests.length ? (
                  atRiskRequests.map((request) => (
                    <Link key={request.id} href={"/requests" as Route} className={styles.queueItem}>
                      <div>
                        <strong>{request.title}</strong>
                        <p>{request.assigneeUser?.name ?? "Sem responsável definido"}</p>
                      </div>
                      <Badge
                        variant={
                          request.effectiveSlaStatus === "BREACHED"
                            ? "destructive"
                            : request.effectiveSlaStatus === "AT_RISK"
                              ? "warning"
                              : "outline"
                        }
                      >
                        {humanizeStatus(request.effectiveSlaStatus)}
                      </Badge>
                    </Link>
                  ))
                ) : (
                  <div className={styles.emptyRow}>Nenhuma solicitação fora da faixa ideal.</div>
                )}
              </div>
            </div>

            <div className={styles.subSection}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionLabel}>Tarefas vencidas</span>
                <Link href={"/people/tasks?view=overdue" as Route} className={styles.inlineLink}>
                  Abrir tasks
                </Link>
              </div>

              <div className={styles.stack}>
                {overdueTasks.length ? (
                  overdueTasks.map((task) => (
                    <Link key={task.id} href={"/people/tasks?view=overdue" as Route} className={styles.queueItem}>
                      <div>
                        <strong>{task.title}</strong>
                        <p>{task.relatedEmployee?.fullName ?? "Sem colaborador"}</p>
                      </div>
                      <Badge variant="warning">{humanizeStatus(task.status)}</Badge>
                    </Link>
                  ))
                ) : (
                  <div className={styles.emptyRow}>Nenhuma tarefa vencida agora.</div>
                )}
              </div>
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.eyebrow}>Fluxos</span>
              <h3 className={styles.panelTitle}>Onboarding e offboarding</h3>
              <p className={styles.panelDescription}>Veja rápido quem está em movimento e onde o progresso precisa de atenção.</p>
            </div>

            <div className={styles.workflowGrid}>
              <div className={styles.workflowPanel}>
                <div className={styles.sectionHeader}>
                  <span className={styles.sectionLabel}>Onboarding</span>
                  <Link href={"/people/onboarding" as Route} className={styles.inlineLink}>
                    Ver fluxo
                  </Link>
                </div>
                <div className={styles.stack}>
                  {onboardingRuns.length ? (
                    onboardingRuns.map((run) => {
                      const progress = getProgress(run.steps);

                      return (
                        <div key={run.id} className={styles.workflowItem}>
                          <div className={styles.listRow}>
                            <strong>{run.employee.fullName}</strong>
                            <span>{progress}%</span>
                          </div>
                          <p>{run.employee.title}</p>
                          <div className={styles.progressTrack}>
                            <span className={styles.progressFill} style={{ width: `${progress}%` }} />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className={styles.emptyRow}>Nenhum onboarding ativo.</div>
                  )}
                </div>
              </div>

              <div className={styles.workflowPanel}>
                <div className={styles.sectionHeader}>
                  <span className={styles.sectionLabel}>Offboarding</span>
                  <Link href={"/people/offboarding" as Route} className={styles.inlineLink}>
                    Ver fluxo
                  </Link>
                </div>
                <div className={styles.stack}>
                  {offboardingRuns.length ? (
                    offboardingRuns.map((run) => {
                      const progress = getProgress(run.steps);

                      return (
                        <div key={run.id} className={styles.workflowItem}>
                          <div className={styles.listRow}>
                            <strong>{run.employee.fullName}</strong>
                            <span>{progress}%</span>
                          </div>
                          <p>{run.employee.title}</p>
                          <div className={styles.progressTrack}>
                            <span className={styles.progressFill} style={{ width: `${progress}%` }} />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className={styles.emptyRow}>Nenhum offboarding ativo.</div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className={styles.secondaryColumn}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.eyebrow}>Agenda</span>
              <h3 className={styles.panelTitle}>Próximos marcos</h3>
            </div>

            <div className={styles.stack}>
              {nextEvents.length ? (
                nextEvents.map((event) => (
                  <div key={event.id} className={styles.eventItem}>
                    <CalendarClock className="h-4 w-4" />
                    <div>
                      <strong>{event.title}</strong>
                      <p>
                        {formatDate(event.startsAt)}
                        {event.relatedEmployee?.fullName ? ` • ${event.relatedEmployee.fullName}` : ""}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.emptyRow}>Sem eventos no calendário.</div>
              )}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.eyebrow}>Compliance</span>
              <h3 className={styles.panelTitle}>Itens pendentes</h3>
            </div>

            <div className={styles.stack}>
              {complianceItems.length ? (
                complianceItems.map((item) => (
                  <Link key={item.id} href={"/people/compliance" as Route} className={styles.complianceItem}>
                    <div className={styles.listRow}>
                      <strong>{item.title}</strong>
                      <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p>
                      {item.employee?.fullName ?? "Colaborador"}
                      {item.dueAt ? ` • ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(item.dueAt)}` : ""}
                    </p>
                  </Link>
                ))
              ) : (
                <div className={styles.emptyRow}>Sem itens de compliance pendentes.</div>
              )}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.eyebrow}>Hiring</span>
              <h3 className={styles.panelTitle}>Snapshot</h3>
            </div>

            <div className={styles.snapshotList}>
              <Link href={"/hiring" as Route} className={styles.snapshotItem}>
                <BriefcaseBusiness className="h-4 w-4" />
                <div>
                  <strong>{data.hiring.jobCount} vagas</strong>
                  <p>Vagas em operação</p>
                </div>
              </Link>
              <Link href={"/hiring" as Route} className={styles.snapshotItem}>
                <UsersRound className="h-4 w-4" />
                <div>
                  <strong>{data.hiring.applicationCount} candidatos</strong>
                  <p>Aplicações ativas</p>
                </div>
              </Link>
              <Link href={"/hiring" as Route} className={styles.snapshotItem}>
                <ShieldAlert className="h-4 w-4" />
                <div>
                  <strong>{data.hiring.slaAlerts} alertas</strong>
                  <p>Itens com risco de atraso</p>
                </div>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
