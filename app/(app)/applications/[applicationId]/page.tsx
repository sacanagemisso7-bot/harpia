import { EmailTemplateType } from "@prisma/client";
import Link from "next/link";
import { ArrowRightLeft, BriefcaseBusiness, CalendarClock, CircleGauge, Sparkles, UserRound } from "lucide-react";
import { notFound } from "next/navigation";

import { AiNextStepCard } from "@/components/ai/ai-next-step-card";
import { AiResolvePanel } from "@/components/ai/ai-resolve-panel";
import { ApplicationStageForm } from "@/components/applications/application-stage-form";
import { RecalculateScoreForm } from "@/components/applications/recalculate-score-form";
import { SendTemplateEmailForm } from "@/components/communications/send-template-email-form";
import { InterviewForm } from "@/components/interviews/interview-form";
import { NoteFeed } from "@/components/notes/note-feed";
import { NoteForm } from "@/components/notes/note-form";
import { buildApplicationNextStep } from "@/lib/ai/next-step";
import { buildApplicationResolveAssist } from "@/lib/ai/resolve-assist";
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

import styles from "@/components/operations/ops-workspace.module.css";
import {
  createApplicationNote,
  moveApplicationStage,
  moveApplicationStageQuick,
  recalculateApplicationScore,
  resolveApplicationWithAiAction,
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

function formatTokenLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getStageButtonVariant(isCurrent: boolean) {
  return isCurrent ? ("default" as const) : ("outline" as const);
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

  const stats = [
    { label: "Score", value: formatScore(application.score) },
    { label: "Etapa", value: application.currentStage?.name || "Sem etapa" },
    { label: "Entrevistas", value: application.interviews.length },
    { label: "Notas", value: application.notes.length }
  ];
  const applicationResolveAssist = buildApplicationResolveAssist({
    candidateName: application.candidate.fullName,
    jobTitle: application.job.title,
    score: application.score,
    currentStageId: application.currentStageId,
    currentStageName: application.currentStage?.name ?? null,
    stages: stages.map((stage) => ({
      id: stage.id,
      name: stage.name,
      key: stage.key,
      isTerminal: stage.isTerminal,
      position: stage.position
    })),
    copilotDecision,
    interviewCount: application.interviews.length
  });
  const applicationNextStep = buildApplicationNextStep({
    recommendation: copilotDecision.recommendation,
    interviewCount: application.interviews.length,
    suggestedStageLabel: applicationResolveAssist.suggestedStageLabel,
    currentStageLabel: application.currentStage?.name ?? "Sem etapa"
  });

  return (
    <div className={styles.workspace}>
      <div className={styles.header}>
        <span className={styles.eyebrow}>Candidatura</span>
        <h2 className={styles.title}>{application.candidate.fullName}</h2>
        <p className={styles.description}>
          {application.job.title} · {application.job.department}
          {application.executiveSummary ? ` · ${application.executiveSummary}` : ""}
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

      <div className={styles.workflowGuide}>
        <span>
          <strong>1.</strong> Leia o resumo
        </span>
        <span>
          <strong>2.</strong> Confira sinais e riscos
        </span>
        <span>
          <strong>3.</strong> Mova ou resolva com IA
        </span>
      </div>

      <div className={styles.body}>
        <div className={styles.detailColumn}>
          <section className={styles.detailPanel}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.panelTitle}>Resumo da avaliação</h3>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{application.currentStage?.name || "Sem etapa"}</Badge>
                <Badge variant="success">{formatScore(application.score)}</Badge>
              </div>
            </div>

            <div className={styles.detailCell}>
              <span className={styles.metaLabel}>Justificativa do score</span>
              <p className={styles.detailText}>{application.scoreJustification || "Score ainda sem justificativa registrada."}</p>
            </div>

            <div className={styles.detailGrid}>
              <div className={styles.detailCell}>
                <span className={styles.metaLabel}>Pontos fortes</span>
                {strengths.length ? (
                  strengths.map((item) => <p key={item} className={styles.detailText}>{item}</p>)
                ) : (
                  <p className={styles.detailText}>Sem destaques registrados.</p>
                )}
              </div>

              <div className={styles.detailCell}>
                <span className={styles.metaLabel}>Gaps observados</span>
                {gaps.length ? (
                  gaps.map((item) => <p key={item} className={styles.detailText}>{item}</p>)
                ) : (
                  <p className={styles.detailText}>Sem gaps registrados.</p>
                )}
              </div>
            </div>

            <div className={styles.detailCell}>
              <span className={styles.metaLabel}>Perguntas sugeridas</span>
              {questions.length ? (
                questions.map((question) => (
                  <div key={question} className={styles.sectionHeader}>
                    <p className={styles.detailText}>{question}</p>
                    <Sparkles className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))
              ) : (
                <p className={styles.detailText}>Sem perguntas sugeridas no momento.</p>
              )}
            </div>
            {canManageApplication ? (
              <AiResolvePanel
                entityId={application.id}
                entityFieldName="applicationId"
                selectionFieldName="stageId"
                summary={applicationResolveAssist.summary}
                suggestedAction={applicationResolveAssist.suggestedAction}
                expectedImpact={applicationResolveAssist.expectedImpact}
                confidence={applicationResolveAssist.confidence}
                sources={applicationResolveAssist.sources}
                suggestedStatus={applicationResolveAssist.suggestedStageId}
                statusOptions={stages.map((stage) => ({
                  value: stage.id,
                  label: stage.name
                }))}
                draftNote={applicationResolveAssist.draftNote}
                action={resolveApplicationWithAiAction}
              />
            ) : null}
          </section>

          <section className={styles.detailPanel}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.panelTitle}>Leitura do copiloto</h3>
              <Badge variant={getRecommendationVariant(copilotDecision.recommendation)}>
                {formatTokenLabel(copilotDecision.recommendation)}
              </Badge>
            </div>

            <div className={styles.detailCell}>
              <span className={styles.metaLabel}>Resumo</span>
              <p className={styles.detailText}>{copilotDecision.summary}</p>
            </div>

            <div className={styles.detailGrid}>
              <div className={styles.detailCell}>
                <span className={styles.metaLabel}>Por que agora</span>
                {copilotDecision.reasons.length ? (
                  copilotDecision.reasons.map((reason) => <p key={reason} className={styles.detailText}>{reason}</p>)
                ) : (
                  <p className={styles.detailText}>Sem justificativas adicionais.</p>
                )}
              </div>

              <div className={styles.detailCell}>
                <span className={styles.metaLabel}>Próximas ações</span>
                {copilotDecision.nextActions.length ? (
                  copilotDecision.nextActions.map((action) => <p key={action} className={styles.detailText}>{action}</p>)
                ) : (
                  <p className={styles.detailText}>Sem próximas ações sugeridas.</p>
                )}
              </div>
            </div>

            <div className={styles.detailCell}>
              <span className={styles.metaLabel}>Playbook</span>
              <p className={styles.detailText}>
                {playbook ? `${playbook.title} · ${playbook.department}` : "Nenhum playbook do departamento encontrado em Settings."}
              </p>
            </div>
          </section>

          <section className={styles.detailPanel}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.panelTitle}>Movimentação no pipeline</h3>
            </div>

            {application.history.length ? (
              <div className={styles.commentList}>
                {application.history.map((entry) => (
                  <div key={entry.id} className={styles.commentItem}>
                    <div className={styles.sectionHeader}>
                      <span className={styles.commentAuthor}>
                        {entry.fromStage?.name || "Início"} <ArrowRightLeft className="mx-2 inline h-4 w-4" /> {entry.toStage.name}
                      </span>
                      <span className={styles.metaLabel}>
                        {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(entry.createdAt)}
                      </span>
                    </div>
                    <p className={styles.commentBody}>{entry.movedBy?.name || "Sistema"}</p>
                    <p className={styles.commentBody}>{entry.notes || "Sem notas adicionais."}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.emptyState}>Sem histórico de etapa registrado ainda.</p>
            )}
          </section>

          <section id="application-notes" className={styles.formPanel}>
            <div className={styles.panelHeader}>
              <h3 className={styles.panelTitle}>Notas internas</h3>
              <p className={styles.panelDescription}>Contexto compartilhado do time sobre esta aplicação.</p>
            </div>

            {canCreateNotes ? (
              <NoteForm
                title="Registrar nota rápida"
                action={createApplicationNote.bind(null, application.id)}
                placeholder="Contexto objetivo para o time sobre esta aplicação."
                compact
              />
            ) : null}
            <NoteFeed notes={application.notes} emptyMessage="Ainda não há notas internas nesta aplicação." />
          </section>
        </div>

        <aside className={styles.detailColumn}>
          <AiNextStepCard
            recommendedStep={applicationNextStep.recommendedStep}
            reason={applicationNextStep.reason}
            tone={applicationNextStep.tone}
          >
            {(applicationNextStep.actionKey === "advance_stage" || applicationNextStep.actionKey === "reject") && canManageApplication ? (
              <form action={moveApplicationStageQuick.bind(null, application.id)}>
                <input type="hidden" name="stageId" value={applicationResolveAssist.suggestedStageId} />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!applicationResolveAssist.suggestedStageId || applicationResolveAssist.suggestedStageId === application.currentStageId}
                >
                  {applicationNextStep.actionLabel}
                </Button>
              </form>
            ) : applicationNextStep.actionKey === "schedule_interview" ? (
              <Button asChild size="sm" variant="outline">
                <a href="#application-interviews">{applicationNextStep.actionLabel}</a>
              </Button>
            ) : applicationNextStep.actionKey === "review_score" ? (
              <Button asChild size="sm" variant="outline">
                <a href="#application-score">{applicationNextStep.actionLabel}</a>
              </Button>
            ) : (
              <Button asChild size="sm" variant="outline">
                <a href="#application-notes">
                  {applicationNextStep.actionKey === "advance_stage" || applicationNextStep.actionKey === "reject"
                    ? "Registrar nota"
                    : applicationNextStep.actionLabel}
                </a>
              </Button>
            )}
          </AiNextStepCard>

          <section className={styles.formPanel}>
            <div className={styles.panelHeader}>
              <h3 className={styles.panelTitle}>Ações rápidas</h3>
              <p className={styles.panelDescription}>Atualize etapa, recalcule score ou agende a próxima interação.</p>
            </div>

            {canManageApplication ? (
              <div className={styles.sectionStack}>
                <div id="application-score" className={styles.detailCell}>
                  <div className={styles.sectionHeader}>
                    <span className={styles.metaValue}>
                      <CircleGauge className="mr-2 inline h-4 w-4" />
                      Etapa
                    </span>
                  </div>
                  <div className={styles.sectionStack}>
                    <div className={styles.quickActions}>
                      {stages.map((stage) => (
                        <form key={stage.id} action={moveApplicationStageQuick.bind(null, application.id)}>
                          <input type="hidden" name="stageId" value={stage.id} />
                          <Button
                            type="submit"
                            size="sm"
                            variant={getStageButtonVariant(stage.id === application.currentStageId)}
                            className={styles.quickActionButton}
                            disabled={stage.id === application.currentStageId}
                          >
                            {stage.name}
                          </Button>
                        </form>
                      ))}
                    </div>

                    <div className={styles.detailCell}>
                      <span className={styles.metaLabel}>Mover para qualquer etapa</span>
                      <ApplicationStageForm
                        stages={stages}
                        currentStageId={application.currentStageId}
                        action={moveApplicationStage.bind(null, application.id)}
                        compact
                      />
                    </div>
                  </div>
                </div>

                <div className={styles.detailCell}>
                  <div className={styles.sectionHeader}>
                    <span className={styles.metaValue}>Score</span>
                  </div>
                  <RecalculateScoreForm action={recalculateApplicationScore.bind(null, application.id)} />
                </div>
              </div>
            ) : (
              <p className={styles.emptyState}>Seu papel pode visualizar a aplicação, mas não alterar etapa nem score.</p>
            )}
          </section>

          <section id="application-interviews" className={styles.formPanel}>
            <div className={styles.panelHeader}>
              <h3 className={styles.panelTitle}>Entrevistas</h3>
              <p className={styles.panelDescription}>Agende novas conversas e acompanhe as já abertas.</p>
            </div>

            {canManageInterviews ? <InterviewForm action={createInterview.bind(null, application.id)} compact /> : null}

            {application.interviews.length ? (
              <div className={styles.sectionStack}>
                {application.interviews.map((interview) => (
                  <Link key={interview.id} href={`/interviews/${interview.id}`} className={styles.detailCell}>
                    <div className={styles.sectionHeader}>
                      <span className={styles.metaValue}>
                        <CalendarClock className="mr-2 inline h-4 w-4" />
                        {interview.title}
                      </span>
                    </div>
                    <p className={styles.detailText}>
                      {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(interview.startsAt)}
                    </p>
                    <p className={styles.detailText}>{interview.location || interview.meetingUrl || "Sem local ou link definido."}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className={styles.emptyState}>Nenhuma entrevista agendada ainda.</p>
            )}
          </section>

          <section className={styles.detailPanel}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.panelTitle}>Contexto do candidato</h3>
            </div>

            <Link href={`/candidates/${application.candidateId}`} className={styles.detailCell}>
              <div className={styles.sectionHeader}>
                <span className={styles.metaValue}>
                  <UserRound className="mr-2 inline h-4 w-4" />
                  {application.candidate.fullName}
                </span>
              </div>
              <p className={styles.detailText}>{application.candidate.currentTitle || "Sem cargo atual informado."}</p>
            </Link>

            <Link href={`/jobs/${application.jobId}`} className={styles.detailCell}>
              <div className={styles.sectionHeader}>
                <span className={styles.metaValue}>
                  <BriefcaseBusiness className="mr-2 inline h-4 w-4" />
                  {application.job.title}
                </span>
              </div>
              <p className={styles.detailText}>{application.job.department}</p>
            </Link>

            <div className={styles.detailCell}>
              <span className={styles.metaLabel}>Skills detectadas</span>
              <div className="flex flex-wrap gap-2">
                {skills.length ? (
                  skills.map((skill) => (
                    <Badge key={skill} variant="outline">
                      {skill}
                    </Badge>
                  ))
                ) : (
                  <p className={styles.detailText}>Sem skills estruturadas.</p>
                )}
              </div>
            </div>
          </section>

          <section className={styles.formPanel}>
            <div className={styles.panelHeader}>
              <h3 className={styles.panelTitle}>Comunicação</h3>
              <p className={styles.panelDescription}>Dispare templates sem sair da aplicação.</p>
            </div>

            {application.candidate.email && canManageCommunications ? (
              <div className={styles.sectionStack}>
                <div className={styles.detailCell}>
                  <span className={styles.metaLabel}>Destinatário</span>
                  <p className={styles.detailText}>
                    {application.candidate.email}
                    {!smtpReady ? " · Configure SMTP para envio." : ""}
                  </p>
                </div>
                {[EmailTemplateType.APPLICATION_RECEIVED, EmailTemplateType.STAGE_ADVANCED, EmailTemplateType.REJECTION].map(
                  (templateType) => (
                    <div key={templateType} className={styles.detailCell}>
                      <SendTemplateEmailForm
                        action={sendApplicationEmail.bind(null, application.id)}
                        templateType={templateType}
                        label={getTemplateLabel(templateType)}
                      />
                    </div>
                  )
                )}
              </div>
            ) : (
              <p className={styles.emptyState}>
                {application.candidate.email
                  ? "Seu papel atual não pode enviar comunicações."
                  : "Cadastre um e-mail no perfil do candidato para usar os templates."}
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
