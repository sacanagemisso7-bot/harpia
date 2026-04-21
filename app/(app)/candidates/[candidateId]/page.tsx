import Link from "next/link";
import { FileText, Linkedin, MapPin, Sparkles } from "lucide-react";
import { notFound } from "next/navigation";

import { AnalyzeResumeForm } from "@/components/candidates/analyze-resume-form";
import { ApplyToJobForm } from "@/components/candidates/apply-to-job-form";
import { ResumeUploadForm } from "@/components/candidates/resume-upload-form";
import { AiNextStepCard } from "@/components/ai/ai-next-step-card";
import { NoteFeed } from "@/components/notes/note-feed";
import { NoteForm } from "@/components/notes/note-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buildCandidateNextStep } from "@/lib/ai/next-step";
import { hasPermission } from "@/lib/auth/permissions";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { getCandidateById } from "@/lib/candidates/queries";
import { getOpenJobsForCandidate } from "@/lib/jobs/queries";
import { formatScore } from "@/lib/utils";

import styles from "@/components/operations/ops-workspace.module.css";
import { createApplication } from "../../applications/actions";
import { analyzeCandidateResume, createCandidateNote, uploadResume } from "../actions";

function formatResumeSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function CandidateDetailPage({
  params
}: {
  params: Promise<{ candidateId: string }>;
}) {
  const { candidateId } = await params;
  const user = await requireCurrentUser();
  const [candidate, availableJobs] = await Promise.all([
    getCandidateById(candidateId, user.organizationId),
    getOpenJobsForCandidate(candidateId, user.organizationId)
  ]);

  if (!candidate) {
    notFound();
  }

  const parsedProfile =
    candidate.parsedProfile && typeof candidate.parsedProfile === "object"
      ? (candidate.parsedProfile as Record<string, unknown>)
      : null;

  const coreSkills =
    parsedProfile?.coreSkills && Array.isArray(parsedProfile.coreSkills)
      ? parsedProfile.coreSkills.filter((item): item is string => typeof item === "string")
      : [];
  const strengths =
    parsedProfile?.strengths && Array.isArray(parsedProfile.strengths)
      ? parsedProfile.strengths.filter((item): item is string => typeof item === "string")
      : [];
  const risks =
    parsedProfile?.risks && Array.isArray(parsedProfile.risks)
      ? parsedProfile.risks.filter((item): item is string => typeof item === "string")
      : [];
  const questions =
    parsedProfile?.suggestedInterviewQuestions && Array.isArray(parsedProfile.suggestedInterviewQuestions)
      ? parsedProfile.suggestedInterviewQuestions.filter((item): item is string => typeof item === "string")
      : [];

  const canManageCandidate = hasPermission(user.role, "manage_candidates");
  const canManageApplications = hasPermission(user.role, "manage_applications");
  const canCreateNotes = hasPermission(user.role, "create_hiring_notes");
  const candidateNextStep = buildCandidateNextStep({
    resumeCount: canManageCandidate ? candidate.resumes.length : Math.max(candidate.resumes.length, 1),
    hasParsedProfile: canManageCandidate ? Boolean(parsedProfile) : true,
    applicationCount: candidate.applications.length,
    availableJobCount: canManageApplications ? availableJobs.length : 0
  });

  return (
    <div className={styles.workspace}>
      <div className={styles.header}>
        <span className={styles.eyebrow}>Talentos</span>
        <h2 className={styles.title}>{candidate.fullName}</h2>
        <p className={styles.description}>
          {candidate.summary || "Perfil consolidado pronto para currículo, análise com IA e vínculo com vagas abertas."}
        </p>
      </div>

      <div className={styles.statRow}>
        <div className={styles.statPill}>
          <strong>{candidate.resumes.length}</strong>
          <span>currículo(s)</span>
        </div>
        <div className={styles.statPill}>
          <strong>{candidate.applications.length}</strong>
          <span>aplicação(ões)</span>
        </div>
        <div className={styles.statPill}>
          <strong>{coreSkills.length}</strong>
          <span>skills detectadas</span>
        </div>
        <div className={styles.statPill}>
          <strong>{availableJobs.length}</strong>
          <span>vagas abertas</span>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.toolbarMeta}>
          <div className={styles.tabs}>
            <Badge variant="outline">{candidate.source}</Badge>
            {candidate.yearsExperience ? <Badge variant="success">{candidate.yearsExperience} anos</Badge> : null}
            {candidate.highestEducation ? <Badge variant="outline">{candidate.highestEducation}</Badge> : null}
          </div>
          <span className={styles.shortcutHint}>O perfil, o currículo e a análise ficam no mesmo lugar para reduzir troca de contexto.</span>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.detailColumn}>
          <section className={styles.detailPanel}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.panelTitle}>Base do candidato</h3>
              <Button asChild variant="outline" size="sm">
                <Link href="/candidates">Voltar para candidatos</Link>
              </Button>
            </div>

            <div className={styles.detailGrid}>
              <div className={styles.detailCell}>
                <span className={styles.metaLabel}>E-mail</span>
                <span className={styles.metaValue}>{candidate.email || "Não informado"}</span>
              </div>
              <div className={styles.detailCell}>
                <span className={styles.metaLabel}>Telefone</span>
                <span className={styles.metaValue}>{candidate.phone || "Não informado"}</span>
              </div>
              <div className={styles.detailCell}>
                <span className={styles.metaLabel}>Cargo atual</span>
                <span className={styles.metaValue}>{candidate.currentTitle || "Não informado"}</span>
              </div>
              <div className={styles.detailCell}>
                <span className={styles.metaLabel}>Empresa atual</span>
                <span className={styles.metaValue}>{candidate.currentCompany || "Não informada"}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {candidate.location ? (
                <Badge variant="outline">
                  <MapPin className="mr-2 h-3.5 w-3.5" />
                  {candidate.location}
                </Badge>
              ) : null}
              {candidate.linkedinUrl ? (
                <a href={candidate.linkedinUrl} target="_blank" rel="noreferrer">
                  <Badge variant="outline">
                    <Linkedin className="mr-2 h-3.5 w-3.5" />
                    LinkedIn
                  </Badge>
                </a>
              ) : null}
              {candidate.portfolioUrl ? (
                <a href={candidate.portfolioUrl} target="_blank" rel="noreferrer">
                  <Badge variant="outline">Portfólio</Badge>
                </a>
              ) : null}
            </div>
          </section>

          <section className={styles.listPanel}>
            <div className={styles.panelHeader}>
              <div className={styles.panelHeaderRow}>
                <div>
                  <h3 className={styles.panelTitle}>Currículos enviados</h3>
                  <p className={styles.panelDescription}>Arquivos salvos para parsing e reprocessamento.</p>
                </div>
              </div>
            </div>

            <div className={styles.list}>
              {candidate.resumes.length ? (
                candidate.resumes.map((resume) => (
                  <div key={resume.id} className={styles.row}>
                    <div className={styles.rowTop}>
                      <div className={styles.rowLead}>
                        <p className={styles.rowTitle}>{resume.fileName}</p>
                        <p className={styles.rowSubtitle}>
                          {formatResumeSize(resume.sizeBytes)} ·{" "}
                          {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(resume.uploadedAt)}
                        </p>
                      </div>
                      <Badge variant="outline">
                        <FileText className="mr-2 h-3.5 w-3.5" />
                        PDF
                      </Badge>
                    </div>
                    <p className={styles.rowSubtitle}>
                      {resume.extractedText ||
                        "Não foi possível extrair o texto deste PDF. O arquivo segue salvo para novo processamento."}
                    </p>
                  </div>
                ))
              ) : (
                <div className={styles.emptyWrap}>
                  <p className={styles.emptyState}>Nenhum currículo enviado ainda.</p>
                </div>
              )}
            </div>
          </section>

          <section className={styles.listPanel}>
            <div className={styles.panelHeader}>
              <div className={styles.panelHeaderRow}>
                <div>
                  <h3 className={styles.panelTitle}>Vagas em curso</h3>
                  <p className={styles.panelDescription}>Cada aplicação mostra etapa atual, score e resumo executivo.</p>
                </div>
              </div>
            </div>

            <div className={styles.list}>
              {candidate.applications.length ? (
                candidate.applications.map((application) => (
                  <Link key={application.id} href={`/applications/${application.id}`} className={styles.row}>
                    <div className={styles.rowTop}>
                      <div className={styles.rowLead}>
                        <p className={styles.rowTitle}>{application.job.title}</p>
                        <p className={styles.rowSubtitle}>{application.currentStage?.name || "Sem etapa"}</p>
                      </div>
                      <Badge variant="outline">{formatScore(application.score)}</Badge>
                    </div>
                    <p className={styles.rowSubtitle}>
                      {application.executiveSummary || "A análise de aderência está disponível no detalhe da aplicação."}
                    </p>
                  </Link>
                ))
              ) : (
                <div className={styles.emptyWrap}>
                  <p className={styles.emptyState}>Ainda não há aplicações para este candidato.</p>
                </div>
              )}
            </div>
          </section>

          <section id="candidate-note-compose" className={styles.formPanel}>
            <div className={styles.panelHeader}>
              <h3 className={styles.panelTitle}>Notas internas</h3>
              <p className={styles.panelDescription}>Contexto compartilhado do time sobre este perfil.</p>
            </div>

            {canCreateNotes ? <NoteForm title="Nova nota sobre o candidato" action={createCandidateNote.bind(null, candidate.id)} /> : null}
            <NoteFeed notes={candidate.notes} emptyMessage="Ainda não há notas internas para este candidato." />
          </section>
        </div>

        <aside className={styles.detailColumn}>
          <AiNextStepCard
            recommendedStep={candidateNextStep.recommendedStep}
            reason={candidateNextStep.reason}
            tone={candidateNextStep.tone}
          >
            {candidateNextStep.actionKey === "review_application" && candidate.applications[0] ? (
              <Button asChild size="sm">
                <Link href={`/applications/${candidate.applications[0].id}`}>{candidateNextStep.actionLabel}</Link>
              </Button>
            ) : candidateNextStep.actionKey === "apply_to_job" ? (
              <Button asChild size="sm" variant="outline">
                <a href="#candidate-apply-job">{candidateNextStep.actionLabel}</a>
              </Button>
            ) : candidateNextStep.actionKey === "analyze_resume" ? (
              <Button asChild size="sm" variant="outline">
                <a href="#candidate-analyze-ai">{candidateNextStep.actionLabel}</a>
              </Button>
            ) : candidateNextStep.actionKey === "upload_resume" ? (
              <Button asChild size="sm" variant="outline">
                <a href="#candidate-upload-resume">{candidateNextStep.actionLabel}</a>
              </Button>
            ) : (
              <Button asChild size="sm" variant="outline">
                <a href="#candidate-note-compose">{candidateNextStep.actionLabel}</a>
              </Button>
            )}
          </AiNextStepCard>

          <section className={styles.formPanel}>
            <div className={styles.panelHeader}>
              <h3 className={styles.panelTitle}>Ações rápidas</h3>
              <p className={styles.panelDescription}>Operações principais do perfil sem navegar para outro lugar.</p>
            </div>

            <div className={styles.sectionStack}>
              {canManageCandidate ? (
                <div id="candidate-upload-resume" className={styles.detailCell}>
                  <span className={styles.metaLabel}>Enviar currículo</span>
                  <ResumeUploadForm action={uploadResume.bind(null, candidate.id)} />
                </div>
              ) : (
                <p className={styles.emptyState}>Somente recrutadores e administradores podem enviar currículos.</p>
              )}

              {canManageApplications && availableJobs.length ? (
                <div id="candidate-apply-job" className={styles.detailCell}>
                  <span className={styles.metaLabel}>Aplicar em vaga</span>
                  <ApplyToJobForm action={createApplication.bind(null, candidate.id)} jobs={availableJobs} />
                </div>
              ) : canManageApplications ? (
                <p className={styles.emptyState}>Este candidato já foi vinculado a todas as vagas abertas disponíveis.</p>
              ) : (
                <p className={styles.emptyState}>Seu papel atual não pode criar novas aplicações.</p>
              )}

              {canManageCandidate ? (
                <div id="candidate-analyze-ai" className={styles.detailCell}>
                  <span className={styles.metaLabel}>Analisar com IA</span>
                  <AnalyzeResumeForm action={analyzeCandidateResume.bind(null, candidate.id)} />
                </div>
              ) : null}
            </div>
          </section>

          <section className={styles.detailPanel}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.panelTitle}>Leitura estruturada</h3>
              <Badge variant="outline">IA</Badge>
            </div>

            {parsedProfile ? (
              <div className={styles.sectionStack}>
                <div className={styles.detailCell}>
                  <span className={styles.metaLabel}>Resumo executivo</span>
                  <p className={styles.detailText}>{String(parsedProfile.executiveSummary ?? candidate.summary ?? "--")}</p>
                </div>

                <div className={styles.detailCell}>
                  <span className={styles.metaLabel}>Skills detectadas</span>
                  <div className="flex flex-wrap gap-2">
                    {coreSkills.length ? (
                      coreSkills.map((skill) => (
                        <Badge key={skill} variant="outline">
                          {skill}
                        </Badge>
                      ))
                    ) : (
                      <p className={styles.detailText}>Sem skills estruturadas ainda.</p>
                    )}
                  </div>
                </div>

                <div className={styles.detailCell}>
                  <span className={styles.metaLabel}>Pontos fortes</span>
                  {strengths.length ? (
                    strengths.map((item) => <p key={item} className={styles.detailText}>{item}</p>)
                  ) : (
                    <p className={styles.detailText}>Nenhum destaque estruturado ainda.</p>
                  )}
                </div>

                <div className={styles.detailCell}>
                  <span className={styles.metaLabel}>Gaps observados</span>
                  {risks.length ? (
                    risks.map((item) => <p key={item} className={styles.detailText}>{item}</p>)
                  ) : (
                    <p className={styles.detailText}>Nenhum gap estruturado ainda.</p>
                  )}
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
                    <p className={styles.detailText}>Rode a análise de IA para gerar perguntas guiadas.</p>
                  )}
                </div>
              </div>
            ) : (
              <p className={styles.emptyState}>Rode a análise de IA para gerar resumo, skills e perguntas sugeridas.</p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
