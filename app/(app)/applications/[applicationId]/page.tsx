import { EmailTemplateType } from "@prisma/client";
import Link from "next/link";
import { ArrowRightLeft, BriefcaseBusiness, CalendarClock, CircleGauge, Sparkles, UserRound } from "lucide-react";
import { notFound } from "next/navigation";

import { ApplicationStageForm } from "@/components/applications/application-stage-form";
import { RecalculateScoreForm } from "@/components/applications/recalculate-score-form";
import { SendTemplateEmailForm } from "@/components/communications/send-template-email-form";
import { InterviewForm } from "@/components/interviews/interview-form";
import { PageHeader } from "@/components/layout/page-header";
import { NoteFeed } from "@/components/notes/note-feed";
import { NoteForm } from "@/components/notes/note-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getStageCopilotDecision } from "@/lib/ai/stage-copilot";
import { hasPermission } from "@/lib/auth/permissions";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { getTemplateLabel } from "@/lib/email/templates";
import { isEmailConfigured } from "@/lib/email/transporter";
import { getApplicationById } from "@/lib/applications/queries";
import { getPipelineStages } from "@/lib/pipeline/queries";
import { formatScore } from "@/lib/utils";

import {
  createApplicationNote,
  moveApplicationStage,
  recalculateApplicationScore,
  sendApplicationEmail
} from "../actions";
import { createInterview } from "../../interviews/actions";

function jsonStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export default async function ApplicationDetailPage({
  params
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;
  const user = await requireCurrentUser();
  const [application, stages] = await Promise.all([
    getApplicationById(applicationId, user.organizationId),
    getPipelineStages(user.organizationId)
  ]);

  if (!application) {
    notFound();
  }

  const strengths = jsonStringArray(application.strengths);
  const gaps = jsonStringArray(application.gaps);
  const skills = jsonStringArray(application.detectedSkills);
  const questions = jsonStringArray(application.suggestedQuestions);
  const playbook =
    application.organization.departmentPlaybooks.find((entry) => entry.department === application.job.department) ?? null;
  const copilotDecision = await getStageCopilotDecision({
    application: {
      score: application.score,
      scoreJustification: application.scoreJustification,
      executiveSummary: application.executiveSummary,
      currentStage: application.currentStage ? { name: application.currentStage.name } : null,
      job: {
        title: application.job.title,
        department: application.job.department,
        scorecardItems: application.job.scorecardItems.map((item) => ({
          label: item.label,
          category: item.category,
          weight: item.weight,
          isRequired: item.isRequired
        }))
      },
      candidate: {
        fullName: application.candidate.fullName,
        currentTitle: application.candidate.currentTitle,
        yearsExperience: application.candidate.yearsExperience
      },
      interviews: application.interviews.map((interview) => ({
        title: interview.title,
        feedbacks: interview.feedbacks.map((feedback) => ({
          recommendation: feedback.recommendation,
          strengths: feedback.strengths,
          concerns: feedback.concerns
        }))
      }))
    },
    playbook
  });
  const smtpReady = isEmailConfigured();
  const canManageApplication = hasPermission(user.role, "manage_applications");
  const canManageInterviews = hasPermission(user.role, "manage_interviews");
  const canCreateNotes = hasPermission(user.role, "create_hiring_notes");
  const canManageCommunications = hasPermission(user.role, "manage_communications");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Application detail"
        title={`${application.candidate.fullName} x ${application.job.title}`}
        description={application.executiveSummary || "Aplicacao pronta para triagem, score, pipeline e decisao."}
        actions={
          <>
            <Badge variant="success">{application.currentStage?.name || "Sem etapa"}</Badge>
            <Badge variant="outline">{formatScore(application.score)}</Badge>
          </>
        }
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-6">
          <Card className="panel-hover">
            <CardHeader>
              <CardTitle>Resumo da avaliacao</CardTitle>
              <CardDescription>Leitura executiva e justificativa do score.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-[1.35rem] border border-border/70 bg-white/75 p-5">
                <p className="text-sm text-muted-foreground">Justificativa</p>
                <p className="mt-2 text-sm leading-6">{application.scoreJustification || "Score ainda sem justificativa."}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[1.35rem] border border-border/70 bg-white/75 p-5">
                  <p className="text-sm text-muted-foreground">Pontos fortes</p>
                  <div className="mt-3 space-y-2">
                    {strengths.length ? strengths.map((item) => <p key={item} className="text-sm">{item}</p>) : <p className="text-sm text-muted-foreground">Sem highlights registrados.</p>}
                  </div>
                </div>
                <div className="rounded-[1.35rem] border border-border/70 bg-white/75 p-5">
                  <p className="text-sm text-muted-foreground">Gaps observados</p>
                  <div className="mt-3 space-y-2">
                    {gaps.length ? gaps.map((item) => <p key={item} className="text-sm">{item}</p>) : <p className="text-sm text-muted-foreground">Sem gaps registrados.</p>}
                  </div>
                </div>
              </div>
              <div className="rounded-[1.35rem] border border-border/70 bg-white/75 p-5">
                <p className="text-sm text-muted-foreground">Perguntas sugeridas</p>
                <div className="mt-3 space-y-3">
                  {questions.length ? (
                    questions.map((question) => (
                      <div key={question} className="flex items-start gap-3">
                        <div className="rounded-2xl bg-secondary p-2 text-secondary-foreground">
                          <Sparkles className="h-4 w-4" />
                        </div>
                        <p className="text-sm">{question}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Sem perguntas registradas.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="panel-hover">
            <CardHeader>
              <CardTitle>Copiloto de decisao por etapa</CardTitle>
              <CardDescription>
                Leitura orientada para decidir se a candidatura deve avancar, segurar ou encerrar nesta etapa.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-[1.35rem] border border-border/70 bg-white/75 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Recomendacao</p>
                    <p className="mt-2 font-display text-3xl font-semibold">{copilotDecision.recommendation}</p>
                  </div>
                  <Badge variant={copilotDecision.recommendation === "ADVANCE" ? "success" : copilotDecision.recommendation === "REJECT" ? "destructive" : "warning"}>
                    {application.currentStage?.name || "Sem etapa"}
                  </Badge>
                </div>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">{copilotDecision.summary}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[1.35rem] border border-border/70 bg-white/75 p-5">
                  <p className="text-sm text-muted-foreground">Por que agora</p>
                  <div className="mt-3 space-y-2">
                    {copilotDecision.reasons.map((reason) => (
                      <p key={reason} className="text-sm">
                        {reason}
                      </p>
                    ))}
                  </div>
                </div>
                <div className="rounded-[1.35rem] border border-border/70 bg-white/75 p-5">
                  <p className="text-sm text-muted-foreground">Proximas acoes</p>
                  <div className="mt-3 space-y-2">
                    {copilotDecision.nextActions.map((action) => (
                      <p key={action} className="text-sm">
                        {action}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
              {playbook ? (
                <div className="rounded-[1.35rem] border border-border/70 bg-white/75 p-5">
                  <p className="text-sm text-muted-foreground">Playbook aplicado</p>
                  <p className="mt-2 font-semibold">{playbook.title}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{playbook.department}</p>
                </div>
              ) : (
                <div className="rounded-[1.35rem] border border-dashed border-border bg-white/75 p-5 text-sm text-muted-foreground">
                  Nenhum playbook do departamento encontrado. Cadastre um playbook em settings para guiar melhor essa decisao.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="panel-hover">
            <CardHeader>
              <CardTitle>Historico de pipeline</CardTitle>
              <CardDescription>Movimentacoes registradas para auditoria e contexto da vaga.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {application.history.map((entry) => (
                <div key={entry.id} className="rounded-[1.35rem] border border-border/70 bg-white/75 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <p className="font-semibold">
                        {entry.fromStage?.name || "Inicio"} <ArrowRightLeft className="mx-2 inline h-4 w-4" /> {entry.toStage.name}
                      </p>
                      <p className="text-sm text-muted-foreground">{entry.notes || "Sem notas adicionais."}</p>
                    </div>
                    <div className="text-right text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      <p>{entry.movedBy?.name || "Sistema"}</p>
                      <p>{new Intl.DateTimeFormat("pt-BR").format(entry.createdAt)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="panel-hover">
            <CardHeader>
              <CardTitle>Notas internas da aplicacao</CardTitle>
              <CardDescription>Observacoes do time sobre aderencia, riscos e proximos passos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {canCreateNotes ? (
                <NoteForm
                  title="Nova nota da aplicacao"
                  action={createApplicationNote.bind(null, application.id)}
                />
              ) : null}
              <NoteFeed notes={application.notes} emptyMessage="Ainda nao ha notas internas nesta aplicacao." />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="panel-hover">
            <CardHeader>
              <CardTitle>Controles da aplicacao</CardTitle>
              <CardDescription>Recalcule score e mova de etapa sem sair da tela.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-[1.35rem] border border-border/70 bg-white/75 p-5 text-center">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Score atual</p>
                <p className="mt-2 font-display text-4xl font-semibold">{formatScore(application.score)}</p>
              </div>
              {canManageApplication ? (
                <>
                  <ApplicationStageForm
                    stages={stages}
                    currentStageId={application.currentStageId}
                    action={moveApplicationStage.bind(null, application.id)}
                  />
                  <RecalculateScoreForm action={recalculateApplicationScore.bind(null, application.id)} />
                </>
              ) : (
                <div className="rounded-[1.25rem] border border-dashed border-border bg-white/75 p-5 text-sm text-muted-foreground">
                  Somente recrutadores e administradores podem mover etapa ou recalcular score.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="panel-hover">
            <CardHeader>
              <CardTitle>Entrevistas</CardTitle>
              <CardDescription>Agende e acompanhe os proximos encontros com o candidato.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {canManageInterviews ? (
                <InterviewForm action={createInterview.bind(null, application.id)} />
              ) : (
                <div className="rounded-[1.25rem] border border-dashed border-border bg-white/75 p-5 text-sm text-muted-foreground">
                  Somente recrutadores e administradores podem agendar entrevistas.
                </div>
              )}
              <div className="space-y-3">
                {application.interviews.length ? (
                  application.interviews.map((interview) => (
                    <div key={interview.id} className="rounded-[1.25rem] border border-border/70 bg-white/75 p-4">
                      <div className="flex items-start gap-3">
                        <div className="rounded-2xl bg-secondary p-2 text-secondary-foreground">
                          <CalendarClock className="h-4 w-4" />
                        </div>
                        <div className="space-y-1">
                          <p className="font-semibold">{interview.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(interview.startsAt)}
                            {" · "}
                            {new Intl.DateTimeFormat("pt-BR", { timeStyle: "short" }).format(interview.endsAt)}
                          </p>
                          <p className="text-sm text-muted-foreground">{interview.location || interview.meetingUrl || "Sem local ou link"}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[1.25rem] border border-dashed border-border bg-white/75 p-5 text-sm text-muted-foreground">
                    Nenhuma entrevista agendada ainda.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="panel-hover">
            <CardHeader>
              <CardTitle>Contexto do candidato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-[1.25rem] border border-border/70 bg-white/75 p-5">
                <div className="flex items-start gap-3">
                  <UserRound className="mt-1 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-semibold">{application.candidate.fullName}</p>
                    <p className="text-sm text-muted-foreground">{application.candidate.currentTitle || "Sem cargo atual"}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-[1.25rem] border border-border/70 bg-white/75 p-5">
                <div className="flex items-start gap-3">
                  <BriefcaseBusiness className="mt-1 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-semibold">{application.job.title}</p>
                    <p className="text-sm text-muted-foreground">{application.job.department}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-[1.25rem] border border-border/70 bg-white/75 p-5">
                <div className="flex items-start gap-3">
                  <CircleGauge className="mt-1 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-semibold">Skills detectadas</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {skills.length ? skills.map((skill) => <Badge key={skill} variant="success">{skill}</Badge>) : <span className="text-sm text-muted-foreground">Sem skills estruturadas.</span>}
                    </div>
                  </div>
                </div>
              </div>
              <Button asChild variant="outline" className="w-full">
                <Link href={`/jobs/${application.jobId}`}>Voltar para a vaga</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="panel-hover">
            <CardHeader>
              <CardTitle>Comunicacao com candidato</CardTitle>
              <CardDescription>
                Dispare emails a partir dos templates do workspace. {smtpReady ? "SMTP ativo." : "Configure SMTP para habilitar envio."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {application.candidate.email && canManageCommunications ? (
                <>
                  <div className="rounded-[1.25rem] border border-border/70 bg-white/75 p-4 text-sm text-muted-foreground">
                    Destinatario: <span className="font-medium text-foreground">{application.candidate.email}</span>
                  </div>
                  {[EmailTemplateType.APPLICATION_RECEIVED, EmailTemplateType.STAGE_ADVANCED, EmailTemplateType.REJECTION].map(
                    (templateType) => (
                      <SendTemplateEmailForm
                        key={templateType}
                        action={sendApplicationEmail.bind(null, application.id)}
                        templateType={templateType}
                        label={getTemplateLabel(templateType)}
                      />
                    )
                  )}
                </>
              ) : application.candidate.email ? (
                <div className="rounded-[1.25rem] border border-dashed border-border bg-white/75 p-5 text-sm text-muted-foreground">
                  Somente recrutadores e administradores podem enviar comunicacoes.
                </div>
              ) : (
                <div className="rounded-[1.25rem] border border-dashed border-border bg-white/75 p-5 text-sm text-muted-foreground">
                  Cadastre um email no perfil do candidato para enviar comunicacoes.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
