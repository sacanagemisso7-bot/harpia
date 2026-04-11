import { InterviewStatus } from "@prisma/client";
import Link from "next/link";
import { CalendarDays, ExternalLink, Mail, MapPin, UserRound } from "lucide-react";
import { notFound } from "next/navigation";

import { InterviewFeedbackForm } from "@/components/interviews/interview-feedback-form";
import { InterviewRescheduleForm } from "@/components/interviews/interview-reschedule-form";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { hasPermission, requirePermission } from "@/lib/auth/permissions";
import { getRoleLabel } from "@/lib/auth/roles";
import { buildGoogleCalendarUrl, buildOutlookCalendarUrl } from "@/lib/calendar/providers";
import { isEmailConfigured } from "@/lib/email/transporter";
import { getInterviewById } from "@/lib/interviews/queries";

import styles from "../../workspace-expansion.module.css";
import { rescheduleInterview, saveInterviewFeedback, sendInterviewInvite, updateInterviewStatus } from "../actions";

function getStatusVariant(status: InterviewStatus) {
  if (status === InterviewStatus.COMPLETED) return "success" as const;
  if (status === InterviewStatus.CANCELLED) return "destructive" as const;
  return "outline" as const;
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

  return (
    <div className={styles.page}>
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

      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Duracao</span>
          <strong className={styles.statValue}>{durationMinutes}m</strong>
          <span className={styles.statHint}>Tempo reservado para esta entrevista.</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Feedbacks</span>
          <strong className={styles.statValue}>{interview.feedbacks.length}</strong>
          <span className={styles.statHint}>Entradas estruturadas ja salvas nesta sess?o.</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Scorecard</span>
          <strong className={styles.statValue}>{scorecardItems.length}</strong>
          <span className={styles.statHint}>Eixos de avaliação puxados da vaga.</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Invite</span>
          <strong className={styles.statValue}>{smtpReady ? "Ready" : "SMTP"}</strong>
          <span className={styles.statHint}>Envio de convite por email depende do SMTP configurado.</span>
        </div>
      </section>

      <section className={styles.detailLayout}>
        <div className={styles.column}>
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Context</span>
              <h2 className={styles.panelTitle}>Base da entrevista</h2>
            </div>
            <div className={styles.infoGrid}>
              <div className={styles.infoTile}>
                <strong>Quando</strong>
                <span>
                  {new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeStyle: "short" }).format(interview.startsAt)}
                </span>
              </div>
              <div className={styles.infoTile}>
                <strong>Duracao</strong>
                <span>{durationMinutes} minutos</span>
              </div>
              <div className={styles.infoTile}>
                <strong>Candidato</strong>
                <span>{interview.application.candidate.fullName}</span>
              </div>
              <div className={styles.infoTile}>
                <strong>Entrevistador</strong>
                <span>{interview.scheduledBy.name}</span>
              </div>
            </div>

            <div className={styles.subGrid2}>
              <div className={styles.surfaceMuted}>
                <strong className={styles.itemTitle}>Local ou link</strong>
                <span className={styles.itemDescription}>{interview.location || "Sem local fisico definido"}</span>
                {interview.meetingUrl ? (
                  <a href={interview.meetingUrl} target="_blank" rel="noreferrer" className={styles.inlineLink}>
                    Abrir reuniao <ExternalLink className="ml-2 inline h-3.5 w-3.5" />
                  </a>
                ) : null}
              </div>
              <div className={styles.surfaceMuted}>
                <strong className={styles.itemTitle}>Owner</strong>
                <span className={styles.itemDescription}>{getRoleLabel(interview.scheduledBy.role)}</span>
              </div>
            </div>

            <div className={styles.surfaceMuted}>
              <strong className={styles.itemTitle}>Notas do agendamento</strong>
              <span className={styles.itemDescription}>{interview.notes || "Sem notas adicionais."}</span>
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Feedback</span>
              <h2 className={styles.panelTitle}>Avaliação estruturada</h2>
              <p className={styles.panelDescription}>Scorecard, recomendacao e evidencias desta entrevista.</p>
            </div>

            {canSubmitFeedback ? (
              <div className={styles.surfaceMuted}>
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
              </div>
            ) : (
              <div className={styles.surfaceMuted}>
                Seu papel atual pode visualizar a entrevista, mas não pode registrar feedback estruturado.
              </div>
            )}

            {interview.feedbacks.length ? (
              <div className={styles.list}>
                {interview.feedbacks.map((feedback) => {
                  const scorecardRatings = Array.isArray(feedback.scorecardRatings) ? feedback.scorecardRatings : [];

                  return (
                    <div key={feedback.id} className={styles.listItem}>
                      <div className={styles.itemHeader}>
                        <div className={styles.itemLead}>
                          <strong className={styles.itemTitle}>{feedback.author.name}</strong>
                          <span className={styles.itemSubtitle}>
                            {getRoleLabel(feedback.author.role)} - {feedback.recommendation}
                          </span>
                        </div>
                        <div className={styles.tagWrap}>
                          <span className={styles.tagPill}>Geral {feedback.overallScore}/5</span>
                          <span className={styles.tagPill}>Comunicação {feedback.communicationScore}/5</span>
                          <span className={styles.tagPill}>Role fit {feedback.roleFitScore}/5</span>
                          {feedback.technicalScore ? <span className={styles.tagPill}>Técnico {feedback.technicalScore}/5</span> : null}
                        </div>
                      </div>

                      <div className={styles.subGrid2}>
                        <div className={styles.surfaceMuted}>
                          <strong className={styles.itemTitle}>Pontos fortes</strong>
                          <span className={styles.itemDescription}>{feedback.strengths}</span>
                        </div>
                        <div className={styles.surfaceMuted}>
                          <strong className={styles.itemTitle}>Riscos</strong>
                          <span className={styles.itemDescription}>{feedback.concerns || "Sem riscos destacados."}</span>
                        </div>
                      </div>

                      {scorecardItems.length && scorecardRatings.length ? (
                        <div className={styles.infoGrid}>
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
                              <div key={item.id} className={styles.infoTile}>
                                <strong>{item.label}</strong>
                                <span>
                                  {item.category} - nota {rating ? rating.score : "-"} / 5
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : null}

                      {feedback.notes ? (
                        <div className={styles.surfaceMuted}>
                          <strong className={styles.itemTitle}>Notas adicionais</strong>
                          <span className={styles.itemDescription}>{feedback.notes}</span>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={styles.emptyState}>Ainda não ha feedback salvo para esta entrevista.</div>
            )}
          </div>
        </div>

        <aside className={styles.stickyAside}>
          <div className={styles.spotlight}>
            <span className={styles.panelEyebrow}>Interview status</span>
            <strong className={styles.spotlightValue}>{interview.status}</strong>
            <p className={styles.panelDescription}>Estado atual desta sess?o dentro do fluxo da vaga.</p>
          </div>

          <div className={styles.panel}>
            <div className={styles.itemHeader}>
              <div className={styles.itemLead}>
                <span className={styles.panelEyebrow}>Calendar</span>
                <h3 className={styles.panelTitle}>Ações operacionais</h3>
              </div>
              <span className={styles.iconLead}>
                <CalendarDays className="h-4 w-4" />
              </span>
            </div>
            <div className={styles.actionCluster}>
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

              {canManageInterview ? (
                <>
                  <form action={sendInterviewInvite.bind(null, interview.id)}>
                    <Button type="submit" className="w-full" disabled={!interview.application.candidate.email || !smtpReady}>
                      <Mail className="mr-2 h-4 w-4" />
                      {smtpReady ? "Enviar convite por email" : "Configure SMTP para enviar"}
                    </Button>
                  </form>
                  <div className={styles.subGrid2}>
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
                <div className={styles.surfaceMuted}>
                  Somente recrutadores e administradores podem enviar convites ou alterar o status.
                </div>
              )}

              <Button asChild variant="outline" className="w-full">
                <Link href={`/applications/${interview.applicationId}`}>Abrir aplicação</Link>
              </Button>
            </div>
          </div>

          {canManageInterview ? (
            <div className={styles.panel}>
              <div className={styles.itemHeader}>
                <div className={styles.itemLead}>
                  <span className={styles.panelEyebrow}>Reschedule</span>
                  <h3 className={styles.panelTitle}>Atualizar horario</h3>
                </div>
                <span className={styles.iconLead}>
                  <MapPin className="h-4 w-4" />
                </span>
              </div>
              <div className={styles.surfaceMuted}>
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
              </div>
            </div>
          ) : null}

          <div className={styles.panel}>
            <div className={styles.itemHeader}>
              <div className={styles.itemLead}>
                <span className={styles.panelEyebrow}>Context</span>
                <h3 className={styles.panelTitle}>Aplicação vinculada</h3>
              </div>
              <span className={styles.iconLead}>
                <UserRound className="h-4 w-4" />
              </span>
            </div>
            <div className={styles.linkList}>
              <Link href={`/applications/${interview.applicationId}`} className={styles.linkItem}>
                <strong>{interview.application.job.title}</strong>
                <span>{interview.application.currentStage?.name || "Sem etapa"}</span>
                <span>{interview.application.candidate.fullName}</span>
              </Link>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
