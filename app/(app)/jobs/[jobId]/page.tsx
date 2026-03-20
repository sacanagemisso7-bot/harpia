import Link from "next/link";
import { ArrowRight, CircleGauge, PencilLine, UsersRound } from "lucide-react";
import { notFound } from "next/navigation";

import { ApplicationStageForm } from "@/components/applications/application-stage-form";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { hasPermission } from "@/lib/auth/permissions";
import { hasPlanFeature } from "@/lib/billing/features";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { getPipelineStages } from "@/lib/pipeline/queries";
import { getJobById } from "@/lib/jobs/queries";
import { formatScore } from "@/lib/utils";

import { moveApplicationStage } from "../../applications/actions";

export default async function JobDetailPage({
  params
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const user = await requireCurrentUser();
  const [job, stages] = await Promise.all([
    getJobById(jobId, user.organizationId),
    getPipelineStages(user.organizationId)
  ]);

  if (!job) {
    notFound();
  }

  const averageScore =
    job.applications.length > 0
      ? Math.round(
          job.applications.reduce((sum, application) => sum + (application.score ?? 0), 0) / job.applications.length
        )
      : 0;
  const canManageJob = hasPermission(user.role, "manage_jobs");
  const canManageApplications = hasPermission(user.role, "manage_applications");
  const canUseAutomations = hasPlanFeature(user.organizationBillingPlan, "job_automations");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Job detail"
        title={job.title}
        description={job.summary}
        actions={
          <>
            <Badge variant={job.status === "OPEN" ? "success" : "outline"}>{job.status}</Badge>
            <Badge variant="outline">{job.department}</Badge>
            <Badge variant="outline">{job.location}</Badge>
            {canManageJob ? (
              <Button asChild variant="outline">
                <Link href={`/jobs/${job.id}/edit`}>
                  <PencilLine className="mr-2 h-4 w-4" />
                  Editar vaga
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-6">
          <Card className="panel-hover">
            <CardHeader>
              <CardTitle>Descricao e criterios</CardTitle>
              <CardDescription>Base de score, triagem e roteiro de entrevista.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="whitespace-pre-line text-sm leading-7 text-muted-foreground">{job.description}</p>
              <div className="grid gap-4">
                {job.criteria.map((criterion) => (
                  <div key={criterion.id} className="rounded-[1.35rem] border border-border/70 bg-white/75 p-5">
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-semibold">{criterion.label}</p>
                      <Badge variant={criterion.type === "MUST_HAVE" ? "success" : "outline"}>
                        {criterion.type === "MUST_HAVE" ? "Obrigatorio" : "Desejavel"}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{criterion.notes || "Sem observacoes adicionais."}</p>
                    <p className="mt-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">Peso {criterion.weight}/10</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="panel-hover">
            <CardHeader>
              <CardTitle>Scorecard de entrevista</CardTitle>
              <CardDescription>Template por vaga para padronizar a avaliacao do time.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {job.scorecardItems.length ? (
                job.scorecardItems.map((item) => (
                  <div key={item.id} className="rounded-[1.35rem] border border-border/70 bg-white/75 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold">{item.label}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {item.category} {item.isRequired ? "- obrigatorio" : "- complementar"}
                        </p>
                      </div>
                      <Badge variant="outline">Peso {item.weight}/10</Badge>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">{item.description || "Sem guia adicional para este eixo."}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-[1.35rem] border border-dashed border-border bg-white/75 p-6 text-sm text-muted-foreground">
                  Nenhum item de scorecard configurado para esta vaga.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="panel-hover">
            <CardHeader>
              <CardTitle>Automacoes ativas</CardTitle>
              <CardDescription>Regras que movem automaticamente a aplicacao no pipeline.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {canUseAutomations && job.automationRules.length ? (
                job.automationRules.map((rule) => (
                  <div key={rule.id} className="rounded-[1.35rem] border border-border/70 bg-white/75 p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold">{rule.trigger}</p>
                        <p className="mt-1 text-sm text-muted-foreground">Destino automatico: {rule.targetStage.name}</p>
                      </div>
                      <Badge variant={rule.enabled ? "success" : "outline"}>{rule.enabled ? "Ativa" : "Pausada"}</Badge>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">{rule.notes || "Sem observacoes adicionais."}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-[1.35rem] border border-dashed border-border bg-white/75 p-6 text-sm text-muted-foreground">
                  {canUseAutomations
                    ? "Nenhuma automacao configurada para esta vaga."
                    : "Automacoes ficam disponiveis a partir do plano Growth."}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="panel-hover">
            <CardHeader>
              <CardTitle>Ranking de candidatos</CardTitle>
              <CardDescription>Aplicacoes ordenadas por score de aderencia e etapa atual.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {job.applications.length ? (
                job.applications.map((application, index) => (
                  <div key={application.id} className="rounded-[1.4rem] border border-border/70 bg-white/75 p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-secondary-foreground">
                            #{index + 1}
                          </div>
                          <Link href={`/applications/${application.id}`} className="font-semibold hover:text-primary">
                            {application.candidate.fullName}
                          </Link>
                        </div>
                        <p className="text-sm text-muted-foreground">{application.candidate.currentTitle || "Sem cargo atual informado"}</p>
                        <p className="text-sm leading-6 text-muted-foreground">
                          {application.executiveSummary || "Score gerado, mas sem resumo executivo adicional."}
                        </p>
                      </div>
                      <div className="w-full max-w-[220px] space-y-3">
                        <div className="rounded-[1.1rem] border border-border/70 bg-white p-4 text-center">
                          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Score</p>
                          <p className="mt-1 font-display text-3xl font-semibold">{formatScore(application.score)}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{application.currentStage?.name || "Sem etapa"}</p>
                        </div>
                        {canManageApplications ? (
                          <ApplicationStageForm
                            compact
                            stages={stages}
                            currentStageId={application.currentStageId}
                            action={moveApplicationStage.bind(null, application.id)}
                          />
                        ) : null}
                        <Button asChild variant="outline" size="sm" className="w-full">
                          <Link href={`/applications/${application.id}`}>
                            Abrir aplicacao
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[1.35rem] border border-dashed border-border bg-white/75 p-6 text-sm text-muted-foreground">
                  Nenhuma candidatura vinculada ainda. Crie a aplicacao a partir do detalhe do candidato.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="panel-hover">
            <CardHeader>
              <CardTitle>Resumo operacional</CardTitle>
              <CardDescription>Leitura rapida para o time de RH e hiring managers.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="rounded-[1.25rem] border border-border/70 bg-white/75 p-5">
                <p className="text-sm text-muted-foreground">Senioridade</p>
                <p className="mt-2 font-semibold">{job.seniority}</p>
              </div>
              <div className="rounded-[1.25rem] border border-border/70 bg-white/75 p-5">
                <p className="text-sm text-muted-foreground">Experiencia minima</p>
                <p className="mt-2 font-semibold">{job.minExperienceYears ?? 0} anos</p>
              </div>
              <div className="rounded-[1.25rem] border border-border/70 bg-white/75 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Candidaturas</p>
                    <p className="mt-2 font-semibold">{job._count.applications}</p>
                  </div>
                  <UsersRound className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
              <div className="rounded-[1.25rem] border border-border/70 bg-white/75 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Media de score</p>
                    <p className="mt-2 font-semibold">{formatScore(averageScore)}</p>
                  </div>
                  <CircleGauge className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
