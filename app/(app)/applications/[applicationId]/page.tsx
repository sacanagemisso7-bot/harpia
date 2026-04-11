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
import { getStageCopilotDecision } from "@/lib/ai/stage-copilot";
import { hasPermission } from "@/lib/auth/permissions";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { getApplicationById } from "@/lib/applications/queries";
import { isEmailConfigured } from "@/lib/email/transporter";
import { getTemplateLabel } from "@/lib/email/templates";
import { getPipelineStages } from "@/lib/pipeline/queries";
import { formatScore } from "@/lib/utils";

import styles from "../../workspace-expansion.module.css";
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

function getRecommendationVariant(recommendation: string) {
  if (recommendation === "ADVANCE") return "success" as const;
  if (recommendation === "REJECT") return "destructive" as const;
  return "warning" as const;
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
    <div className={styles.page}>
      <PageHeader
        eyebrow="Application detail"
        title={`${application.candidate.fullName} x ${application.job.title}`}
        description={application.executiveSummary || "Aplicação pronta para triagem, score, pipeline e decisão."}
        actions={
          <>
            <Badge variant="success">{application.currentStage?.name || "Sem etapa"}</Badge>
            <Badge variant="outline">{formatScore(application.score)}</Badge>
          </>
        }
      />

      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Score</span>
          <strong className={styles.statValue}>{formatScore(application.score)}</strong>
          <span className={styles.statHint}>Leitura atual de aderência desta candidatura.</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Entrevistas</span>
          <strong className={styles.statValue}>{application.interviews.length}</strong>
          <span className={styles.statHint}>Encontros agendados ou concluidos no processo.</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Skills</span>
          <strong className={styles.statValue}>{skills.length}</strong>
          <span className={styles.statHint}>Sinais detectados a partir do currículo e do processo.</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Notas</span>
          <strong className={styles.statValue}>{application.notes.length}</strong>
          <span className={styles.statHint}>Contexto interno acumulado pelo time.</span>
        </div>
      </section>

      <section className={styles.detailLayout}>
        <div className={styles.column}>
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Assessment</span>
              <h2 className={styles.panelTitle}>Resumo da avaliação</h2>
            </div>
            <div className={styles.surfaceMuted}>
              <strong className={styles.itemTitle}>Justificativa do score</strong>
              <span className={styles.itemDescription}>
                {application.scoreJustification || "Score ainda sem justificativa registrada."}
              </span>
            </div>
            <div className={styles.subGrid2}>
              <div className={styles.surfaceMuted}>
                <strong className={styles.itemTitle}>Pontos fortes</strong>
                <div className={styles.list}>
                  {strengths.length ? strengths.map((item) => <span key={item} className={styles.itemDescription}>{item}</span>) : <span className={styles.itemDescription}>Sem highlights registrados.</span>}
                </div>
              </div>
              <div className={styles.surfaceMuted}>
                <strong className={styles.itemTitle}>Gaps observados</strong>
                <div className={styles.list}>
                  {gaps.length ? gaps.map((item) => <span key={item} className={styles.itemDescription}>{item}</span>) : <span className={styles.itemDescription}>Sem gaps registrados.</span>}
                </div>
              </div>
            </div>
            <div className={styles.surfaceMuted}>
              <strong className={styles.itemTitle}>Perguntas sugeridas</strong>
              <div className={styles.list}>
                {questions.length ? (
                  questions.map((question) => (
                    <div key={question} className={styles.rowBetween}>
                      <span className={styles.itemDescription}>{question}</span>
                      <Sparkles className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))
                ) : (
                  <span className={styles.itemDescription}>Sem perguntas registradas.</span>
                )}
              </div>
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Copilot</span>
              <h2 className={styles.panelTitle}>Decisão por etapa</h2>
              <p className={styles.panelDescription}>Leitura orientada para avancar, segurar ou encerrar nesta fase.</p>
            </div>
            <div className={styles.spotlight}>
              <span className={styles.panelEyebrow}>Recommendation</span>
              <strong className={styles.spotlightValue}>{copilotDecision.recommendation}</strong>
              <p className={styles.panelDescription}>{copilotDecision.summary}</p>
              <Badge variant={getRecommendationVariant(copilotDecision.recommendation)}>
                {application.currentStage?.name || "Sem etapa"}
              </Badge>
            </div>
            <div className={styles.subGrid2}>
              <div className={styles.surfaceMuted}>
                <strong className={styles.itemTitle}>Por que agora</strong>
                <div className={styles.list}>
                  {copilotDecision.reasons.length ? (
                    copilotDecision.reasons.map((reason) => <span key={reason} className={styles.itemDescription}>{reason}</span>)
                  ) : (
                    <span className={styles.itemDescription}>Sem justificativas adicionais.</span>
                  )}
                </div>
              </div>
              <div className={styles.surfaceMuted}>
                <strong className={styles.itemTitle}>Próximas ações</strong>
                <div className={styles.list}>
                  {copilotDecision.nextActions.length ? (
                    copilotDecision.nextActions.map((action) => <span key={action} className={styles.itemDescription}>{action}</span>)
                  ) : (
                    <span className={styles.itemDescription}>Sem próximas ações sugeridas.</span>
                  )}
                </div>
              </div>
            </div>
            {playbook ? (
              <div className={styles.surfaceMuted}>
                <strong className={styles.itemTitle}>{playbook.title}</strong>
                <span className={styles.itemDescription}>{playbook.department}</span>
              </div>
            ) : (
              <div className={styles.surfaceMuted}>
                Nenhum playbook do departamento encontrado. Cadastre um playbook em settings para guiar melhor essa decisão.
              </div>
            )}
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>History</span>
              <h2 className={styles.panelTitle}>Movimentação no pipeline</h2>
            </div>
            {application.history.length ? (
              <div className={styles.timeline}>
                {application.history.map((entry) => (
                  <div key={entry.id} className={styles.timelineItem}>
                    <span className={styles.timelineDot} />
                    <div className={styles.timelineBody}>
                      <div className={styles.itemHeader}>
                        <div className={styles.itemLead}>
                          <strong className={styles.itemTitle}>
                            {entry.fromStage?.name || "Inicio"} <ArrowRightLeft className="mx-2 inline h-4 w-4" /> {entry.toStage.name}
                          </strong>
                          <span className={styles.itemSubtitle}>{entry.movedBy?.name || "Sistema"}</span>
                        </div>
                        <span className={styles.tinyLabel}>{new Intl.DateTimeFormat("pt-BR").format(entry.createdAt)}</span>
                      </div>
                      <span className={styles.itemDescription}>{entry.notes || "Sem notas adicionais."}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>Sem histórico de etapa registrado ainda.</div>
            )}
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Notes</span>
              <h2 className={styles.panelTitle}>Contexto interno</h2>
            </div>
            <div className={styles.column}>
              {canCreateNotes ? (
                <div className={styles.surfaceMuted}>
                  <NoteForm title="Nova nota da aplicação" action={createApplicationNote.bind(null, application.id)} />
                </div>
              ) : null}
              <NoteFeed notes={application.notes} emptyMessage="Ainda não ha notas internas nesta aplicação." />
            </div>
          </div>
        </div>

        <aside className={styles.stickyAside}>
          <div className={styles.spotlight}>
            <span className={styles.panelEyebrow}>Current score</span>
            <strong className={styles.spotlightValue}>{formatScore(application.score)}</strong>
            <p className={styles.panelDescription}>Fit score atual desta aplicação dentro da vaga.</p>
          </div>

          <div className={styles.panel}>
            <div className={styles.itemHeader}>
              <div className={styles.itemLead}>
                <span className={styles.panelEyebrow}>Controls</span>
                <h3 className={styles.panelTitle}>Mover e recalcular</h3>
              </div>
              <span className={styles.iconLead}>
                <CircleGauge className="h-4 w-4" />
              </span>
            </div>
            {canManageApplication ? (
              <div className={styles.actionCluster}>
                <div className={styles.surfaceMuted}>
                  <ApplicationStageForm
                    stages={stages}
                    currentStageId={application.currentStageId}
                    action={moveApplicationStage.bind(null, application.id)}
                  />
                </div>
                <div className={styles.surfaceMuted}>
                  <RecalculateScoreForm action={recalculateApplicationScore.bind(null, application.id)} />
                </div>
              </div>
            ) : (
              <div className={styles.surfaceMuted}>
                Somente recrutadores e administradores podem mover etapa ou recalcular score.
              </div>
            )}
          </div>

          <div className={styles.panel}>
            <div className={styles.itemHeader}>
              <div className={styles.itemLead}>
                <span className={styles.panelEyebrow}>Interviews</span>
                <h3 className={styles.panelTitle}>Agenda e feedback</h3>
              </div>
              <span className={styles.iconLead}>
                <CalendarClock className="h-4 w-4" />
              </span>
            </div>
            {canManageInterviews ? (
              <div className={styles.surfaceMuted}>
                <InterviewForm action={createInterview.bind(null, application.id)} />
              </div>
            ) : (
              <div className={styles.surfaceMuted}>
                Somente recrutadores e administradores podem agendar entrevistas.
              </div>
            )}
            {application.interviews.length ? (
              <div className={styles.linkList}>
                {application.interviews.map((interview) => (
                  <Link key={interview.id} href={`/interviews/${interview.id}`} className={styles.linkItem}>
                    <strong>{interview.title}</strong>
                    <span>
                      {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(interview.startsAt)}
                    </span>
                    <span>{interview.location || interview.meetingUrl || "Sem local ou link"}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className={styles.surfaceMuted}>Nenhuma entrevista agendada ainda.</div>
            )}
          </div>

          <div className={styles.panel}>
            <div className={styles.itemHeader}>
              <div className={styles.itemLead}>
                <span className={styles.panelEyebrow}>Context</span>
                <h3 className={styles.panelTitle}>Candidato e vaga</h3>
              </div>
              <span className={styles.iconLead}>
                <UserRound className="h-4 w-4" />
              </span>
            </div>
            <div className={styles.linkList}>
              <Link href={`/candidates/${application.candidateId}`} className={styles.linkItem}>
                <strong>{application.candidate.fullName}</strong>
                <span>{application.candidate.currentTitle || "Sem cargo atual"}</span>
              </Link>
              <Link href={`/jobs/${application.jobId}`} className={styles.linkItem}>
                <strong>{application.job.title}</strong>
                <span>{application.job.department}</span>
              </Link>
            </div>
            <div className={styles.surfaceMuted}>
              <strong className={styles.itemTitle}>Skills detectadas</strong>
              <div className={styles.tagWrap}>
                {skills.length ? skills.map((skill) => <span key={skill} className={styles.tagPill}>{skill}</span>) : <span className={styles.itemDescription}>Sem skills estruturadas.</span>}
              </div>
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.itemHeader}>
              <div className={styles.itemLead}>
                <span className={styles.panelEyebrow}>Communication</span>
                <h3 className={styles.panelTitle}>Email com candidato</h3>
              </div>
              <span className={styles.iconLead}>
                <BriefcaseBusiness className="h-4 w-4" />
              </span>
            </div>
            {application.candidate.email && canManageCommunications ? (
              <div className={styles.actionCluster}>
                <div className={styles.surfaceMuted}>
                  Destinatario: <strong>{application.candidate.email}</strong> {smtpReady ? "" : "- configure SMTP para envio."}
                </div>
                {[EmailTemplateType.APPLICATION_RECEIVED, EmailTemplateType.STAGE_ADVANCED, EmailTemplateType.REJECTION].map(
                  (templateType) => (
                    <div key={templateType} className={styles.surfaceMuted}>
                      <SendTemplateEmailForm
                        action={sendApplicationEmail.bind(null, application.id)}
                        templateType={templateType}
                        label={getTemplateLabel(templateType)}
                      />
                    </div>
                  )
                )}
              </div>
            ) : application.candidate.email ? (
              <div className={styles.surfaceMuted}>Somente recrutadores e administradores podem enviar comunicacoes.</div>
            ) : (
              <div className={styles.surfaceMuted}>Cadastre um email no perfil do candidato para enviar comunicacoes.</div>
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}
