import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { getAnalyticsSnapshot } from "@/lib/analytics/queries";
import { requirePermission } from "@/lib/auth/permissions";
import { hasPlanFeature } from "@/lib/billing/features";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatScore } from "@/lib/utils";

export default async function AnalyticsPage() {
  const user = await requirePermission("view_analytics");
  const hasAdvancedAnalytics = hasPlanFeature(user.organizationBillingPlan, "advanced_analytics");

  if (!hasAdvancedAnalytics) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Analytics"
          title="Analytics avancado faz parte do Growth"
          description="O plano Starter continua com dashboard e operacao diaria, mas os sinais mais profundos de performance e SLA ficam disponiveis a partir do Growth."
          actions={
            <Button asChild>
              <Link href="/settings/billing">
                Abrir billing
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          }
        />

        <Card className="panel-hover">
          <CardContent className="grid gap-4 p-6 md:grid-cols-3">
            <div className="rounded-[1.35rem] border border-border/70 bg-white/75 p-5">
              <p className="font-semibold">O que destrava no Growth</p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Distribuicao de score, produtividade do time, leitura por fonte, gargalos do pipeline e SLA operacional.
              </p>
            </div>
            <div className="rounded-[1.35rem] border border-border/70 bg-white/75 p-5">
              <p className="font-semibold">Para quem faz sentido</p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Times com mais volume, mais stakeholders e necessidade de previsibilidade sobre tempo de resposta e qualidade.
              </p>
            </div>
            <div className="rounded-[1.35rem] border border-border/70 bg-white/75 p-5">
              <p className="font-semibold">Como subir</p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Abra o billing do workspace, ative trial ou mova a conta para Growth para liberar a area inteira.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const analytics = await getAnalyticsSnapshot(user.organizationId);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Analytics"
        title="Sinais operacionais do funil"
        description="Entenda quais vagas atraem mais volume, quais fontes trazem melhor aderencia e onde o pipeline esta concentrando candidaturas."
        actions={
          <Button asChild variant="outline">
            <Link href="/pipeline">
              Ver pipeline
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        }
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card className="panel-hover">
          <CardHeader>
            <CardTitle>Origem dos candidatos</CardTitle>
            <CardDescription>Volume e qualidade por canal de entrada.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {analytics.sources.map((source) => (
              <div key={source.source} className="rounded-[1.35rem] border border-border/70 bg-white/75 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold">{source.source}</p>
                    <p className="text-sm text-muted-foreground">{`${source.candidates} candidatos - ${source.applications} aplicacoes`}</p>
                  </div>
                  <Badge variant="outline">{formatScore(source.averageScore)}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="panel-hover">
            <CardHeader>
              <CardTitle>Distribuicao de score</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "85-100", value: analytics.scoreBands.excellent, variant: "success" as const },
                { label: "70-84", value: analytics.scoreBands.strong, variant: "outline" as const },
                { label: "50-69", value: analytics.scoreBands.moderate, variant: "warning" as const },
                { label: "0-49", value: analytics.scoreBands.low, variant: "destructive" as const }
              ].map((band) => (
                <div key={band.label} className="rounded-[1.25rem] border border-border/70 bg-white/75 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-semibold">{band.label}</p>
                    <Badge variant={band.variant}>{band.value}</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="panel-hover">
            <CardHeader>
              <CardTitle>Etapas mais carregadas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {analytics.stages.map((stage) => (
                <div key={stage.id} className="rounded-[1.25rem] border border-border/70 bg-white/75 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold">{stage.name}</p>
                      <p className="text-sm text-muted-foreground">{stage.key}</p>
                    </div>
                    <Badge variant="outline">{stage._count.currentFor}</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Tempo medio para primeira revisao",
            value: `${analytics.sla.averageTimeToFirstReviewHours}h`,
            hint: "Da candidatura ate a primeira mudanca relevante de etapa."
          },
          {
            label: "Tempo medio entre etapas",
            value: `${analytics.sla.averageStageTransitionHours}h`,
            hint: "Media operacional entre movimentos registrados."
          },
          {
            label: "Aplicacoes estagnadas",
            value: String(analytics.sla.stalledApplications),
            hint: "Sem movimentacao ha 7 dias ou mais em etapa nao terminal."
          },
          {
            label: "Lead time para entrevistas",
            value: `${analytics.sla.averageInterviewLeadTimeHours}h`,
            hint: `${analytics.sla.scheduledInterviewCount} entrevistas agendadas consideradas.`
          }
        ].map((metric) => (
          <Card key={metric.label} className="panel-hover">
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{metric.label}</p>
              <p className="mt-3 font-display text-3xl font-semibold">{metric.value}</p>
              <p className="mt-2 text-sm text-muted-foreground">{metric.hint}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="panel-hover">
        <CardHeader>
          <CardTitle>Vagas com maior tracao</CardTitle>
          <CardDescription>Priorize as vagas com mais volume e melhor qualidade media.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 xl:grid-cols-3">
          {analytics.topJobs.map((job) => (
            <Link
              key={job.id}
              href={`/jobs/${job.id}`}
              className="rounded-[1.35rem] border border-border/70 bg-white/75 p-5 transition hover:-translate-y-1 hover:shadow-soft"
            >
              <p className="font-semibold">{job.title}</p>
              <p className="mt-2 text-sm text-muted-foreground">{job.applications} aplicacoes</p>
              <p className="mt-4 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Media de score {formatScore(job.averageScore)}
              </p>
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card className="panel-hover">
        <CardHeader>
          <CardTitle>Produtividade do time</CardTitle>
          <CardDescription>Atividade dos ultimos 30 dias com base no trilho de auditoria operacional.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {analytics.productivity.length ? (
            analytics.productivity.map((member) => (
              <div key={member.userId ?? member.name} className="rounded-[1.35rem] border border-border/70 bg-white/75 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="font-semibold">{member.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {member.roleLabel} - {member.totalActivity} eventos operacionais
                    </p>
                  </div>
                  <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-2xl border border-border/70 bg-white px-4 py-3">
                      Aplicacoes: <span className="font-medium text-foreground">{member.applicationsCreated}</span>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-white px-4 py-3">
                      Movimentos: <span className="font-medium text-foreground">{member.stageMoves}</span>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-white px-4 py-3">
                      Entrevistas: <span className="font-medium text-foreground">{member.interviewsScheduled}</span>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-white px-4 py-3">
                      Feedbacks: <span className="font-medium text-foreground">{member.feedbackSubmitted}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[1.35rem] border border-dashed border-border bg-white/75 p-6 text-sm text-muted-foreground">
              Ainda nao ha atividade suficiente para montar o ranking de produtividade do time.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
