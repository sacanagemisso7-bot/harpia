import Link from "next/link";
import type { Route } from "next";
import { BarChart3, BriefcaseBusiness, CalendarClock, Rows3, UsersRound } from "lucide-react";

import styles from "../workspace-expansion.module.css";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/permissions";
import { getDashboardMetrics } from "@/lib/dashboard/queries";
import { formatScore } from "@/lib/utils";

const modules = [
  {
    href: "/jobs",
    title: "Vagas",
    description: "Requisi??es, scorecards e configuração do pipeline.",
    icon: BriefcaseBusiness
  },
  {
    href: "/candidates",
    title: "Candidatos",
    description: "Banco de talentos e leitura de perfis.",
    icon: UsersRound
  },
  {
    href: "/pipeline",
    title: "Pipeline",
    description: "Movimentação, score e estado atual do funil.",
    icon: Rows3
  },
  {
    href: "/interviews",
    title: "Entrevistas",
    description: "Agenda, scorecards e feedbacks.",
    icon: CalendarClock
  },
  {
    href: "/analytics",
    title: "Analytics",
    description: "Volume, score, SLA e produtividade.",
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

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Hiring module"
        title="Hub de recrutamento"
        description="Vagas, candidatos, pipeline, entrevistas e analytics no mesmo plano de trabalho."
        actions={
          <Button asChild variant="outline">
            <Link href="/pipeline">Abrir pipeline</Link>
          </Button>
        }
      />

      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Vagas</span>
          <strong className={styles.statValue}>{metrics.jobCount}</strong>
          <p className={styles.statHint}>Requisi??es ativas na organização</p>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Candidatos</span>
          <strong className={styles.statValue}>{metrics.candidateCount}</strong>
          <p className={styles.statHint}>Perfis dentro da base</p>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Aplicações</span>
          <strong className={styles.statValue}>{metrics.applicationCount}</strong>
          <p className={styles.statHint}>Movimentos correntes no funil</p>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Score medio</span>
          <strong className={styles.statValue}>{formatScore(metrics.averageScore)}</strong>
          <p className={styles.statHint}>{metrics.slaAlerts.length} alertas de SLA acompanhados</p>
        </div>
      </section>

      <div className={styles.layout}>
        <div className={styles.column}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Módulos</span>
              <h2 className={styles.panelTitle}>Onde o time opera o hiring</h2>
              <p className={styles.panelDescription}>Cada area do recrutamento fica acessivel sem precisar navegar por uma home vazia de links.</p>
            </div>

            <div className={styles.subGrid2}>
              {modules.map((module) => {
                const Icon = module.icon;

                return (
                  <Link key={module.href} href={module.href} className={`${styles.listItem} ${styles.linkPanel}`}>
                    <span className={styles.iconLead}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <strong className={styles.itemTitle}>{module.title}</strong>
                    <p className={styles.itemDescription}>{module.description}</p>
                    <span className={styles.inlineLink}>Abrir módulo</span>
                  </Link>
                );
              })}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Vagas recentes</span>
              <h2 className={styles.panelTitle}>Tracao atual do pipeline</h2>
              <p className={styles.panelDescription}>As ultimas requisi??es aparecem com volume de aplicações para orientar a priorizacao do time.</p>
            </div>

            <div className={styles.list}>
              {metrics.recentJobs.length ? (
                metrics.recentJobs.map((job) => (
                  <Link key={job.id} href={`/jobs/${job.id}`} className={`${styles.listItem} ${styles.linkPanel}`}>
                    <div className={styles.rowBetween}>
                      <strong className={styles.itemTitle}>{job.title}</strong>
                      <Badge variant="outline">{job._count.applications} aplicações</Badge>
                    </div>
                    <p className={styles.itemDescription}>Requisi??o recente dentro da operação de hiring.</p>
                  </Link>
                ))
              ) : (
                <div className={styles.emptyState}>Ainda não ha vagas abertas.</div>
              )}
            </div>
          </section>
        </div>

        <aside className={styles.column}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Highlights</span>
              <h2 className={styles.panelTitle}>Candidatos que pedem decisão</h2>
              <p className={styles.panelDescription}>Perfis fortes que ja tem contexto suficiente para o time agir mais rapido.</p>
            </div>

            <div className={styles.list}>
              {metrics.intelligenceHighlights.length ? (
                metrics.intelligenceHighlights.map((entry) => (
                  <Link key={entry.id} href={entry.href as Route} className={`${styles.listItem} ${styles.linkPanel}`}>
                    <div className={styles.rowBetween}>
                      <strong className={styles.itemTitle}>{entry.candidateName}</strong>
                      <Badge variant="success">{entry.score}</Badge>
                    </div>
                    <p className={styles.itemDescription}>{entry.jobTitle}</p>
                    <span className={styles.itemMeta}>{entry.stageName}</span>
                  </Link>
                ))
              ) : (
                <div className={styles.emptyState}>Nenhum highlight forte no momento.</div>
              )}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Carga de etapas</span>
              <h2 className={styles.panelTitle}>Onde o funil esta concentrado</h2>
              <p className={styles.panelDescription}>As etapas mais carregadas ajudam a identificar gargalo, volume e necessidade de triagem.</p>
            </div>

            <div className={styles.list}>
              {stageLoad.map((stage) => (
                <div key={stage.id} className={styles.listItem}>
                  <div className={styles.rowBetween}>
                    <strong className={styles.itemTitle}>{stage.name}</strong>
                    <Badge variant="outline">{stage._count.currentFor}</Badge>
                  </div>
                  <p className={styles.itemDescription}>{stage.key}</p>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
