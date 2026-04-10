import Link from "next/link";
import { FileText, Linkedin, MapPin, Sparkles } from "lucide-react";
import { notFound } from "next/navigation";

import { AnalyzeResumeForm } from "@/components/candidates/analyze-resume-form";
import { ApplyToJobForm } from "@/components/candidates/apply-to-job-form";
import { ResumeUploadForm } from "@/components/candidates/resume-upload-form";
import { PageHeader } from "@/components/layout/page-header";
import { NoteFeed } from "@/components/notes/note-feed";
import { NoteForm } from "@/components/notes/note-form";
import { Badge } from "@/components/ui/badge";
import { hasPermission } from "@/lib/auth/permissions";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { getCandidateById } from "@/lib/candidates/queries";
import { getOpenJobsForCandidate } from "@/lib/jobs/queries";
import { formatScore } from "@/lib/utils";

import styles from "../../workspace-expansion.module.css";
import { analyzeCandidateResume, createCandidateNote, uploadResume } from "../actions";
import { createApplication } from "../../applications/actions";

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

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Candidate profile"
        title={candidate.fullName}
        description={
          candidate.summary ||
          "Perfil consolidado pronto para upload de curriculo, parsing com IA e vinculacao a vagas abertas."
        }
        actions={
          <>
            <Badge variant="outline">{candidate.source}</Badge>
            {candidate.yearsExperience ? <Badge variant="success">{candidate.yearsExperience} anos</Badge> : null}
            {candidate.highestEducation ? <Badge variant="outline">{candidate.highestEducation}</Badge> : null}
          </>
        }
      />

      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Curriculos</span>
          <strong className={styles.statValue}>{candidate.resumes.length}</strong>
          <span className={styles.statHint}>Arquivos salvos para parsing e reprocessamento.</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Aplicacoes</span>
          <strong className={styles.statValue}>{candidate.applications.length}</strong>
          <span className={styles.statHint}>Vagas nas quais o perfil ja esta em movimento.</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Skills</span>
          <strong className={styles.statValue}>{coreSkills.length}</strong>
          <span className={styles.statHint}>Sinais estruturados identificados pela IA.</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Open jobs</span>
          <strong className={styles.statValue}>{availableJobs.length}</strong>
          <span className={styles.statHint}>Vagas ainda disponiveis para vincular este perfil.</span>
        </div>
      </section>

      <section className={styles.detailLayout}>
        <div className={styles.column}>
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Profile</span>
              <h2 className={styles.panelTitle}>Base operacional do candidato</h2>
              <p className={styles.panelDescription}>Contato, contexto atual e sinais mais uteis para triagem.</p>
            </div>
            <div className={styles.infoGrid}>
              <div className={styles.infoTile}>
                <strong>Email</strong>
                <span>{candidate.email || "--"}</span>
              </div>
              <div className={styles.infoTile}>
                <strong>Telefone</strong>
                <span>{candidate.phone || "--"}</span>
              </div>
              <div className={styles.infoTile}>
                <strong>Cargo atual</strong>
                <span>{candidate.currentTitle || "--"}</span>
              </div>
              <div className={styles.infoTile}>
                <strong>Empresa atual</strong>
                <span>{candidate.currentCompany || "--"}</span>
              </div>
            </div>
            <div className={styles.tagWrap}>
              {candidate.location ? (
                <span className={styles.tagPill}>
                  <MapPin className="mr-2 h-3.5 w-3.5" />
                  {candidate.location}
                </span>
              ) : null}
              {candidate.linkedinUrl ? (
                <a href={candidate.linkedinUrl} target="_blank" rel="noreferrer" className={styles.tagPill}>
                  <Linkedin className="mr-2 h-3.5 w-3.5" />
                  LinkedIn
                </a>
              ) : null}
              {candidate.portfolioUrl ? (
                <a href={candidate.portfolioUrl} target="_blank" rel="noreferrer" className={styles.tagPill}>
                  Portfolio
                </a>
              ) : null}
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Resume ledger</span>
              <h2 className={styles.panelTitle}>Curriculos enviados</h2>
            </div>
            {candidate.resumes.length ? (
              <div className={styles.list}>
                {candidate.resumes.map((resume) => (
                  <div key={resume.id} className={styles.listItem}>
                    <div className={styles.itemHeader}>
                      <div className={styles.itemLead}>
                        <strong className={styles.itemTitle}>{resume.fileName}</strong>
                        <span className={styles.itemSubtitle}>
                          {formatResumeSize(resume.sizeBytes)} - {new Intl.DateTimeFormat("pt-BR").format(resume.uploadedAt)}
                        </span>
                      </div>
                      <span className={styles.iconLead}>
                        <FileText className="h-4 w-4" />
                      </span>
                    </div>
                    <p className={styles.richText}>
                      {resume.extractedText || "Nao foi possivel extrair o texto deste PDF. O arquivo continua salvo para reprocessamento."}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>Nenhum curriculo enviado ainda.</div>
            )}
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Applications</span>
              <h2 className={styles.panelTitle}>Vagas em curso</h2>
              <p className={styles.panelDescription}>Cada aplicacao mostra fit score, etapa e resumo executivo.</p>
            </div>
            {candidate.applications.length ? (
              <div className={styles.linkList}>
                {candidate.applications.map((application) => (
                  <Link key={application.id} href={`/applications/${application.id}`} className={styles.linkItem}>
                    <strong>{application.job.title}</strong>
                    <span>
                      {application.currentStage?.name || "Sem etapa"} - score {formatScore(application.score)}
                    </span>
                    <span>{application.executiveSummary || "Analise de aderencia disponivel no detalhe da aplicacao."}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>Ainda sem aplicacoes para este candidato.</div>
            )}
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Internal notes</span>
              <h2 className={styles.panelTitle}>Contexto compartilhado</h2>
            </div>
            <div className={styles.column}>
              {canCreateNotes ? (
                <div className={styles.surfaceMuted}>
                  <NoteForm title="Nova nota sobre o candidato" action={createCandidateNote.bind(null, candidate.id)} />
                </div>
              ) : null}
              <NoteFeed notes={candidate.notes} emptyMessage="Ainda nao ha notas internas para este candidato." />
            </div>
          </div>
        </div>

        <aside className={styles.stickyAside}>
          <div className={styles.spotlight}>
            <span className={styles.panelEyebrow}>Signal</span>
            <strong className={styles.spotlightValue}>{candidate.applications.length || 0}</strong>
            <p className={styles.panelDescription}>Frentes ativas em que este perfil ja esta sendo avaliado.</p>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Actions</span>
              <h2 className={styles.panelTitle}>Operar o perfil</h2>
            </div>
            <div className={styles.actionCluster}>
              {canManageCandidate ? (
                <div className={styles.surfaceMuted}>
                  <ResumeUploadForm action={uploadResume.bind(null, candidate.id)} />
                </div>
              ) : (
                <div className={styles.surfaceMuted}>Somente recrutadores e administradores podem enviar curriculos.</div>
              )}

              {canManageApplications && availableJobs.length ? (
                <div className={styles.surfaceMuted}>
                  <ApplyToJobForm action={createApplication.bind(null, candidate.id)} jobs={availableJobs} />
                </div>
              ) : canManageApplications ? (
                <div className={styles.surfaceMuted}>Este candidato ja foi vinculado a todas as vagas abertas disponiveis.</div>
              ) : (
                <div className={styles.surfaceMuted}>Somente recrutadores e administradores podem criar novas aplicacoes.</div>
              )}

              {canManageCandidate ? (
                <div className={styles.surfaceMuted}>
                  <AnalyzeResumeForm action={analyzeCandidateResume.bind(null, candidate.id)} />
                </div>
              ) : (
                <div className={styles.surfaceMuted}>Somente recrutadores e administradores podem rodar a analise de IA.</div>
              )}
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>AI digest</span>
              <h2 className={styles.panelTitle}>Leitura estruturada</h2>
            </div>

            {parsedProfile ? (
              <div className={styles.column}>
                <div className={styles.surfaceMuted}>
                  <strong className={styles.itemTitle}>Resumo executivo</strong>
                  <span className={styles.itemDescription}>
                    {String(parsedProfile.executiveSummary ?? candidate.summary ?? "--")}
                  </span>
                </div>
                <div className={styles.surfaceMuted}>
                  <strong className={styles.itemTitle}>Skills detectadas</strong>
                  <div className={styles.tagWrap}>
                    {coreSkills.length ? coreSkills.map((skill) => <span key={skill} className={styles.tagPill}>{skill}</span>) : <span className={styles.itemDescription}>Sem skills estruturadas ainda.</span>}
                  </div>
                </div>
                <div className={styles.surfaceMuted}>
                  <strong className={styles.itemTitle}>Pontos fortes</strong>
                  <div className={styles.list}>
                    {strengths.length ? strengths.map((item) => <span key={item} className={styles.itemDescription}>{item}</span>) : <span className={styles.itemDescription}>Nenhum ponto forte estruturado ainda.</span>}
                  </div>
                </div>
                <div className={styles.surfaceMuted}>
                  <strong className={styles.itemTitle}>Gaps observados</strong>
                  <div className={styles.list}>
                    {risks.length ? risks.map((item) => <span key={item} className={styles.itemDescription}>{item}</span>) : <span className={styles.itemDescription}>Nenhum gap estruturado ainda.</span>}
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
                      <span className={styles.itemDescription}>Rode a analise de IA para gerar perguntas guiadas.</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className={styles.surfaceMuted}>Rode a analise de IA para gerar resumo, skills e perguntas sugeridas.</div>
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}
