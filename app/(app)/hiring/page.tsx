import Link from "next/link";
import type { Route } from "next";
import { BarChart3, BriefcaseBusiness, CalendarClock, Rows3, UsersRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/permissions";
import { getDashboardMetrics } from "@/lib/dashboard/queries";
import { formatScore } from "@/lib/utils";

import styles from "@/components/operations/ops-workspace.module.css";

const modules = [
  {
    href: "/jobs",
    title: "Vagas",
    description: "Requisições, scorecards e configuração do processo.",
    icon: BriefcaseBusiness
  },
  {
    href: "/candidates",
    title: "Candidatos",
    description: "Banco de talentos, perfis e histórico de aplicações.",
    icon: UsersRound
  },
  {
    href: "/pipeline",
    title: "Pipeline",
    description: "Fila viva do funil com leitura rápida e ação imediata.",
    icon: Rows3
  },
  {
    href: "/interviews",
    title: "Entrevistas",
    description: "Agenda, feedbacks e acompanhamento de entrevistas.",
    icon: CalendarClock
  },
  {
    href: "/analytics",
    title: "Analytics",
    description: "Volume, score, SLA e produtividade do hiring.",
    icon: BarChart3
  }
] satisfies Array<{
  href: Route;
  title: string;
  description: string;
  icon: typeof BriefcaseBusiness;
}>;

export default async function HiringHubPage() {
  const user = await requirePermission("view_people_command_center");
  const metrics = await getDashboardMetrics(user.organizationId);
  const stageLoad = [...metrics.stages].sort((left, right) => right._count.currentFor - left._count.currentFor).slice(0, 4);

  const stats = [
    { label: "Vagas", value: metrics.jobCount },
    { label: "Candidatos", value: metrics.candidateCount },
    { label: "Aplicações", value: metrics.applicationCount },
    { label: "Score médio", value: formatScore(metrics.averageScore) }
  ];

  return (
    <div className={styles.workspace}>
      <div className={styles.header}>
        <span className={styles.eyebrow}>Hiring overview</span>
        <h2 className={styles.title}>Recrutamento</h2>
        <p className={styles.description}>
          Um ponto claro para abrir vagas, navegar no funil e atacar decisões sem passar por uma home genérica.
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
              <Link href="/pipeline">Abrir pipeline</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/jobs">Ver vagas</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/candidates">Ver candidatos</Link>
            </Button>
          </div>
          <span className={styles.shortcutHint}>Entre nos módulos a partir daqui sem depender de telas de resumo pesadas.</span>
        </div>
      </div>

      <div className={styles.body}>
        <section className={styles.listPanel}>
          <div className={styles.panelHeader}>
            <div className={styles.panelHeaderRow}>
              <div>
                <h3 className={styles.panelTitle}>Acessos principais</h3>
                <p className={styles.panelDescription}>Os módulos centrais do hiring agora ficam organizados como um workspace, não como um hub decorativo.</p>
              </div>
            </div>
          </div>

          <div className={styles.list}>
            {modules.map((module) => {
              const Icon = module.icon;

              return (
                <Link key={module.href} href={module.href} className={styles.row}>
                  <div className={styles.rowTop}>
                    <div className={styles.rowLead}>
                      <p className={styles.rowTitle}>
                        <Icon className="mr-2 inline h-4 w-4" />
                        {module.title}
                      </p>
                      <p className={styles.rowSubtitle}>{module.description}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <aside className={styles.detailColumn}>
          <section className={styles.detailPanel}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.panelTitle}>Decisões pedindo ação</h3>
              <Button asChild variant="outline">
                <Link href="/pipeline">Abrir fila</Link>
              </Button>
            </div>

            {metrics.intelligenceHighlights.length ? (
              <div className={styles.sectionStack}>
                {metrics.intelligenceHighlights.map((entry) => (
                  <Link key={entry.id} href={entry.href as Route} className={styles.detailCell}>
                    <div className={styles.sectionHeader}>
                      <span className={styles.metaValue}>{entry.candidateName}</span>
                      <Badge variant="success">{formatScore(entry.score)}</Badge>
                    </div>
                    <p className={styles.detailText}>{entry.jobTitle}</p>
                    <span className={styles.metaLabel}>{entry.stageName}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className={styles.emptyState}>Nenhum destaque forte pedindo decisão neste momento.</p>
            )}
          </section>

          <section className={styles.detailPanel}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.panelTitle}>Etapas mais carregadas</h3>
            </div>

            <div className={styles.sectionStack}>
              {stageLoad.map((stage) => (
                <div key={stage.id} className={styles.detailCell}>
                  <div className={styles.sectionHeader}>
                    <span className={styles.metaValue}>{stage.name}</span>
                    <Badge variant="outline">{stage._count.currentFor}</Badge>
                  </div>
                  <p className={styles.detailText}>{stage.key}</p>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.formPanel}>
            <div className={styles.panelHeader}>
              <h3 className={styles.panelTitle}>Vagas recentes</h3>
              <p className={styles.panelDescription}>O que entrou agora no fluxo e já merece acompanhamento.</p>
            </div>

            <div className={styles.sectionStack}>
              {metrics.recentJobs.length ? (
                metrics.recentJobs.map((job) => (
                  <Link key={job.id} href={`/jobs/${job.id}`} className={styles.detailCell}>
                    <div className={styles.sectionHeader}>
                      <span className={styles.metaValue}>{job.title}</span>
                      <Badge variant="outline">{job._count.applications}</Badge>
                    </div>
                    <p className={styles.detailText}>Requisição recente dentro da operação de hiring.</p>
                  </Link>
                ))
              ) : (
                <p className={styles.emptyState}>Ainda não há vagas recentes para acompanhar.</p>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
