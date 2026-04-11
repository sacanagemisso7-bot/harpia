import Link from "next/link";
import { ArrowUpRight, Orbit, Sparkles, Workflow } from "lucide-react";
import { notFound } from "next/navigation";

import { JobForm } from "@/components/jobs/job-form";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/permissions";
import { hasPlanFeature } from "@/lib/billing/features";
import { getJobById } from "@/lib/jobs/queries";
import { getPipelineStages } from "@/lib/pipeline/queries";

import styles from "../../../workspace-expansion.module.css";
import { updateJob } from "../../actions";

export default async function EditJobPage({
  params
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const user = await requirePermission("manage_jobs");
  const [job, stages] = await Promise.all([getJobById(jobId, user.organizationId), getPipelineStages(user.organizationId)]);

  if (!job) {
    notFound();
  }

  const canUseAutomations = hasPlanFeature(user.organizationBillingPlan, "job_automations");
  const activeRules = job.automationRules.filter((rule) => rule.enabled).length;

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Job edit"
        title={`Editar ${job.title}`}
        description="Atualize a vaga sem perder criterios, scorecard e automações ja ligados a operação."
        actions={
          <>
            <Badge variant={job.status === "OPEN" ? "success" : "outline"}>{job.status}</Badge>
            <Button asChild variant="outline">
              <Link href={`/jobs/${job.id}`}>
                Ver detalhe
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </>
        }
      />

      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Candidaturas</span>
          <strong className={styles.statValue}>{job._count.applications}</strong>
          <span className={styles.statHint}>Volume atual vinculado a esta vaga.</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Criterios</span>
          <strong className={styles.statValue}>{job.criteria.length}</strong>
          <span className={styles.statHint}>Sinais ativos para score de aderência.</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Scorecard</span>
          <strong className={styles.statValue}>{job.scorecardItems.length}</strong>
          <span className={styles.statHint}>Eixos configurados para entrevista.</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Automações</span>
          <strong className={styles.statValue}>{canUseAutomations ? activeRules : 0}</strong>
          <span className={styles.statHint}>Regras atualmente ativas no pipeline.</span>
        </div>
      </section>

      <section className={styles.detailLayout}>
        <div className={styles.column}>
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Revision</span>
              <h2 className={styles.panelTitle}>Ajuste a vaga sem desmontar a operação ja em curso.</h2>
              <p className={styles.panelDescription}>
                Mantenha criterios claros, pipeline atualizado e o scorecard calibrado para a equipe.
              </p>
            </div>

            <JobForm
              action={updateJob.bind(null, jobId)}
              stages={stages}
              canUseAutomations={canUseAutomations}
              submitLabel="Salvar alteracoes"
              defaultValues={{
                title: job.title,
                department: job.department,
                location: job.location,
                employmentType: job.employmentType,
                seniority: job.seniority,
                summary: job.summary,
                description: job.description,
                educationLevel: job.educationLevel,
                minExperienceYears: job.minExperienceYears,
                status: job.status,
                criteria: job.criteria.map((criterion) => ({
                  id: criterion.id,
                  type: criterion.type,
                  label: criterion.label,
                  weight: criterion.weight,
                  notes: criterion.notes ?? "",
                  order: criterion.order
                })),
                scorecardItems: job.scorecardItems.map((item) => ({
                  id: item.id,
                  label: item.label,
                  category: item.category,
                  description: item.description ?? "",
                  weight: item.weight,
                  isRequired: item.isRequired,
                  order: item.order
                })),
                automationRules: job.automationRules.map((rule) => ({
                  id: rule.id,
                  trigger: rule.trigger,
                  targetStageId: rule.targetStageId,
                  enabled: rule.enabled,
                  notes: rule.notes ?? ""
                }))
              }}
            />
          </div>
        </div>

        <aside className={styles.stickyAside}>
          <div className={styles.panel}>
            <div className={styles.itemHeader}>
              <div className={styles.itemLead}>
                <span className={styles.panelEyebrow}>Current brief</span>
                <h3 className={styles.panelTitle}>Pulso da vaga</h3>
              </div>
              <span className={styles.iconLead}>
                <Orbit className="h-4 w-4" />
              </span>
            </div>
            <div className={styles.metricStack}>
              <div className={styles.metricRow}>
                <span>Area</span>
                <strong>{job.department}</strong>
              </div>
              <div className={styles.metricRow}>
                <span>Local</span>
                <strong>{job.location}</strong>
              </div>
              <div className={styles.metricRow}>
                <span>Senioridade</span>
                <strong>{job.seniority}</strong>
              </div>
              <div className={styles.metricRow}>
                <span>Plano</span>
                <strong>{user.organizationBillingPlan}</strong>
              </div>
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.itemHeader}>
              <div className={styles.itemLead}>
                <span className={styles.panelEyebrow}>Pipeline</span>
                <h3 className={styles.panelTitle}>Etapas ativas</h3>
              </div>
              <span className={styles.iconLead}>
                <Workflow className="h-4 w-4" />
              </span>
            </div>
            <div className={styles.workflowList}>
              {stages.map((stage, index) => (
                <div key={stage.id} className={styles.workflowItem}>
                  <div className={styles.rowBetween}>
                    <strong className={styles.itemTitle}>{stage.name}</strong>
                    <span className={styles.tinyLabel}>#{index + 1}</span>
                  </div>
                  <div className={styles.progressTrack}>
                    <div className={styles.progressFill} style={{ width: `${((index + 1) / stages.length) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.itemHeader}>
              <div className={styles.itemLead}>
                <span className={styles.panelEyebrow}>Optimization</span>
                <h3 className={styles.panelTitle}>Pontos de calibragem</h3>
              </div>
              <span className={styles.iconLead}>
                <Sparkles className="h-4 w-4" />
              </span>
            </div>
            <div className={styles.list}>
              <div className={styles.listItem}>
                <strong className={styles.itemTitle}>Resumo executivo</strong>
                <span className={styles.itemDescription}>Mantenha em 2 ou 3 frases para acelerar alinhamento.</span>
              </div>
              <div className={styles.listItem}>
                <strong className={styles.itemTitle}>Criterios obrigatorios</strong>
                <span className={styles.itemDescription}>Não deixe o score pesar demais em sinais secundarios.</span>
              </div>
              <div className={styles.listItem}>
                <strong className={styles.itemTitle}>Automações</strong>
                <span className={styles.itemDescription}>Ative so onde o time realmente confia na regra.</span>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
