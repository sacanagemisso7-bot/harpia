import Link from "next/link";
import { BriefcaseBusiness, FileText, Linkedin, MapPin, Sparkles } from "lucide-react";
import { notFound } from "next/navigation";

import { AnalyzeResumeForm } from "@/components/candidates/analyze-resume-form";
import { ApplyToJobForm } from "@/components/candidates/apply-to-job-form";
import { ResumeUploadForm } from "@/components/candidates/resume-upload-form";
import { PageHeader } from "@/components/layout/page-header";
import { NoteFeed } from "@/components/notes/note-feed";
import { NoteForm } from "@/components/notes/note-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { hasPermission } from "@/lib/auth/permissions";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { getCandidateById } from "@/lib/candidates/queries";
import { getOpenJobsForCandidate } from "@/lib/jobs/queries";
import { formatScore } from "@/lib/utils";

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
    <div className="space-y-6">
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

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_420px]">
        <div className="space-y-6">
          <Card className="panel-hover">
            <CardHeader>
              <CardTitle>Perfil consolidado</CardTitle>
              <CardDescription>Dados centrais do candidato para operacao, triagem e entrevistas.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 md:grid-cols-2">
              <div className="rounded-[1.25rem] border border-border/70 bg-white/75 p-5">
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="mt-2 font-semibold">{candidate.email || "--"}</p>
              </div>
              <div className="rounded-[1.25rem] border border-border/70 bg-white/75 p-5">
                <p className="text-sm text-muted-foreground">Telefone</p>
                <p className="mt-2 font-semibold">{candidate.phone || "--"}</p>
              </div>
              <div className="rounded-[1.25rem] border border-border/70 bg-white/75 p-5">
                <p className="text-sm text-muted-foreground">Cargo atual</p>
                <p className="mt-2 font-semibold">{candidate.currentTitle || "--"}</p>
              </div>
              <div className="rounded-[1.25rem] border border-border/70 bg-white/75 p-5">
                <p className="text-sm text-muted-foreground">Empresa atual</p>
                <p className="mt-2 font-semibold">{candidate.currentCompany || "--"}</p>
              </div>
              <div className="rounded-[1.25rem] border border-border/70 bg-white/75 p-5 md:col-span-2">
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  {candidate.location ? (
                    <span className="inline-flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {candidate.location}
                    </span>
                  ) : null}
                  {candidate.linkedinUrl ? (
                    <a href={candidate.linkedinUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-primary">
                      <Linkedin className="h-4 w-4" />
                      LinkedIn
                    </a>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="panel-hover">
            <CardHeader>
              <CardTitle>Curriculos enviados</CardTitle>
              <CardDescription>Persistencia local no MVP com extração imediata de texto para IA.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {candidate.resumes.length ? (
                candidate.resumes.map((resume) => (
                  <div key={resume.id} className="rounded-[1.35rem] border border-border/70 bg-white/75 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <p className="font-semibold">{resume.fileName}</p>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                          {formatResumeSize(resume.sizeBytes)} · {new Intl.DateTimeFormat("pt-BR").format(resume.uploadedAt)}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-secondary p-3 text-secondary-foreground">
                        <FileText className="h-4 w-4" />
                      </div>
                    </div>
                    <Separator className="my-4" />
                    <p className="max-h-64 overflow-y-auto whitespace-pre-line text-sm leading-6 text-muted-foreground">
                      {resume.extractedText || "Nao foi possivel extrair o texto deste PDF. O arquivo continua salvo para reprocessamento."}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-[1.35rem] border border-dashed border-border bg-white/75 p-6 text-sm text-muted-foreground">
                  Nenhum curriculo enviado ainda.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="panel-hover">
            <CardHeader>
              <CardTitle>Aplicacoes ativas</CardTitle>
              <CardDescription>Vinculos com vagas, score e etapa atual.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {candidate.applications.length ? (
                candidate.applications.map((application) => (
                  <Link
                    key={application.id}
                    href={`/applications/${application.id}`}
                    className="block rounded-[1.35rem] border border-border/70 bg-white/75 p-5 hover:-translate-y-1 hover:shadow-soft"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold">{application.job.title}</p>
                        <p className="text-sm text-muted-foreground">{application.currentStage?.name || "Sem etapa"}</p>
                      </div>
                      <Badge variant="outline">{formatScore(application.score)}</Badge>
                    </div>
                    <p className="mt-4 text-sm text-muted-foreground">
                      {application.executiveSummary || "Analise de aderencia disponivel no detalhe da aplicacao."}
                    </p>
                  </Link>
                ))
              ) : (
                <div className="rounded-[1.35rem] border border-dashed border-border bg-white/75 p-6 text-sm text-muted-foreground">
                  Ainda sem aplicacoes para este candidato.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="panel-hover">
            <CardHeader>
              <CardTitle>Notas internas</CardTitle>
              <CardDescription>Contexto compartilhado entre recrutadores e hiring managers.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {canCreateNotes ? (
                <NoteForm
                  title="Nova nota sobre o candidato"
                  action={createCandidateNote.bind(null, candidate.id)}
                />
              ) : null}
              <NoteFeed notes={candidate.notes} emptyMessage="Ainda nao ha notas internas para este candidato." />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="panel-hover">
            <CardHeader>
              <CardTitle>Upload de curriculo</CardTitle>
              <CardDescription>Adicione PDFs para extracao local e analise com IA.</CardDescription>
            </CardHeader>
            <CardContent>
              {canManageCandidate ? (
                <ResumeUploadForm action={uploadResume.bind(null, candidate.id)} />
              ) : (
                <div className="rounded-[1.25rem] border border-dashed border-border bg-white/70 p-5 text-sm text-muted-foreground">
                  Somente recrutadores e administradores podem enviar novos curriculos.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="panel-hover">
            <CardHeader>
              <CardTitle>Aplicar em vaga</CardTitle>
              <CardDescription>Crie a aplicacao e gere score inicial automaticamente.</CardDescription>
            </CardHeader>
            <CardContent>
              {canManageApplications && availableJobs.length ? (
                <ApplyToJobForm action={createApplication.bind(null, candidate.id)} jobs={availableJobs} />
              ) : canManageApplications ? (
                <div className="rounded-[1.25rem] border border-dashed border-border bg-white/70 p-5 text-sm text-muted-foreground">
                  Este candidato ja foi vinculado a todas as vagas abertas disponiveis.
                </div>
              ) : (
                <div className="rounded-[1.25rem] border border-dashed border-border bg-white/70 p-5 text-sm text-muted-foreground">
                  Somente recrutadores e administradores podem criar novas aplicacoes.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="panel-hover">
            <CardHeader>
              <CardTitle>Analise de IA</CardTitle>
              <CardDescription>Atualize o perfil consolidado com parsing estruturado do curriculo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {canManageCandidate ? (
                <AnalyzeResumeForm action={analyzeCandidateResume.bind(null, candidate.id)} />
              ) : (
                <div className="rounded-[1.25rem] border border-dashed border-border bg-white/70 p-5 text-sm text-muted-foreground">
                  Somente recrutadores e administradores podem rodar a analise de IA.
                </div>
              )}
              {parsedProfile ? (
                <div className="rounded-[1.25rem] border border-border/70 bg-white/70 p-5">
                  <p className="text-sm text-muted-foreground">Resumo executivo</p>
                  <p className="mt-2 text-sm leading-6">{String(parsedProfile.executiveSummary ?? candidate.summary ?? "--")}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="panel-hover">
            <CardHeader>
              <CardTitle>Insights de IA</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-[1.25rem] border border-border/70 bg-white/70 p-5">
                <p className="text-sm text-muted-foreground">Skills detectadas</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {coreSkills.length ? coreSkills.map((skill) => <Badge key={skill} variant="success">{skill}</Badge>) : <span className="text-sm text-muted-foreground">Sem skills estruturadas ainda.</span>}
                </div>
              </div>
              <div className="rounded-[1.25rem] border border-border/70 bg-white/70 p-5">
                <p className="text-sm text-muted-foreground">Pontos fortes</p>
                <div className="mt-3 space-y-2">
                  {strengths.length ? strengths.map((item) => <p key={item} className="text-sm">{item}</p>) : <p className="text-sm text-muted-foreground">Nenhum ponto forte estruturado ainda.</p>}
                </div>
              </div>
              <div className="rounded-[1.25rem] border border-border/70 bg-white/70 p-5">
                <p className="text-sm text-muted-foreground">Gaps observados</p>
                <div className="mt-3 space-y-2">
                  {risks.length ? risks.map((item) => <p key={item} className="text-sm">{item}</p>) : <p className="text-sm text-muted-foreground">Nenhum gap estruturado ainda.</p>}
                </div>
              </div>
              <div className="rounded-[1.25rem] border border-border/70 bg-white/70 p-5">
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
                    <p className="text-sm text-muted-foreground">Rode a analise de IA para gerar perguntas guiadas.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
