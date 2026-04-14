import { InterviewStatus } from "@prisma/client";
import Link from "next/link";
import { CalendarDays, ExternalLink, Mail, MapPin, UserRound } from "lucide-react";
import { notFound } from "next/navigation";

import { InterviewFeedbackForm } from "@/components/interviews/interview-feedback-form";
import { InterviewRescheduleForm } from "@/components/interviews/interview-reschedule-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { hasPermission, requirePermission } from "@/lib/auth/permissions";
import { getRoleLabel } from "@/lib/auth/roles";
import { buildGoogleCalendarUrl, buildOutlookCalendarUrl } from "@/lib/calendar/providers";
import { isEmailConfigured } from "@/lib/email/transporter";
import { getInterviewById } from "@/lib/interviews/queries";

import styles from "@/components/operations/ops-workspace.module.css";
import { rescheduleInterview, saveInterviewFeedback, sendInterviewInvite, updateInterviewStatus } from "../actions";

function getStatusVariant(status: InterviewStatus) {
  if (status === InterviewStatus.COMPLETED) return "success" as const;
  if (status === InterviewStatus.CANCELLED) return "destructive" as const;
  return "outline" as const;
}

function formatStatusLabel(status: InterviewStatus) {
  if (status === InterviewStatus.SCHEDULED) return "Agendada";
  if (status === InterviewStatus.COMPLETED) return "Concluída";
  if (status === InterviewStatus.CANCELLED) return "Cancelada";
  return status;
}

