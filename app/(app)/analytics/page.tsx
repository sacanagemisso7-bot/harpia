import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAnalyticsSnapshot } from "@/lib/analytics/queries";
import { requirePermission } from "@/lib/auth/permissions";
import { hasPlanFeature } from "@/lib/billing/features";
import { formatScore } from "@/lib/utils";

import styles from "@/components/operations/ops-workspace.module.css";

function formatHours(value: number) {
  return `${value}h`;
}

export default async function AnalyticsPage() {
  const user = await requirePermission("view_analytics");
  const hasAdvancedAnalytics = hasPlanFeature(user.organizationBillingPlan, "advanced_analytics");

  if (!hasAdvancedAnalytics) {
    return (
      <div className={styles.workspace}>
        <div className={styles.header}>
          <span className={styles.eyebrow}>Análises</span>
          <h2 className={styles.title}>Analytics avançado faz parte do Growth</h2>
          <p className={styles.description}>
            O plano atual cobre operação diária. Leitura profunda de volume, score, SLA e produtividade fica liberada a
            partir do Growth.
          </p>
        </div>

        <div className={styles.statRow}>
          <div className={styles.statPill}>
            <strong>Score</strong>
            <span>Distribuição por faixa</span>
          </div>
          <div className={styles.statPill}>
            <strong>SLA</strong>
            <span>Tempo até revisão e entrevista</span>
          </div>
          <div className={styles.statPill}>
            <strong>Produtividade</strong>
            <span>Leitura por time e volume</span>
          </div>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.toolbarMeta}>
            <div className={styles.tabs}>
              <Button asChild size="sm">
                <Link href="/settings/billing">
                  Abrir plano
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/pipeline">Ver pipeline</Link>
              </Button>
            </div>
            <span className={styles.shortcutHint}>Libere sinais mais profundos sem perder a leitura operacional do dia a dia.</span>
          </div>
        </div>

        <div className={styles.workflowGuide}>
          <span>
            <strong>1.</strong> Veja o que falta
          </span>
          <span>
            <strong>2.</strong> Compare com o plano atual
          </span>
          <span>
            <strong>3.</strong> Libere quando fizer sentido
          </span>
        </div>

        <div className={styles.body}>
          <section className={styles.listPanel}>
            <div className={styles.panelHeader}>
              <div className={styles.panelHeaderRow}>
                <div>
                  <h3 className={styles.panelTitle}>O que destrava</h3>
                  <p className={styles.panelDescription}>O upgrade adiciona clareza onde o volume começa a esconder os gargalos.</p>
                </div>
              </div>
            </div>

            <div className={styles.list}>
              {[
                {
                  title: "Distribuição de score",
                  description: "Veja qualidade real das aplicações por faixa e evite percepção subjetiva."
                },
                {
                  title: "Produtividade do time",
                  description: "Entenda quem está movendo o funil, agendando entrevistas e fechando feedbacks."
                },
                {
                  title: "SLA do processo",
                  description: "Descubra travas entre candidatura, revisão, mudança de etapa e agenda."
                }
              ].map((item) => (
                <div key={item.title} className={styles.row}>
                  <div className={styles.rowLead}>
                    <p className={styles.rowTitle}>{item.title}</p>
                    <p className={styles.rowSubtitle}>{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <aside className={styles.detailColumn}>
            <section className={styles.detailPanel}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.panelTitle}>Quando faz sentido</h3>
              </div>
              <div className={styles.sectionStack}>
                <div className={styles.detailCell}>
                  <span className={styles.metaValue}>Mais volume</span>
                  <p className={styles.detailText}>Quando o time já não consegue mais enxergar gargalo só olhando o pipeline.</p>
                </div>
                <div className={styles.detailCell}>
                  <span className={styles.metaValue}>Mais stakeholders</span>
                  <p className={styles.detailText}>Quando RH, liderança e operação precisam de uma leitura comum do funil.</p>
                </div>
                <div className={styles.detailCell}>
                  <span className={styles.metaValue}>Mais previsibilidade</span>
                  <p className={styles.detailText}>Quando atrasos, estagnação e perda de velocidade viram custo real.</p>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    );
  }

  const analytics = await getAnalyticsSnapshot(user.organizationId);
  const stageLoad = [...analytics.stages].sort((left, right) => right._count.currentFor - left._count.currentFor).slice(0, 5);
  const scoreBands = [
    { label: "85-100", value: analytics.scoreBands.excellent, variant: "success" as const },
    { label: "70-84", value: analytics.scoreBands.strong, variant: "outline" as const },
    { label: "50-69", value: analytics.scoreBands.moderate, variant: "warning" as const },
    { label: "0-49", value: analytics.scoreBands.low, variant: "destructive" as const }
  ];

  const stats = [
    { label: "Primeira revisão", value: formatHours(analytics.sla.averageTimeToFirstReviewHours) },
    { label: "Mudança de etapa", value: formatHours(analytics.sla.averageStageTransitionHours) },
    { label: "Estagnadas", value: analytics.sla.stalledApplications },
    { label: "Lead time de entrevista", value: formatHours(analytics.sla.averageInterviewLeadTimeHours) }
  ];

  return (
    <div className={styles.workspace}>
      <div className={styles.header}>
        <span className={styles.eyebrow}>Análises</span>
        <h2 className={styles.title}>Leitura operacional da contratação</h2>
        <p className={styles.description}>
          Volume, score, velocidade e carga do funil em uma visão mais simples de ler e muito mais útil para decidir.
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
          <span className={styles.shortcutHint}>Sinais simples para decidir onde agir primeiro.</span>
        </div>
      </div>

      <div className={styles.workflowGuide}>
        <span>
          <strong>1.</strong> Leia os gargalos
        </span>
        <span>
          <strong>2.</strong> Abra a origem
        </span>
        <span>
          <strong>3.</strong> Aja no pipeline
        </span>
      </div>

      <div className={styles.body}>
        <section className={styles.listPanel}>
          <div className={styles.panelHeader}>
            <div className={styles.panelHeaderRow}>
              <div>
                <h3 className={styles.panelTitle}>Fontes e qualidade</h3>
                <p className={styles.panelDescription}>De onde o volume entra e como a qualidade média se comporta por canal.</p>
              </div>
            </div>
          </div>

          <div className={styles.list}>
            {analytics.sources.length ? (
              analytics.sources.map((source) => (
                <div key={source.source} className={styles.row}>
                  <div className={styles.rowTop}>
                    <div className={styles.rowLead}>
                      <p className={styles.rowTitle}>{source.source}</p>
                      <p className={styles.rowSubtitle}>
                        {source.candidates} candidatos · {source.applications} aplicações
                      </p>
                    </div>
                    <Badge variant="outline">{formatScore(source.averageScore)}</Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.emptyWrap}>
                <p className={styles.emptyState}>Ainda não há dados suficientes para montar a leitura por fonte.</p>
              </div>
            )}
          </div>
        </section>

        <aside className={styles.detailColumn}>
          <section className={styles.detailPanel}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.panelTitle}>Faixas de score</h3>
            </div>

            <div className={styles.sectionStack}>
              {scoreBands.map((band) => (
                <div key={band.label} className={styles.detailCell}>
                  <div className={styles.sectionHeader}>
                    <span className={styles.metaValue}>{band.label}</span>
                    <Badge variant={band.variant}>{band.value}</Badge>
                  </div>
                  <p className={styles.detailText}>Aplicações dentro desta faixa de avaliação.</p>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.detailPanel}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.panelTitle}>Etapas mais carregadas</h3>
            </div>

            <div className={styles.sectionStack}>
              {stageLoad.length ? (
                stageLoad.map((stage) => (
                  <div key={stage.id} className={styles.detailCell}>
                    <div className={styles.sectionHeader}>
                      <span className={styles.metaValue}>{stage.name}</span>
                      <Badge variant="outline">{stage._count.currentFor}</Badge>
                    </div>
                    <p className={styles.detailText}>{stage.key}</p>
                  </div>
                ))
              ) : (
                <p className={styles.emptyState}>Nenhuma etapa com carga significativa para destacar.</p>
              )}
            </div>
          </section>

          <section className={styles.formPanel}>
            <div className={styles.panelHeader}>
              <h3 className={styles.panelTitle}>Produtividade recente</h3>
              <p className={styles.panelDescription}>Atividade do time com base no trilho operacional dos últimos 30 dias.</p>
            </div>

            <div className={styles.sectionStack}>
              {analytics.productivity.length ? (
                analytics.productivity.map((member) => (
                  <div key={member.userId ?? member.name} className={styles.detailCell}>
                    <div className={styles.sectionHeader}>
                      <span className={styles.metaValue}>{member.name}</span>
                      <Badge variant="outline">{member.totalActivity}</Badge>
                    </div>
                    <p className={styles.detailText}>{member.roleLabel}</p>
                    <div className={styles.detailGrid}>
                      <div className={styles.detailCell}>
                        <span className={styles.metaLabel}>Aplicações</span>
                        <span className={styles.metaValue}>{member.applicationsCreated}</span>
                      </div>
                      <div className={styles.detailCell}>
                        <span className={styles.metaLabel}>Movimentos</span>
                        <span className={styles.metaValue}>{member.stageMoves}</span>
                      </div>
                      <div className={styles.detailCell}>
                        <span className={styles.metaLabel}>Entrevistas</span>
                        <span className={styles.metaValue}>{member.interviewsScheduled}</span>
                      </div>
                      <div className={styles.detailCell}>
                        <span className={styles.metaLabel}>Feedbacks</span>
                        <span className={styles.metaValue}>{member.feedbackSubmitted}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className={styles.emptyState}>Ainda não há atividade suficiente para montar a leitura do time.</p>
              )}
            </div>
          </section>
        </aside>
      </div>

      <section className={styles.listPanel}>
        <div className={styles.panelHeader}>
          <div className={styles.panelHeaderRow}>
            <div>
              <h3 className={styles.panelTitle}>Vagas com mais tração</h3>
              <p className={styles.panelDescription}>Onde o volume está concentrado e como a qualidade média se comporta.</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
          {analytics.topJobs.length ? (
            analytics.topJobs.map((job) => (
              <Link key={job.id} href={`/jobs/${job.id}`} className={styles.detailCell}>
                <div className={styles.sectionHeader}>
                  <span className={styles.metaValue}>{job.title}</span>
                  <Badge variant="outline">{job.applications}</Badge>
                </div>
                <p className={styles.detailText}>Score médio {formatScore(job.averageScore)}</p>
              </Link>
            ))
          ) : (
            <p className={styles.emptyState}>Ainda não há vagas suficientes para montar esse ranking.</p>
          )}
        </div>
      </section>
    </div>
  );
}
