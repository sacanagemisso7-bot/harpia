import Link from "next/link";
import { ArrowRight, Orbit, Workflow } from "lucide-react";

import { JobForm } from "@/components/jobs/job-form";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/permissions";
import { hasPlanFeature } from "@/lib/billing/features";
import { getPipelineStages } from "@/lib/pipeline/queries";

import styles from "@/components/operations/ops-workspace.module.css";
import { createJob } from "../actions";

export default async function NewJobPage() {
  const user = await requirePermission("manage_jobs");
  const stages = await getPipelineStages(user.organizationId);
  const canUseAutomations = hasPlanFeature(user.organizationBillingPlan, "job_automations");

  return (
    <div className={styles.workspace}>
      <div className={styles.header}>
        <span className={styles.eyebrow}>Hiring</span>
        <h2 className={styles.title}>Nova vaga</h2>
        <p className={styles.description}>
          Abra a vaga com critérios claros, scorecard consistente e pipeline pronto para triagem sem espalhar a
          configuração em várias etapas.
        </p>
      </div>

      <div className={styles.statRow}>
        <div className={styles.statPill}>
          <strong>{stages.length}</strong>
          <span>etapas disponíveis</span>
        </div>
        <div className={styles.statPill}>
          <strong>{canUseAutomations ? "Ativas" : "Growth"}</strong>
          <span>automações por vaga</span>
        </div>
        <div className={styles.statPill}>
          <strong>{user.organizationBillingPlan}</strong>
          <span>plano atual da organização</span>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.toolbarMeta}>
          <div className={styles.tabs}>
            <Button asChild size="sm">
              <Link href="/jobs">
                Voltar para vagas
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/pipeline">Abrir pipeline</Link>
            </Button>
          </div>
          <span className={styles.shortcutHint}>Uma boa configuração aqui economiza retrabalho na triagem e na entrevista.</span>
        </div>
      </div>

      <div className={styles.body}>
        <section className={styles.formPanel}>
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>Configuração da vaga</h3>
            <p className={styles.panelDescription}>
              Defina o briefing, os critérios, o scorecard e as regras do pipeline.
            </p>
          </div>

          <JobForm action={createJob} stages={stages} canUseAutomations={canUseAutomations} submitLabel="Criar vaga" />
        </section>

        <aside className={styles.detailColumn}>
          <section className={styles.detailPanel}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.panelTitle}>O que já sai pronto</h3>
            </div>

            <div className={styles.sectionStack}>
              <div className={styles.detailCell}>
                <span className={styles.metaValue}>
                  <Orbit className="mr-2 inline h-4 w-4" />
                  Critérios para score
                </span>
                <p className={styles.detailText}>A triagem e a IA passam a usar a mesma régua de aderência.</p>
              </div>
              <div className={styles.detailCell}>
                <span className={styles.metaValue}>
                  <Workflow className="mr-2 inline h-4 w-4" />
                  Etapas do pipeline
                </span>
                <p className={styles.detailText}>A vaga entra no funil pronta para operar sem ajustes posteriores.</p>
              </div>
              <div className={styles.detailCell}>
                <span className={styles.metaValue}>Scorecard consistente</span>
                <p className={styles.detailText}>Entrevistadores avaliam a vaga com a mesma linguagem e critérios.</p>
              </div>
            </div>
          </section>

          <section className={styles.detailPanel}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.panelTitle}>Etapas disponíveis</h3>
            </div>

            <div className={styles.sectionStack}>
              {stages.map((stage, index) => (
                <div key={stage.id} className={styles.detailCell}>
                  <div className={styles.sectionHeader}>
                    <span className={styles.metaValue}>{stage.name}</span>
                    <span className={styles.metaLabel}>#{index + 1}</span>
                  </div>
                  <p className={styles.detailText}>A vaga poderá usar esta etapa assim que for publicada.</p>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
