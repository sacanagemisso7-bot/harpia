import Link from "next/link";
import type { Route } from "next";
import {
  BellRing,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileWarning,
  ShieldAlert,
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

export function CommandCenterView({ data }: CommandCenterViewProps) {
  const metrics = [
    { label: "Base ativa", value: data.metrics.employees, hint: `${data.metrics.onboardingActive} entradas em curso` },
    { label: "Fila interna", value: data.metrics.openRequests, hint: `${data.metrics.requestsAtRisk} com risco de SLA` },
    { label: "Pendencias", value: data.metrics.overdueTasks, hint: `${data.metrics.pendingCompliance} pontos de compliance` },
    { label: "Agenda", value: data.metrics.eventsToday, hint: `${data.metrics.offboardingActive} saidas ativas` }
  ];

  const quickLinks = [
    { href: "/employees" as Route, label: "Colaboradores", icon: UsersRound },
    { href: "/requests" as Route, label: "Service desk", icon: BellRing },
    { href: "/people/tasks" as Route, label: "People tasks", icon: ClipboardList },
    { href: "/chat" as Route, label: "Company chat", icon: CheckCircle2 }
  ];

  const atRiskRequests = data.requests.filter((request) => request.effectiveSlaStatus !== "ON_TRACK").slice(0, 4);

  return (
    <div className={styles.workspace}>
      <section className={styles.hero}>
        <div className={styles.heroIntro}>
          <span className={styles.eyebrow}>Live overview</span>
          <h2 className={styles.heroTitle}>Tudo que pede acao hoje.</h2>
          <p className={styles.heroDescription}>O command center junta fila, workflows, agenda e compliance numa leitura direta da operacao.</p>
        </div>

        <div className={styles.metricStrip}>
          {metrics.map((metric) => (
            <div key={metric.label} className={styles.metricTile}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <p>{metric.hint}</p>
            </div>
          ))}
        </div>

        <div className={styles.quickActions}>
          {quickLinks.map((item) => {
            const Icon = item.icon;

            return (
              <Link key={item.href} href={item.href} className={styles.quickLink}>
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </section>

      <div className={styles.grid}>
        <div className={styles.primaryColumn}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.eyebrow}>Prioridades</span>
              <h3 className={styles.panelTitle}>O que pode travar primeiro</h3>
              <p className={styles.panelDescription}>Alertas criticos, requests em risco e tarefas que ja passaram da janela ideal.</p>
            </div>

            <div className={styles.alertList}>
              {data.alerts.length ? (
                data.alerts.slice(0, 3).map((alert) => (
                  <Link key={`${alert.type}-${alert.title}`} href={alert.href as Route} className={styles.alertItem}>
                    <div className={styles.listRow}>
                      <strong>{alert.title}</strong>
                      <Badge variant={alert.severity === "high" ? "destructive" : "warning"}>
                        {alert.severity === "high" ? "Critico" : "Atencao"}
                      </Badge>
                    </div>
                    <p>{alert.description}</p>
                  </Link>
                ))
              ) : (
                <div className={styles.emptyRow}>Nenhum alerta critico no momento.</div>
              )}
            </div>

            <div className={styles.queueSection}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionLabel}>Requests em risco</span>
                <Link href={"/requests" as Route} className={styles.inlineLink}>
                  Abrir fila
                </Link>
              </div>

              <div className={styles.queueList}>
                {atRiskRequests.length ? (
                  atRiskRequests.map((request) => (
                    <div key={request.id} className={styles.queueItem}>
                      <div>
                        <strong>{request.title}</strong>
                        <p>{request.assigneeUser?.name ?? "Sem responsavel definido"}</p>
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
                        {request.effectiveSlaStatus}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className={styles.emptyRow}>Nenhuma request fora da faixa ideal.</div>
                )}
              </div>
            </div>

            <div className={styles.queueSection}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionLabel}>Pendencias vencidas</span>
              </div>

              <div className={styles.queueList}>
                {data.overdueTasks.length ? (
                  data.overdueTasks.slice(0, 3).map((task) => (
                    <div key={task.id} className={styles.queueItem}>
                      <div>
                        <strong>{task.title}</strong>
                        <p>{task.relatedEmployee?.fullName ?? "Sem colaborador"}</p>
                      </div>
                      <Badge variant="warning">{task.status}</Badge>
                    </div>
                  ))
                ) : (
                  <div className={styles.emptyRow}>Nenhuma tarefa vencida agora.</div>
                )}
              </div>
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.eyebrow}>Workflows</span>
              <h3 className={styles.panelTitle}>Entradas e saidas em curso</h3>
              <p className={styles.panelDescription}>Acompanhe progresso, ownership e o ponto em que cada fluxo esta parado.</p>
            </div>

            <div className={styles.workflowGrid}>
              <div className={styles.workflowPanel}>
                <div className={styles.sectionHeader}>
                  <span className={styles.sectionLabel}>Onboarding</span>
                  <Link href={"/people/onboarding" as Route} className={styles.inlineLink}>
                    Ver fluxo
                  </Link>
                </div>
                <div className={styles.workflowList}>
                  {data.onboarding.length ? (
                    data.onboarding.slice(0, 3).map((run) => {
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
                <div className={styles.workflowList}>
                  {data.offboarding.length ? (
                    data.offboarding.slice(0, 3).map((run) => {
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
              <h3 className={styles.panelTitle}>Hoje e proximos marcos</h3>
              <p className={styles.panelDescription}>Eventos do dia e pontos que pedem acompanhamento antes de escalar.</p>
            </div>

            <div className={styles.eventList}>
              {data.events.length ? (
                data.events.slice(0, 4).map((event) => (
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
                <div className={styles.emptyRow}>Sem eventos no calendario.</div>
              )}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.eyebrow}>Compliance</span>
              <h3 className={styles.panelTitle}>Itens que merecem revisao</h3>
              <p className={styles.panelDescription}>Controles, pendencias e janelas de vencimento em uma unica lista.</p>
            </div>

            <div className={styles.complianceList}>
              {data.compliance.length ? (
                data.compliance.slice(0, 4).map((item) => (
                  <div key={item.id} className={styles.complianceItem}>
                    <div className={styles.listRow}>
                      <strong>{item.title}</strong>
                      <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p>
                      {item.employee?.fullName ?? "Colaborador"}
                      {item.dueAt ? ` • ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(item.dueAt)}` : ""}
                    </p>
                  </div>
                ))
              ) : (
                <div className={styles.emptyRow}>Sem itens de compliance pendentes.</div>
              )}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.eyebrow}>Hiring</span>
              <h3 className={styles.panelTitle}>Snapshot de recrutamento</h3>
              <p className={styles.panelDescription}>Leitura rapida de vagas, candidatos e alertas de SLA ligados ao hiring.</p>
            </div>

            <div className={styles.snapshotList}>
              <div className={styles.snapshotItem}>
                <BriefcaseBusiness className="h-4 w-4" />
                <div>
                  <strong>{data.hiring.jobCount} vagas</strong>
                  <p>Vagas em operacao</p>
                </div>
              </div>
              <div className={styles.snapshotItem}>
                <UsersRound className="h-4 w-4" />
                <div>
                  <strong>{data.hiring.applicationCount} candidatos</strong>
                  <p>Aplicacoes ativas</p>
                </div>
              </div>
              <div className={styles.snapshotItem}>
                <FileWarning className="h-4 w-4" />
                <div>
                  <strong>{data.hiring.slaAlerts} alertas</strong>
                  <p>Itens com risco de atraso</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
