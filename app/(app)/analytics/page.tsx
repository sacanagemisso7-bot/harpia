import Link from "next/link";
import { ArrowRight } from "lucide-react";

import styles from "../workspace-expansion.module.css";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAnalyticsSnapshot } from "@/lib/analytics/queries";
import { requirePermission } from "@/lib/auth/permissions";
import { hasPlanFeature } from "@/lib/billing/features";
import { formatScore } from "@/lib/utils";

export default async function AnalyticsPage() {
  const user = await requirePermission("view_analytics");
  const hasAdvancedAnalytics = hasPlanFeature(user.organizationBillingPlan, "advanced_analytics");

  if (!hasAdvancedAnalytics) {
    return (
      <div className={styles.page}>
        <PageHeader
          eyebrow="Analytics"
          title="Analytics avancado faz parte do Growth"
          description="Starter cobre dashboard e operação di?ria. Os sinais profundos de performance, volume e SLA ficam disponíveis a partir do Growth."
          actions={
            <Button asChild>
              <Link href="/settings/billing">
                Abrir billing
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          }
        />

        <div className={styles.upgradeGrid}>
          <div>
            <strong className={styles.itemTitle}>O que destrava</strong>
            <p>Distribuicao de score, produtividade do time, leitura por fonte e gargalos reais do pipeline.</p>
          </div>
          <div>
            <strong className={styles.itemTitle}>Para quem faz sentido</strong>
            <p>Times com mais volume, mais stakeholders e necessidade de previsibilidade operacional.</p>
          </div>
          <div>
            <strong className={styles.itemTitle}>Como ativar</strong>
            <p>Abra o billing do workspace, use trial ou mova a conta para Growth para liberar a area inteira.</p>
          </div>
        </div>
      </div>
    );
  }

  const analytics = await getAnalyticsSnapshot(user.organizationId);
  const stageLoad = [...analytics.stages].sort((left, right) => right._count.currentFor - left._count.currentFor).slice(0, 6);

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Analytics"
        title="Leitura de volume, score e SLA"
        description="Fontes, etapas, produtividade e gargalos do hiring em uma visão clara do que esta performando e do que esta travando."
        actions={
          <Button asChild variant="outline">
            <Link href="/pipeline">
              Ver pipeline
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        }
      />

      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Primeira revisão</span>
          <strong className={styles.statValue}>{analytics.sla.averageTimeToFirstReviewHours}h</strong>
          <p className={styles.statHint}>Da candidatura ate a primeira mudanca relevante</p>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Transicao entre etapas</span>
          <strong className={styles.statValue}>{analytics.sla.averageStageTransitionHours}h</strong>
          <p className={styles.statHint}>Media operacional entre movimentos</p>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Aplicações estagnadas</span>
          <strong className={styles.statValue}>{analytics.sla.stalledApplications}</strong>
          <p className={styles.statHint}>Sem movimentação ha 7 dias ou mais</p>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Lead time de entrevista</span>
          <strong className={styles.statValue}>{analytics.sla.averageInterviewLeadTimeHours}h</strong>
          <p className={styles.statHint}>{analytics.sla.scheduledInterviewCount} entrevistas consideradas</p>
        </div>
      </section>

      <div className={styles.layout}>
        <div className={styles.column}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Fontes</span>
              <h2 className={styles.panelTitle}>Origem dos candidatos</h2>
              <p className={styles.panelDescription}>Volume e qualidade media por canal de entrada.</p>
            </div>

            <div className={styles.list}>
              {analytics.sources.map((source) => (
                <div key={source.source} className={styles.listItem}>
                  <div className={styles.rowBetween}>
                    <div className={styles.itemLead}>
                      <strong className={styles.itemTitle}>{source.source}</strong>
                      <span className={styles.itemMeta}>
                        {source.candidates} candidatos • {source.applications} aplicações
                      </span>
                    </div>
                    <Badge variant="outline">{formatScore(source.averageScore)}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Vagas</span>
              <h2 className={styles.panelTitle}>Maior tração</h2>
              <p className={styles.panelDescription}>As vagas com mais volume e melhor qualidade media aparecem aqui para ajudar na priorizacao.</p>
            </div>

            <div className={styles.subGrid3}>
              {analytics.topJobs.map((job) => (
                <Link key={job.id} href={`/jobs/${job.id}`} className={`${styles.listItem} ${styles.linkPanel}`}>
                  <strong className={styles.itemTitle}>{job.title}</strong>
                  <p className={styles.itemDescription}>{job.applications} aplicações</p>
                  <span className={styles.itemMeta}>Media de score {formatScore(job.averageScore)}</span>
                </Link>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Produtividade</span>
              <h2 className={styles.panelTitle}>Atividade do time nos ultimos 30 dias</h2>
              <p className={styles.panelDescription}>Leitura operacional com base no trilho de auditoria da plataforma.</p>
            </div>

            <div className={styles.list}>
              {analytics.productivity.length ? (
                analytics.productivity.map((member) => (
                  <div key={member.userId ?? member.name} className={styles.listItem}>
                    <div className={styles.itemHeader}>
                      <div className={styles.itemLead}>
                        <strong className={styles.itemTitle}>{member.name}</strong>
                        <span className={styles.itemMeta}>
                          {member.roleLabel} • {member.totalActivity} eventos operacionais
                        </span>
                      </div>
                    </div>

                    <div className={styles.subGrid2}>
                      <div className={styles.summaryTile}>
                        <strong>{member.applicationsCreated}</strong>
                        <span>Aplicações criadas</span>
                      </div>
                      <div className={styles.summaryTile}>
                        <strong>{member.stageMoves}</strong>
                        <span>Movimentos de etapa</span>
                      </div>
                      <div className={styles.summaryTile}>
                        <strong>{member.interviewsScheduled}</strong>
                        <span>Entrevistas agendadas</span>
                      </div>
                      <div className={styles.summaryTile}>
                        <strong>{member.feedbackSubmitted}</strong>
                        <span>Feedbacks enviados</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.emptyState}>Ainda não ha atividade suficiente para montar o ranking de produtividade.</div>
              )}
            </div>
          </section>
        </div>

        <aside className={styles.column}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Score bands</span>
              <h2 className={styles.panelTitle}>Distribuicao de score</h2>
              <p className={styles.panelDescription}>Veja como a qualidade das aplicações se distribui ao longo da faixa de score.</p>
            </div>

            <div className={styles.list}>
              {[
                { label: "85-100", value: analytics.scoreBands.excellent, variant: "success" as const },
                { label: "70-84", value: analytics.scoreBands.strong, variant: "outline" as const },
                { label: "50-69", value: analytics.scoreBands.moderate, variant: "warning" as const },
                { label: "0-49", value: analytics.scoreBands.low, variant: "destructive" as const }
              ].map((band) => (
                <div key={band.label} className={styles.listItem}>
                  <div className={styles.rowBetween}>
                    <strong className={styles.itemTitle}>{band.label}</strong>
                    <Badge variant={band.variant}>{band.value}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Etapas</span>
              <h2 className={styles.panelTitle}>Carga atual do pipeline</h2>
              <p className={styles.panelDescription}>As etapas mais cheias ajudam a localizar gargalo e concentracao de volume.</p>
            </div>

            <div className={styles.list}>
              {stageLoad.map((stage) => (
                <div key={stage.id} className={styles.listItem}>
                  <div className={styles.rowBetween}>
                    <div className={styles.itemLead}>
                      <strong className={styles.itemTitle}>{stage.name}</strong>
                      <span className={styles.itemMeta}>{stage.key}</span>
                    </div>
                    <Badge variant="outline">{stage._count.currentFor}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
