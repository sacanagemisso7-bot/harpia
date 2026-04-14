import Link from "next/link";
import { ArrowUpRight, Orbit, Workflow } from "lucide-react";
import { notFound } from "next/navigation";

import { JobForm } from "@/components/jobs/job-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/permissions";
import { hasPlanFeature } from "@/lib/billing/features";
import { getJobById } from "@/lib/jobs/queries";
import { getPipelineStages } from "@/lib/pipeline/queries";

import styles from "@/components/operations/ops-workspace.module.css";
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
    <div className={styles.workspace}>
      <div className={styles.header}>
        <span className={styles.eyebrow}>Hiring</span>
        <h2 className={styles.title}>Editar {job.title}</h2>
        <p className={styles.description}>
          Ajuste a vaga sem desmontar critérios, scorecard e regras que já sustentam a operação do time.
        </p>
      </div>

      <div className={styles.statRow}>
        <div className={styles.statPill}>
          <strong>{job._count.applications}</strong>
          <span>candidaturas ativas</span>
        </div>
        <div className={styles.statPill}>
          <strong>{job.criteria.length}</strong>
          <span>critérios configurados</span>
        </div>
        <div className={styles.statPill}>
          <strong>{job.scorecardItems.length}</strong>
          <span>itens no scorecard</span>
        </div>
        <div className={styles.statPill}>
          <strong>{canUseAutomations ? activeRules : 0}</strong>
          <span>regras ativas</span>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.toolbarMeta}>
          <div className={styles.tabs}>
            <Button asChild size="sm">
              <Link href={`/jobs/${job.id}`}>
                Ver detalhe
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/jobs">Voltar para vagas</Link>
            </Button>
          </div>
          <span className={styles.shortcutHint}>Edite o essencial sem perder a leitura operacional da vaga.</span>
        </div>
      </div>

      <div className={styles.body}>
        <section className={styles.formPanel}>
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>Configuração da vaga</h3>
            <p className={styles.panelDescription}>
              Atualize briefing, critérios, scorecard e automações no mesmo fluxo.
            </p>
          </div>

          <JobForm
            action={updateJob.bind(null, jobId)}
            stages={stages}
            canUseAutomations={canUseAutomations}
            submitLabel="Salvar alterações"
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
        </section>

        <aside className={styles.detailColumn}>
          <section className={styles.detailPanel}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.panelTitle}>Pulso atual</h3>
              <Badge variant={job.status === "OPEN" ? "success" : "outline"}>{job.status}</Badge>
            </div>

            <div className={styles.detailGrid}>
              <div className={styles.detailCell}>
                <span className={styles.metaLabel}>Área</span>
                <span className={styles.metaValue}>{job.department}</span>
              </div>
              <div className={styles.detailCell}>
                <span className={styles.metaLabel}>Local</span>
                <span className={styles.metaValue}>{job.location}</span>
              </div>
              <div className={styles.detailCell}>
                <span className={styles.metaLabel}>Senioridade</span>
                <span className={styles.metaValue}>{job.seniority}</span>
              </div>
              <div className={styles.detailCell}>
                <span className={styles.metaLabel}>Plano</span>
                <span className={styles.metaValue}>{user.organizationBillingPlan}</span>
              </div>
            </div>
          </section>

          <section className={styles.detailPanel}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.panelTitle}>Etapas do pipeline</h3>
            </div>

            <div className={styles.sectionStack}>
              {stages.map((stage, index) => (
                <div key={stage.id} className={styles.detailCell}>
                  <div className={styles.sectionHeader}>
                    <span className={styles.metaValue}>
                      <Workflow className="mr-2 inline h-4 w-4" />
                      {stage.name}
                    </span>
                    <span className={styles.metaLabel}>#{index + 1}</span>
                  </div>
                  <p className={styles.detailText}>A vaga continua compatível com esta etapa.</p>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.detailPanel}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.panelTitle}>Decisões que ajudam</h3>
            </div>

            <div className={styles.sectionStack}>
              <div className={styles.detailCell}>
                <span className={styles.metaValue}>
                  <Orbit className="mr-2 inline h-4 w-4" />
                  Resumo curto
                </span>
                <p className={styles.detailText}>O briefing fica mais útil quando cabe em duas ou três frases.</p>
              </div>
              <div className={styles.detailCell}>
                <span className={styles.metaValue}>Critérios obrigatórios</span>
                <p className={styles.detailText}>Evite inflar o score com sinais secundários ou pouco confiáveis.</p>
              </div>
              <div className={styles.detailCell}>
                <span className={styles.metaValue}>Automações</span>
                <p className={styles.detailText}>Ative só o que o time realmente confia para mover o pipeline.</p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
