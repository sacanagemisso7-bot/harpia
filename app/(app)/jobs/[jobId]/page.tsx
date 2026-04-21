import Link from "next/link";
import { ArrowRight, CircleGauge, PencilLine, UsersRound, Workflow } from "lucide-react";
import { notFound } from "next/navigation";

import { ApplicationStageForm } from "@/components/applications/application-stage-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { hasPermission } from "@/lib/auth/permissions";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { hasPlanFeature } from "@/lib/billing/features";
import { getJobById } from "@/lib/jobs/queries";
import { getPipelineStages } from "@/lib/pipeline/queries";
import { formatScore } from "@/lib/utils";

import styles from "@/components/operations/ops-workspace.module.css";
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
    <div className={styles.workspace}>
      <div className={styles.header}>
        <span className={styles.eyebrow}>Contratação</span>
        <h2 className={styles.title}>{job.title}</h2>
        <p className={styles.description}>{job.summary}</p>
      </div>

      <div className={styles.statRow}>
        <div className={styles.statPill}>
          <strong>{job._count.applications}</strong>
          <span>candidaturas</span>
        </div>
        <div className={styles.statPill}>
          <strong>{formatScore(averageScore)}</strong>
          <span>média de score</span>
        </div>
        <div className={styles.statPill}>
          <strong>{mustHaveCriteria}</strong>
          <span>critérios obrigatórios</span>
        </div>
        <div className={styles.statPill}>
          <strong>{canUseAutomations ? activeAutomations : 0}</strong>
          <span>automações ativas</span>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.toolbarMeta}>
          <div className={styles.tabs}>
            <Badge variant={getJobStatusVariant(job.status)}>{job.status}</Badge>
            <Badge variant="outline">{job.department}</Badge>
            <Badge variant="outline">{job.location}</Badge>
            {canManageJob ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/jobs/${job.id}/edit`}>
                  <PencilLine className="mr-2 h-4 w-4" />
                  Editar vaga
                </Link>
              </Button>
            ) : null}
          </div>
          <span className={styles.shortcutHint}>Briefing, critérios, pipeline e aplicações em uma só visão operacional.</span>
        </div>
      </div>

      <div className={styles.workflowGuide}>
        <span>
          <strong>1.</strong> Revise critérios
        </span>
        <span>
          <strong>2.</strong> Veja candidatos priorizados
        </span>
        <span>
          <strong>3.</strong> Mova a fila
        </span>
      </div>

      <div className={styles.body}>
        <div className={styles.detailColumn}>
          <section className={styles.detailPanel}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.panelTitle}>Contexto da vaga</h3>
            </div>

            <p className={styles.detailText}>{job.description}</p>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{job.department}</Badge>
              <Badge variant="outline">{job.location}</Badge>
              <Badge variant="outline">{job.seniority}</Badge>
              <Badge variant="outline">{job.employmentType}</Badge>
              <Badge variant="outline">{job.minExperienceYears ?? 0} anos mín.</Badge>
            </div>
          </section>

          <section className={styles.listPanel}>
            <div className={styles.panelHeader}>
              <div className={styles.panelHeaderRow}>
                <div>
                  <h3 className={styles.panelTitle}>Critérios da vaga</h3>
                  <p className={styles.panelDescription}>A base usada para score e leitura de aderência.</p>
                </div>
              </div>
            </div>

            <div className={styles.list}>
              {job.criteria.map((criterion) => (
                <div key={criterion.id} className={styles.row}>
                  <div className={styles.rowTop}>
                    <div className={styles.rowLead}>
                      <p className={styles.rowTitle}>{criterion.label}</p>
                      <p className={styles.rowSubtitle}>{criterion.type === "MUST_HAVE" ? "Obrigatório" : "Desejável"}</p>
                    </div>
                    <Badge variant={criterion.type === "MUST_HAVE" ? "success" : "outline"}>Peso {criterion.weight}/10</Badge>
                  </div>
                  <p className={styles.rowSubtitle}>{criterion.notes || "Sem observações adicionais."}</p>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.listPanel}>
            <div className={styles.panelHeader}>
              <div className={styles.panelHeaderRow}>
                <div>
                  <h3 className={styles.panelTitle}>Scorecard de entrevista</h3>
                  <p className={styles.panelDescription}>Itens que padronizam a avaliação entre entrevistadores.</p>
                </div>
              </div>
            </div>

            <div className={styles.list}>
              {job.scorecardItems.length ? (
                job.scorecardItems.map((item) => (
                  <div key={item.id} className={styles.row}>
                    <div className={styles.rowTop}>
                      <div className={styles.rowLead}>
                        <p className={styles.rowTitle}>{item.label}</p>
                        <p className={styles.rowSubtitle}>{item.category}</p>
                      </div>
                      <Badge variant="outline">Peso {item.weight}/10</Badge>
                    </div>
                    <p className={styles.rowSubtitle}>{item.description || "Sem guia adicional para este eixo."}</p>
                  </div>
                ))
              ) : (
                <div className={styles.emptyWrap}>
                  <p className={styles.emptyState}>Nenhum item de scorecard configurado para esta vaga.</p>
                </div>
              )}
            </div>
          </section>

          <section className={styles.listPanel}>
            <div className={styles.panelHeader}>
              <div className={styles.panelHeaderRow}>
                <div>
                  <h3 className={styles.panelTitle}>Fila priorizada</h3>
                  <p className={styles.panelDescription}>Aplicações ordenadas por score com próxima ação operável.</p>
                </div>
              </div>
            </div>

            <div className={styles.list}>
              {job.applications.length ? (
                job.applications.map((application, index) => (
                  <div key={application.id} className={styles.row}>
                    <div className={styles.rowTop}>
                      <div className={styles.rowLead}>
                        <p className={styles.rowTitle}>
                          #{index + 1} {application.candidate.fullName}
                        </p>
                        <p className={styles.rowSubtitle}>
                          {application.candidate.currentTitle || "Sem cargo atual"} ·{" "}
                          {application.currentStage?.name || "Sem etapa"}
                        </p>
                      </div>
                      <Badge variant="outline">{formatScore(application.score)}</Badge>
                    </div>
                    <p className={styles.rowSubtitle}>
                      {application.executiveSummary || "Score gerado, mas sem resumo executivo adicional."}
                    </p>
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                      {canManageApplications ? (
                        <ApplicationStageForm
                          compact
                          stages={stages}
                          currentStageId={application.currentStageId}
                          action={moveApplicationStage.bind(null, application.id)}
                        />
                      ) : (
                        <p className={styles.detailText}>Seu papel não pode mover esta candidatura no pipeline.</p>
                      )}
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/applications/${application.id}`}>
                          Abrir aplicação
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.emptyWrap}>
                  <p className={styles.emptyState}>Nenhuma candidatura vinculada ainda.</p>
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className={styles.detailColumn}>
          <section className={styles.detailPanel}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.panelTitle}>Leitura rápida</h3>
              <Badge variant="success">{formatScore(averageScore)}</Badge>
            </div>

            <div className={styles.sectionStack}>
              <div className={styles.detailCell}>
                <span className={styles.metaValue}>
                  <UsersRound className="mr-2 inline h-4 w-4" />
                  Pulso da vaga
                </span>
                <p className={styles.detailText}>Média atual do fit score entre as candidaturas em aberto.</p>
              </div>
              <div className={styles.detailCell}>
                <span className={styles.metaValue}>Senioridade</span>
                <p className={styles.detailText}>{job.seniority}</p>
              </div>
              <div className={styles.detailCell}>
                <span className={styles.metaValue}>Experiência mínima</span>
                <p className={styles.detailText}>{job.minExperienceYears ?? 0} anos</p>
              </div>
            </div>
          </section>

          <section className={styles.detailPanel}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.panelTitle}>Automações</h3>
              <Badge variant={canUseAutomations ? "outline" : "warning"}>
                {canUseAutomations ? "Disponível" : "Growth"}
              </Badge>
            </div>

            <div className={styles.sectionStack}>
              {canUseAutomations && job.automationRules.length ? (
                job.automationRules.map((rule) => (
                  <div key={rule.id} className={styles.detailCell}>
                    <div className={styles.sectionHeader}>
                      <span className={styles.metaValue}>
                        <Workflow className="mr-2 inline h-4 w-4" />
                        {rule.trigger}
                      </span>
                      <Badge variant={rule.enabled ? "success" : "outline"}>{rule.enabled ? "Ativa" : "Pausada"}</Badge>
                    </div>
                    <p className={styles.detailText}>Destino: {rule.targetStage.name}</p>
                    <p className={styles.detailText}>{rule.notes || "Sem observações adicionais."}</p>
                  </div>
                ))
              ) : (
                <p className={styles.emptyState}>
                  {canUseAutomations
                    ? "Nenhuma automação configurada para esta vaga."
                    : "Automações por vaga fazem parte do plano Growth."}
                </p>
              )}
            </div>
          </section>

          <section className={styles.detailPanel}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.panelTitle}>Atalhos</h3>
            </div>

            <div className={styles.sectionStack}>
              <Link href="/jobs" className={styles.detailCell}>
                <span className={styles.metaValue}>
                  <CircleGauge className="mr-2 inline h-4 w-4" />
                  Todas as vagas
                </span>
                <p className={styles.detailText}>Volte para a fila completa e ajuste filtros.</p>
              </Link>
              <Link href="/pipeline" className={styles.detailCell}>
                <span className={styles.metaValue}>Pipeline</span>
                <p className={styles.detailText}>Abra a visão por etapa e acompanhe gargalos.</p>
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