function getStatusButtonVariant(currentStatus: InterviewStatus, nextStatus: InterviewStatus) {
  return currentStatus === nextStatus ? ("default" as const) : ("outline" as const);
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
  const durationMinutes = Math.max(0, Math.round((interview.endsAt.getTime() - interview.startsAt.getTime()) / 60000));

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

  const stats = [
    { label: "Duração", value: `${durationMinutes}m` },
    { label: "Feedbacks", value: interview.feedbacks.length },
    { label: "Scorecard", value: scorecardItems.length },
    { label: "Convite", value: smtpReady ? "Pronto" : "SMTP" }
  ];

  return (
    <div className={styles.workspace}>
      <div className={styles.header}>
        <span className={styles.eyebrow}>Interview</span>
        <h2 className={styles.title}>{interview.title}</h2>
        <p className={styles.description}>
          {interview.application.candidate.fullName} · {interview.application.job.title}
        </p>
      </div>

      <div className={styles.statRow}>
        {stats.map((stat) => (
          <div key={stat.label} className={styles.statPill}>
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </div>
        ))}
        <div className={styles.statPill}>
          <strong>{formatStatusLabel(interview.status)}</strong>
          <span>Status</span>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.detailColumn}>
          <section className={styles.detailPanel}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.panelTitle}>Base da entrevista</h3>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={getStatusVariant(interview.status)}>{formatStatusLabel(interview.status)}</Badge>
                <Badge variant="outline">{interview.application.currentStage?.name || "Sem etapa"}</Badge>
              </div>
            </div>

            <div className={styles.detailGrid}>
              <div className={styles.detailCell}>
                <span className={styles.metaLabel}>Quando</span>
                <span className={styles.metaValue}>
                  {new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeStyle: "short" }).format(interview.startsAt)}
                </span>
              </div>
              <div className={styles.detailCell}>
                <span className={styles.metaLabel}>Duração</span>
                <span className={styles.metaValue}>{durationMinutes} minutos</span>
              </div>
              <div className={styles.detailCell}>
                <span className={styles.metaLabel}>Candidato</span>
                <span className={styles.metaValue}>{interview.application.candidate.fullName}</span>
              </div>
              <div className={styles.detailCell}>
                <span className={styles.metaLabel}>Entrevistador</span>
                <span className={styles.metaValue}>{interview.scheduledBy.name}</span>
              </div>
            </div>

            <div className={styles.detailGrid}>
              <div className={styles.detailCell}>
                <span className={styles.metaLabel}>Local ou link</span>
                <p className={styles.detailText}>{interview.location || "Sem local físico definido."}</p>
                {interview.meetingUrl ? (
                  <a href={interview.meetingUrl} target="_blank" rel="noreferrer" className="text-sm text-foreground underline-offset-4 hover:underline">
                    Abrir reunião <ExternalLink className="ml-2 inline h-3.5 w-3.5" />
                  </a>
                ) : null}
              </div>
              <div className={styles.detailCell}>
                <span className={styles.metaLabel}>Owner</span>
                <p className={styles.detailText}>{getRoleLabel(interview.scheduledBy.role)}</p>
              </div>
            </div>

            <div className={styles.detailCell}>
              <span className={styles.metaLabel}>Notas do agendamento</span>
              <p className={styles.detailText}>{interview.notes || "Sem notas adicionais."}</p>
            </div>
          </section>

          <section className={styles.formPanel}>
            <div className={styles.panelHeader}>
              <h3 className={styles.panelTitle}>Feedback estruturado</h3>
              <p className={styles.panelDescription}>Scorecard, recomendação e evidências da conversa.</p>
            </div>

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
                          ? existingFeedback.scorecardRatings.filter(
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
              <p className={styles.emptyState}>Seu papel atual pode visualizar a entrevista, mas não registrar feedback estruturado.</p>
            )}

            {interview.feedbacks.length ? (
              <div className={styles.commentList}>
                {interview.feedbacks.map((feedback) => {
                  const scorecardRatings = Array.isArray(feedback.scorecardRatings) ? feedback.scorecardRatings : [];

                  return (
                    <div key={feedback.id} className={styles.commentItem}>
                      <div className={styles.sectionHeader}>
                        <span className={styles.commentAuthor}>{feedback.author.name}</span>
                        <Badge variant="outline">{feedback.recommendation}</Badge>
                      </div>
                      <p className={styles.commentBody}>
                        {getRoleLabel(feedback.author.role)} · Geral {feedback.overallScore}/5 · Comunicação {feedback.communicationScore}/5 ·
                        Role fit {feedback.roleFitScore}/5
                        {feedback.technicalScore ? ` · Técnico ${feedback.technicalScore}/5` : ""}
                      </p>
                      <p className={styles.commentBody}>Pontos fortes: {feedback.strengths}</p>
                      <p className={styles.commentBody}>Riscos: {feedback.concerns || "Sem riscos destacados."}</p>

                      {scorecardItems.length && scorecardRatings.length ? (
                        <div className={styles.detailGrid}>
                          {scorecardItems.map((item) => {
                            const rating = scorecardRatings.find((entry) => {
                              if (!entry || typeof entry !== "object" || !("scorecardItemId" in entry) || !("score" in entry)) {
                                return false;
                              }

                              return (
                                typeof entry.scorecardItemId === "string" &&
                                typeof entry.score === "number" &&
                                entry.scorecardItemId === item.id
                              );
                            }) as { scorecardItemId: string; score: number } | undefined;

                            return (
                              <div key={item.id} className={styles.detailCell}>
                                <span className={styles.metaLabel}>{item.label}</span>
                                <span className={styles.metaValue}>Nota {rating ? rating.score : "-"} / 5</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : null}

                      {feedback.notes ? <p className={styles.commentBody}>{feedback.notes}</p> : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className={styles.emptyState}>Ainda não há feedback salvo para esta entrevista.</p>
            )}
          </section>
        </div>

        <aside className={styles.detailColumn}>
          <section className={styles.formPanel}>
            <div className={styles.panelHeader}>
              <h3 className={styles.panelTitle}>Ações operacionais</h3>
              <p className={styles.panelDescription}>Calendário, convite e atualização de status em um lugar só.</p>
            </div>

            <div className={styles.sectionStack}>
              {canManageInterview ? (
                <div className={styles.detailCell}>
                  <div className={styles.sectionHeader}>
                    <span className={styles.metaValue}>Status</span>
                  </div>
                  <div className={styles.quickActions}>
                    {Object.values(InterviewStatus).map((status) => (
                      <form key={status} action={updateInterviewStatus.bind(null, interview.id, status)}>
                        <Button
                          type="submit"
                          size="sm"
                          variant={getStatusButtonVariant(interview.status, status)}
                          className={styles.quickActionButton}
                          disabled={interview.status === status}
                        >
                          {formatStatusLabel(status)}
                        </Button>
                      </form>
                    ))}
                  </div>
                </div>
              ) : null}

              {canManageInterview ? (
                <div className={styles.detailCell}>
                  <div className={styles.sectionHeader}>
                    <span className={styles.metaValue}>Contexto rápido</span>
                  </div>
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
                    compact
                  />
                </div>
              ) : null}

              <Button asChild variant="outline">
                <a href={googleCalendarUrl} target="_blank" rel="noreferrer">
                  Google Calendar
                </a>
              </Button>

              <Button asChild variant="outline">
                <a href={outlookCalendarUrl} target="_blank" rel="noreferrer">
                  Outlook Calendar
                </a>
              </Button>

              <Button asChild variant="outline">
                <Link href={`/api/interviews/${interview.id}/ics`}>Baixar .ics</Link>
              </Button>

              {canManageInterview ? (
                <>
                  <form action={sendInterviewInvite.bind(null, interview.id)}>
                    <Button type="submit" className="w-full" disabled={!interview.application.candidate.email || !smtpReady}>
                      <Mail className="mr-2 h-4 w-4" />
                      {smtpReady ? "Enviar convite por e-mail" : "Configure SMTP para enviar"}
                    </Button>
                  </form>

                </>
              ) : (
                <p className={styles.emptyState}>Seu papel atual não pode enviar convites nem alterar o status desta entrevista.</p>
              )}
            </div>
          </section>

          <section className={styles.detailPanel}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.panelTitle}>Aplicação vinculada</h3>
            </div>

            <Link href={`/applications/${interview.applicationId}`} className={styles.detailCell}>
              <div className={styles.sectionHeader}>
                <span className={styles.metaValue}>
                  <UserRound className="mr-2 inline h-4 w-4" />
                  {interview.application.job.title}
                </span>
                <Badge variant="outline">{interview.application.currentStage?.name || "Sem etapa"}</Badge>
              </div>
              <p className={styles.detailText}>{interview.application.candidate.fullName}</p>
            </Link>

            <div className={styles.detailCell}>
              <span className={styles.metaLabel}>Contexto rápido</span>
              <p className={styles.detailText}>{interview.application.job.department}</p>
              <p className={styles.detailText}>{interview.application.candidate.currentTitle || "Sem cargo atual informado."}</p>
            </div>

            <div className={styles.detailCell}>
              <span className={styles.metaLabel}>Agendado por</span>
              <p className={styles.detailText}>
                <CalendarDays className="mr-2 inline h-4 w-4" />
                {interview.scheduledBy.name}
              </p>
              <p className={styles.detailText}>
                <MapPin className="mr-2 inline h-4 w-4" />
                {interview.location || interview.meetingUrl || "Sem local definido"}
              </p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
