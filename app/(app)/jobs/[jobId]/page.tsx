import Link from "next/link";
import { ArrowRight, CircleGauge, PencilLine, UsersRound, Workflow } from "lucide-react";
import { notFound } from "next/navigation";

import { ApplicationStageForm } from "@/components/applications/application-stage-form";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { hasPermission } from "@/lib/auth/permissions";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { hasPlanFeature } from "@/lib/billing/features";
import { getJobById } from "@/lib/jobs/queries";
import { getPipelineStages } from "@/lib/pipeline/queries";
import { formatScore } from "@/lib/utils";

import styles from "../../workspace-expansion.module.css";
import { moveApplicationStage } from "../../applications/actions";

function getJobStatusVariant(status: string) {
  return status === "OPEN" ? "success" : "outline";
}

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
      ? Math.round(job.applications.reduce((sum, application) => sum + (application.score ?? 0), 0) / job.applications.length)
      : 0;
  const canManageJob = hasPermission(user.role, "manage_jobs");
  const canManageApplications = hasPermission(user.role, "manage_applications");
  const canUseAutomations = hasPlanFeature(user.organizationBillingPlan, "job_automations");
  const activeAutomations = job.automationRules.filter((rule) => rule.enabled).length;
  const mustHaveCriteria = job.criteria.filter((criterion) => criterion.type === "MUST_HAVE").length;

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Job detail"
        title={job.title}
        description={job.summary}
        actions={
          <>
            <Badge variant={getJobStatusVariant(job.status)}>{job.status}</Badge>
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

      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Candidaturas</span>
          <strong className={styles.statValue}>{job._count.applications}</strong>
          <span className={styles.statHint}>Volume total atualmente no pipeline.</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Media de score</span>
          <strong className={styles.statValue}>{formatScore(averageScore)}</strong>
          <span className={styles.statHint}>Leitura media da aderencia dos perfis.</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Obrigatorios</span>
          <strong className={styles.statValue}>{mustHaveCriteria}</strong>
          <span className={styles.statHint}>Criterios que definem o corte minimo da vaga.</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Automacoes</span>
          <strong className={styles.statValue}>{canUseAutomations ? activeAutomations : 0}</strong>
          <span className={styles.statHint}>Regras ativas que movem a aplicacao automaticamente.</span>
        </div>
      </section>

      <section className={styles.detailLayout}>
        <div className={styles.column}>
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Job brief</span>
              <h2 className={styles.panelTitle}>Contexto e regua da vaga</h2>
            </div>
            <p className={styles.richText}>{job.description}</p>
            <div className={styles.tagWrap}>
              <span className={styles.tagPill}>{job.department}</span>
              <span className={styles.tagPill}>{job.location}</span>
              <span className={styles.tagPill}>{job.seniority}</span>
              <span className={styles.tagPill}>{job.employmentType}</span>
              <span className={styles.tagPill}>{job.minExperienceYears ?? 0} anos min.</span>
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Criteria</span>
              <h2 className={styles.panelTitle}>Sinais de aderencia</h2>
              <p className={styles.panelDescription}>Base de score para triagem e para a leitura do time entrevistador.</p>
            </div>
            <div className={styles.list}>
              {job.criteria.map((criterion) => (
                <div key={criterion.id} className={styles.listItem}>
                  <div className={styles.itemHeader}>
                    <div className={styles.itemLead}>
                      <strong className={styles.itemTitle}>{criterion.label}</strong>
                      <span className={styles.itemSubtitle}>
                        {criterion.type === "MUST_HAVE" ? "Obrigatorio" : "Desejavel"}
                      </span>
                    </div>
                    <Badge variant={criterion.type === "MUST_HAVE" ? "success" : "outline"}>Peso {criterion.weight}/10</Badge>
                  </div>
                  <span className={styles.itemDescription}>{criterion.notes || "Sem observacoes adicionais."}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Scorecard</span>
              <h2 className={styles.panelTitle}>Roteiro de entrevista</h2>
              <p className={styles.panelDescription}>Itens que padronizam a avaliacao da vaga entre entrevistadores.</p>
            </div>
            {job.scorecardItems.length ? (
              <div className={styles.list}>
                {job.scorecardItems.map((item) => (
                  <div key={item.id} className={styles.listItem}>
                    <div className={styles.itemHeader}>
                      <div className={styles.itemLead}>
                        <strong className={styles.itemTitle}>{item.label}</strong>
                        <span className={styles.itemSubtitle}>{item.category}</span>
                      </div>
                      <Badge variant="outline">Peso {item.weight}/10</Badge>
                    </div>
                    <span className={styles.itemDescription}>{item.description || "Sem guia adicional para este eixo."}</span>
                    <span className={styles.tinyLabel}>{item.isRequired ? "Obrigatorio" : "Complementar"}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>Nenhum item de scorecard configurado para esta vaga.</div>
            )}
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Candidates</span>
              <h2 className={styles.panelTitle}>Fila priorizada</h2>
              <p className={styles.panelDescription}>Aplicacoes ordenadas por score com proxima acao operavel.</p>
            </div>
            {job.applications.length ? (
              <div className={styles.list}>
                {job.applications.map((application, index) => (
                  <div key={application.id} className={styles.listItem}>
                    <div className={styles.rowBetween}>
                      <div className={styles.itemLead}>
                        <strong className={styles.itemTitle}>
                          #{index + 1} {application.candidate.fullName}
                        </strong>
                        <span className={styles.itemSubtitle}>
                          {application.candidate.currentTitle || "Sem cargo atual"} - {application.currentStage?.name || "Sem etapa"}
                        </span>
                      </div>
                      <Badge variant="outline">{formatScore(application.score)}</Badge>
                    </div>
                    <span className={styles.itemDescription}>
                      {application.executiveSummary || "Score gerado, mas sem resumo executivo adicional."}
                    </span>
                    <div className={styles.subGrid2}>
                      {canManageApplications ? (
                        <ApplicationStageForm
                          compact
                          stages={stages}
                          currentStageId={application.currentStageId}
                          action={moveApplicationStage.bind(null, application.id)}
                        />
                      ) : (
                        <div className={styles.surfaceMuted}>Sem permissao para mover a etapa desta candidatura.</div>
                      )}
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/applications/${application.id}`}>
                          Abrir aplicacao
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>Nenhuma candidatura vinculada ainda. Abra a vaga para comecar a triar.</div>
            )}
          </div>
        </div>

        <aside className={styles.stickyAside}>
          <div className={styles.spotlight}>
            <span className={styles.panelEyebrow}>Hiring pulse</span>
            <strong className={styles.spotlightValue}>{formatScore(averageScore)}</strong>
            <p className={styles.panelDescription}>Media atual do fit score nesta vaga.</p>
          </div>

          <div className={styles.panel}>
            <div className={styles.itemHeader}>
              <div className={styles.itemLead}>
                <span className={styles.panelEyebrow}>Operational summary</span>
                <h3 className={styles.panelTitle}>Leitura rapida</h3>
              </div>
              <span className={styles.iconLead}>
                <UsersRound className="h-4 w-4" />
              </span>
            </div>
            <div className={styles.metricStack}>
              <div className={styles.metricRow}>
                <span>Senioridade</span>
                <strong>{job.seniority}</strong>
              </div>
              <div className={styles.metricRow}>
                <span>Experiencia minima</span>
                <strong>{job.minExperienceYears ?? 0} anos</strong>
              </div>
              <div className={styles.metricRow}>
                <span>Scorecard</span>
                <strong>{job.scorecardItems.length}</strong>
              </div>
              <div className={styles.metricRow}>
                <span>Status</span>
                <strong>{job.status}</strong>
              </div>
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.itemHeader}>
              <div className={styles.itemLead}>
                <span className={styles.panelEyebrow}>Automations</span>
                <h3 className={styles.panelTitle}>Regras ativas</h3>
              </div>
              <span className={styles.iconLead}>
                <Workflow className="h-4 w-4" />
              </span>
            </div>
            {canUseAutomations && job.automationRules.length ? (
              <div className={styles.list}>
                {job.automationRules.map((rule) => (
                  <div key={rule.id} className={styles.listItem}>
                    <div className={styles.itemHeader}>
                      <div className={styles.itemLead}>
                        <strong className={styles.itemTitle}>{rule.trigger}</strong>
                        <span className={styles.itemSubtitle}>Destino {rule.targetStage.name}</span>
                      </div>
                      <Badge variant={rule.enabled ? "success" : "outline"}>{rule.enabled ? "Ativa" : "Pausada"}</Badge>
                    </div>
                    <span className={styles.itemDescription}>{rule.notes || "Sem observacoes adicionais."}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.surfaceMuted}>
                {canUseAutomations
                  ? "Nenhuma automacao configurada para esta vaga."
                  : "Automacoes por vaga fazem parte do plano Growth."}
              </div>
            )}
          </div>

          <div className={styles.panel}>
            <div className={styles.itemHeader}>
              <div className={styles.itemLead}>
                <span className={styles.panelEyebrow}>Navigation</span>
                <h3 className={styles.panelTitle}>Atalhos</h3>
              </div>
              <span className={styles.iconLead}>
                <CircleGauge className="h-4 w-4" />
              </span>
            </div>
            <div className={styles.linkList}>
              <Link href="/jobs" className={styles.linkItem}>
                <strong>Todas as vagas</strong>
                <span>Volte para a fila completa e ajuste filtros.</span>
              </Link>
              <Link href="/pipeline" className={styles.linkItem}>
                <strong>Pipeline</strong>
                <span>Abra a visao por etapa e acompanhe gargalos.</span>
              </Link>
              <Link href="/hiring" className={styles.linkItem}>
                <strong>Hiring workspace</strong>
                <span>Resumo operacional da frente de recrutamento.</span>
              </Link>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
