import Link from "next/link";
import type { Route } from "next";

import { HarpiaSurface } from "./harpia-surface";
import type { DashboardData } from "./dashboard-model";
import styles from "./harpia-dashboard-system.module.css";

function formatEventDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo"
  }).format(new Date(date));
}

function workflowProgress(steps: Array<{ status: string }>) {
  const done = steps.filter((step) => step.status === "DONE").length;
  return `${done}/${steps.length} etapas`;
}

export function HarpiaModuleDeck({ data }: { data: DashboardData }) {
  const workflowItems = [
    ...data.onboarding.map((entry) => ({
      id: `onboarding-${entry.id}`,
      href: "/people/onboarding" as Route,
      title: entry.employee.fullName,
      meta: `${entry.employee.title} - onboarding`,
      value: workflowProgress(entry.steps)
    })),
    ...data.offboarding.map((entry) => ({
      id: `offboarding-${entry.id}`,
      href: "/people/offboarding" as Route,
      title: entry.employee.fullName,
      meta: `${entry.employee.title} - offboarding`,
      value: workflowProgress(entry.steps)
    }))
  ].slice(0, 4);

  const modules = [
    {
      key: "hiring",
      eyebrow: "Hiring",
      title: "Pipeline ativo",
      subtitle: "Vagas, candidatos quentes e sinais que pedem decisao.",
      stats: [`${data.hiring.jobCount} vagas`, `${data.hiring.applicationCount} candidatos`, `${data.hiring.slaAlerts} alertas`],
      items: data.hiring.intelligenceHighlights.slice(0, 3).map((entry) => ({
        id: entry.id,
        href: entry.href as Route,
        title: entry.candidateName,
        meta: `${entry.jobTitle} - ${entry.stageName}`,
        value: `${entry.score}`
      }))
    },
    {
      key: "requests",
      eyebrow: "Desk",
      title: "Fila de requests",
      subtitle: "Solicitacoes abertas, SLAs e responsaveis mais ativos.",
      stats: [`${data.metrics.openRequests} abertas`, `${data.metrics.requestsAtRisk} em risco`],
      items: data.requests.slice(0, 3).map((request) => ({
        id: request.id,
        href: "/requests" as Route,
        title: request.title,
        meta: `${request.status} - ${request.assigneeUser?.name ?? "Sem responsavel"}`,
        value: request.effectiveSlaStatus
      }))
    },
    {
      key: "workflows",
      eyebrow: "People ops",
      title: "Workflows ativos",
      subtitle: "Entradas e saidas em curso com progresso visivel.",
      stats: [`${data.metrics.onboardingActive} onboarding`, `${data.metrics.offboardingActive} offboarding`],
      items: workflowItems
    },
    {
      key: "tasks",
      eyebrow: "Tasks",
      title: "Pendencias operacionais",
      subtitle: "Tarefas vencidas e pontos que travam execucao diaria.",
      stats: [`${data.metrics.overdueTasks} vencidas`],
      items: data.overdueTasks.slice(0, 3).map((task) => ({
        id: task.id,
        href: "/people/tasks" as Route,
        title: task.title,
        meta: `${task.relatedEmployee?.fullName ?? "Sem colaborador"} - ${task.assigneeUser?.name ?? "Sem owner"}`,
        value: task.status
      }))
    },
    {
      key: "calendar",
      eyebrow: "Calendar",
      title: "Agenda proxima",
      subtitle: "Eventos do time e movimentacoes do dia na operacao.",
      stats: [`${data.metrics.eventsToday} hoje`],
      items: data.events.slice(0, 3).map((event) => ({
        id: event.id,
        href: "/people/calendar" as Route,
        title: event.title,
        meta: `${event.relatedEmployee?.fullName ?? "Sem colaborador"} - ${formatEventDate(event.startsAt)}`,
        value: "Agenda"
      }))
    },
    {
      key: "compliance",
      eyebrow: "Compliance",
      title: "Leituras pendentes",
      subtitle: "Documentos e requisitos com janela de acao aberta.",
      stats: [`${data.metrics.pendingCompliance} pendencias`],
      items: data.compliance.slice(0, 3).map((entry) => ({
        id: entry.id,
        href: "/people/compliance" as Route,
        title: entry.title,
        meta: `${entry.employee?.fullName ?? "Sem colaborador"} - ${entry.dueAt ? formatEventDate(entry.dueAt) : "Sem prazo"}`,
        value: "Pendente"
      }))
    }
  ];

  return (
    <div className={styles.modulesGrid}>
      {modules.map((module) => (
        <HarpiaSurface key={module.key} as="section" className={styles.modulePanel}>
          <header className={styles.moduleHeader}>
            <span className={styles.eyebrow}>{module.eyebrow}</span>
            <h3 className={styles.moduleTitle}>{module.title}</h3>
            <p className={styles.moduleSubtitle}>{module.subtitle}</p>
          </header>

          <div className={styles.moduleStats}>
            {module.stats.map((stat) => (
              <span key={stat} className={styles.moduleStat}>
                {stat}
              </span>
            ))}
          </div>

          <div className={styles.moduleList}>
            {module.items.length ? (
              module.items.map((item) => (
                <Link key={item.id} href={item.href} className={styles.moduleItem}>
                  <div className={styles.moduleItemTop}>
                    <span className={styles.moduleItemTitle}>{item.title}</span>
                    <span className={styles.moduleItemValue}>{item.value}</span>
                  </div>
                  <span className={styles.moduleItemMeta}>{item.meta}</span>
                </Link>
              ))
            ) : (
              <div className={styles.moduleItem}>
                <div className={styles.moduleItemTop}>
                  <span className={styles.moduleItemTitle}>Sem itens ativos</span>
                </div>
                <span className={styles.moduleItemMeta}>Nada critico nesta fila agora.</span>
              </div>
            )}
          </div>
        </HarpiaSurface>
      ))}
    </div>
  );
}
