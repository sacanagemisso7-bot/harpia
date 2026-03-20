import { InterviewStatus } from "@prisma/client";
import Link from "next/link";
import { CalendarDays, ExternalLink, Mail, MapPin, UserRound } from "lucide-react";
import { notFound } from "next/navigation";

import { InterviewFeedbackForm } from "@/components/interviews/interview-feedback-form";
import { InterviewRescheduleForm } from "@/components/interviews/interview-reschedule-form";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { hasPermission, requirePermission } from "@/lib/auth/permissions";
import { getRoleLabel } from "@/lib/auth/roles";
import { buildGoogleCalendarUrl, buildOutlookCalendarUrl } from "@/lib/calendar/providers";
import { isEmailConfigured } from "@/lib/email/transporter";
import { getInterviewById } from "@/lib/interviews/queries";

import { rescheduleInterview, saveInterviewFeedback, sendInterviewInvite, updateInterviewStatus } from "../actions";

function getStatusVariant(status: InterviewStatus) {
  if (status === InterviewStatus.COMPLETED) return "success";
  if (status === InterviewStatus.CANCELLED) return "destructive";
  return "outline";
}

export default async function InterviewDetailPage({
  params
}: {
  params: Promise<{ interviewId: string }>;
}) {
  const { interviewId } = await params;
  const user = await requirePermission("view_interviews");
  const interview = await getInterviewById(interviewId, user.organizationId);

  if (!interview) {
    notFound();
  }

  const canManageInterview = hasPermission(user.role, "manage_interviews");
  const canSubmitFeedback = hasPermission(user.role, "submit_interview_feedback");
  const existingFeedback = interview.feedbacks.find((feedback) => feedback.author.id === user.id);
  const scorecardItems = interview.application.job.scorecardItems;
  const smtpReady = isEmailConfigured();
  const startsAtValue = new Date(interview.startsAt.getTime() - interview.startsAt.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
  const endsAtValue = new Date(interview.endsAt.getTime() - interview.endsAt.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  const calendarTitle = `${interview.title} - ${interview.application.candidate.fullName}`;
  const calendarDescription = [
    `Vaga: ${interview.application.job.title}`,
    `Candidato: ${interview.application.candidate.fullName}`,
    interview.notes ? `Notas: ${interview.notes}` : null,
    interview.meetingUrl ? `Link: ${interview.meetingUrl}` : null
  ]
    .filter((value): value is string => Boolean(value))
    .join("\n");
  const calendarLocation = interview.location || interview.meetingUrl || undefined;
  const googleCalendarUrl = buildGoogleCalendarUrl({
    title: calendarTitle,
    description: calendarDescription,
    location: calendarLocation,
    startsAt: interview.startsAt,
    endsAt: interview.endsAt
  });
  const outlookCalendarUrl = buildOutlookCalendarUrl({
    title: calendarTitle,
    description: calendarDescription,
    location: calendarLocation,
    startsAt: interview.startsAt,
    endsAt: interview.endsAt
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Interview"
        title={interview.title}
        description={`${interview.application.candidate.fullName} para ${interview.application.job.title}`}
        actions={
          <>
            <Badge variant={getStatusVariant(interview.status)}>{interview.status}</Badge>
            <Badge variant="outline">{interview.application.currentStage?.name || "Sem etapa"}</Badge>
            <Button asChild variant="outline">
              <Link href={`/api/interviews/${interview.id}/ics`}>Baixar .ics</Link>
            </Button>
          </>
        }
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-6">
          <Card className="panel-hover">
            <CardHeader>
              <CardTitle>Contexto da entrevista</CardTitle>
              <CardDescription>Informacoes operacionais, agenda e contexto da aplicacao.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.25rem] border border-border/70 bg-white/75 p-5">
                <div className="flex items-start gap-3">
                  <CalendarDays className="mt-1 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-semibold">Quando</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeStyle: "short" }).format(interview.startsAt)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      ate {new Intl.DateTimeFormat("pt-BR", { timeStyle: "short" }).format(interview.endsAt)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-[1.25rem] border border-border/70 bg-white/75 p-5">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-1 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-semibold">Local ou link</p>
                    <p className="mt-2 text-sm text-muted-foreground">{interview.location || "Sem local fisico definido"}</p>
                    {interview.meetingUrl ? (
                      <a
                        href={interview.meetingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-primary"
                      >
                        Abrir link da reuniao
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="rounded-[1.25rem] border border-border/70 bg-white/75 p-5">
                <div className="flex items-start gap-3">
                  <UserRound className="mt-1 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-semibold">Candidato</p>
                    <p className="mt-2 text-sm">{interview.application.candidate.fullName}</p>
                    <p className="text-sm text-muted-foreground">{interview.application.candidate.email || "Sem email cadastrado"}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-[1.25rem] border border-border/70 bg-white/75 p-5">
                <p className="font-semibold">Entrevistador responsavel</p>
                <p className="mt-2 text-sm">{interview.scheduledBy.name}</p>
                <p className="text-sm text-muted-foreground">{getRoleLabel(interview.scheduledBy.role)}</p>
              </div>
              <div className="rounded-[1.25rem] border border-border/70 bg-white/75 p-5 md:col-span-2">
                <p className="font-semibold">Notas do agendamento</p>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">
                  {interview.notes || "Sem notas adicionais."}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="panel-hover">
            <CardHeader>
              <CardTitle>Feedback estruturado</CardTitle>
              <CardDescription>Scorecard da entrevista com recomendacao e evidencias.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {canSubmitFeedback ? (
                <InterviewFeedbackForm
                  action={saveInterviewFeedback.bind(null, interview.id)}
                  scorecardItems={scorecardItems}
                  defaultValues={
                    existingFeedback
                      ? {
                          overallScore: existingFeedback.overallScore,
                          communicationScore: existingFeedback.communicationScore,
                          roleFitScore: existingFeedback.roleFitScore,
                          technicalScore: existingFeedback.technicalScore,
                          recommendation: existingFeedback.recommendation,
                          strengths: existingFeedback.strengths,
                          concerns: existingFeedback.concerns,
                          notes: existingFeedback.notes,
                          scorecardRatings: Array.isArray(existingFeedback.scorecardRatings)
                            ? existingFeedback.scorecardRatings
                                .filter(
                                  (item): item is { scorecardItemId: string; score: number } =>
                                    !!item &&
                                    typeof item === "object" &&
                                    typeof (item as { scorecardItemId?: unknown }).scorecardItemId === "string" &&
                                    typeof (item as { score?: unknown }).score === "number"
                                )
                            : []
                        }
                      : undefined
                  }
                />
              ) : (
                <div className="rounded-[1.35rem] border border-dashed border-border bg-white/75 p-6 text-sm text-muted-foreground">
                  Seu papel atual pode visualizar a entrevista, mas nao pode registrar feedback estruturado.
                </div>
              )}

              <div className="space-y-4">
                {interview.feedbacks.length ? (
                  interview.feedbacks.map((feedback) => {
                    const scorecardRatings = Array.isArray(feedback.scorecardRatings) ? feedback.scorecardRatings : [];

                    return (
                      <div key={feedback.id} className="rounded-[1.35rem] border border-border/70 bg-white/75 p-5">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <p className="font-semibold">{feedback.author.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {getRoleLabel(feedback.author.role)} - {feedback.recommendation}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant="outline">Geral {feedback.overallScore}/5</Badge>
                            <Badge variant="outline">Comunicacao {feedback.communicationScore}/5</Badge>
                            <Badge variant="outline">Role fit {feedback.roleFitScore}/5</Badge>
                            {feedback.technicalScore ? <Badge variant="outline">Tecnico {feedback.technicalScore}/5</Badge> : null}
                          </div>
                        </div>
                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                          <div className="rounded-[1.1rem] border border-border/70 bg-white p-4">
                            <p className="text-sm font-semibold">Pontos fortes</p>
                            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">{feedback.strengths}</p>
                          </div>
                          <div className="rounded-[1.1rem] border border-border/70 bg-white p-4">
                            <p className="text-sm font-semibold">Riscos</p>
                            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">{feedback.concerns || "Sem riscos destacados."}</p>
                          </div>
                        </div>
                        {scorecardItems.length && scorecardRatings.length ? (
                          <div className="mt-4 rounded-[1.1rem] border border-border/70 bg-white p-4">
                            <p className="text-sm font-semibold">Notas por eixo</p>
                            <div className="mt-3 grid gap-3 md:grid-cols-2">
                              {scorecardItems.map((item) => {
                                const rating = scorecardRatings.find((entry) => {
                                  if (
                                    !entry ||
                                    typeof entry !== "object" ||
                                    !("scorecardItemId" in entry) ||
                                    !("score" in entry)
                                  ) {
                                    return false;
                                  }

                                  return (
                                    typeof entry.scorecardItemId === "string" &&
                                    typeof entry.score === "number" &&
                                    entry.scorecardItemId === item.id
                                  );
                                }) as { scorecardItemId: string; score: number } | undefined;

                                return (
                                  <div key={item.id} className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3">
                                    <p className="text-sm font-medium">{item.label}</p>
                                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{item.category}</p>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                      Nota {rating ? rating.score : "-"} / 5
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : null}
                        {feedback.notes ? (
                          <div className="mt-4 rounded-[1.1rem] border border-border/70 bg-white p-4">
                            <p className="text-sm font-semibold">Notas adicionais</p>
                            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">{feedback.notes}</p>
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-[1.35rem] border border-dashed border-border bg-white/75 p-6 text-sm text-muted-foreground">
                    Ainda nao ha feedback salvo para esta entrevista.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="panel-hover">
            <CardHeader>
              <CardTitle>Acoes operacionais</CardTitle>
              <CardDescription>Feche o loop com candidato, calendario e status da entrevista.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Button asChild variant="outline" className="w-full">
                  <a href={googleCalendarUrl} target="_blank" rel="noreferrer">
                    Google Calendar
                  </a>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <a href={outlookCalendarUrl} target="_blank" rel="noreferrer">
                    Outlook Calendar
                  </a>
                </Button>
              </div>

              {canManageInterview ? (
                <>
                  <form action={sendInterviewInvite.bind(null, interview.id)}>
                    <Button type="submit" className="w-full" disabled={!interview.application.candidate.email || !smtpReady}>
                      <Mail className="mr-2 h-4 w-4" />
                      {smtpReady ? "Enviar convite por email" : "Configure SMTP para enviar"}
                    </Button>
                  </form>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <form action={updateInterviewStatus.bind(null, interview.id, InterviewStatus.COMPLETED)}>
                      <Button type="submit" variant="secondary" className="w-full">
                        Marcar como concluida
                      </Button>
                    </form>
                    <form action={updateInterviewStatus.bind(null, interview.id, InterviewStatus.CANCELLED)}>
                      <Button type="submit" variant="destructive" className="w-full">
                        Cancelar entrevista
                      </Button>
                    </form>
                  </div>
                </>
              ) : (
                <div className="rounded-[1.25rem] border border-dashed border-border bg-white/75 p-5 text-sm text-muted-foreground">
                  Somente recrutadores e administradores podem enviar convites ou alterar o status.
                </div>
              )}

              <Button asChild variant="outline" className="w-full">
                <Link href={`/applications/${interview.applicationId}`}>Abrir aplicacao</Link>
              </Button>
            </CardContent>
          </Card>

          {canManageInterview ? (
            <Card className="panel-hover">
              <CardHeader>
                <CardTitle>Reagendar entrevista</CardTitle>
                <CardDescription>Atualize horario, link ou notas e notifique o candidato se necessario.</CardDescription>
              </CardHeader>
              <CardContent>
                <InterviewRescheduleForm
                  action={rescheduleInterview.bind(null, interview.id)}
                  defaultValues={{
                    title: interview.title,
                    startsAt: startsAtValue,
                    endsAt: endsAtValue,
                    location: interview.location,
                    meetingUrl: interview.meetingUrl,
                    notes: interview.notes
                  }}
                />
              </CardContent>
            </Card>
          ) : null}
        </div>
      </section>
    </div>
  );
}
