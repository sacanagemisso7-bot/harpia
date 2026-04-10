import { Orbit, Sparkles, Workflow } from "lucide-react";

import { JobForm } from "@/components/jobs/job-form";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { requirePermission } from "@/lib/auth/permissions";
import { hasPlanFeature } from "@/lib/billing/features";
import { getPipelineStages } from "@/lib/pipeline/queries";

import styles from "../../workspace-expansion.module.css";
import { createJob } from "../actions";

export default async function NewJobPage() {
  const user = await requirePermission("manage_jobs");
  const stages = await getPipelineStages(user.organizationId);
  const canUseAutomations = hasPlanFeature(user.organizationBillingPlan, "job_automations");

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Hiring setup"
        title="Nova vaga"
        description="Abra a vaga com criterio claro, scorecard consistente e pipeline pronto para operar."
        actions={
          <>
            <Badge variant="outline">{user.organizationBillingPlan}</Badge>
            <Badge variant={canUseAutomations ? "success" : "outline"}>
              {canUseAutomations ? "Automacoes liberadas" : "Automacoes em Growth"}
            </Badge>
          </>
        }
      />

      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Pipeline</span>
          <strong className={styles.statValue}>{stages.length}</strong>
          <span className={styles.statHint}>Etapas prontas para receber a vaga.</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Automacao</span>
          <strong className={styles.statValue}>{canUseAutomations ? "ON" : "OFF"}</strong>
          <span className={styles.statHint}>Regras por vaga entram quando o plano permitir.</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Scorecard</span>
          <strong className={styles.statValue}>5+</strong>
          <span className={styles.statHint}>Sugestao de eixos para entrevista estruturada.</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Launch mode</span>
          <strong className={styles.statValue}>Live</strong>
          <span className={styles.statHint}>Publicou, a operacao ja pode triar e entrevistar.</span>
        </div>
      </section>

      <section className={styles.detailLayout}>
        <div className={styles.column}>
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Setup</span>
              <h2 className={styles.panelTitle}>Estruture a vaga uma vez e opere com menos retrabalho.</h2>
              <p className={styles.panelDescription}>
                Defina o sinal de aderencia, o roteiro de entrevista e as automacoes que movem o pipeline.
              </p>
            </div>

            <JobForm action={createJob} stages={stages} canUseAutomations={canUseAutomations} submitLabel="Criar vaga" />
          </div>
        </div>

        <aside className={styles.stickyAside}>
          <div className={styles.panel}>
            <div className={styles.itemHeader}>
              <div className={styles.itemLead}>
                <span className={styles.panelEyebrow}>Playbook</span>
                <h3 className={styles.panelTitle}>O que fica pronto ao publicar</h3>
              </div>
              <span className={styles.iconLead}>
                <Orbit className="h-4 w-4" />
              </span>
            </div>
            <div className={styles.list}>
              <div className={styles.listItem}>
                <strong className={styles.itemTitle}>Criterios para score</strong>
                <span className={styles.itemDescription}>Base para triagem, ranking e analise automatica.</span>
              </div>
              <div className={styles.listItem}>
                <strong className={styles.itemTitle}>Scorecard por eixo</strong>
                <span className={styles.itemDescription}>Entrevistadores avaliam a mesma vaga com a mesma regua.</span>
              </div>
              <div className={styles.listItem}>
                <strong className={styles.itemTitle}>Pipeline padronizado</strong>
                <span className={styles.itemDescription}>A candidatura entra organizada desde o primeiro dia.</span>
              </div>
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.itemHeader}>
              <div className={styles.itemLead}>
                <span className={styles.panelEyebrow}>Pipeline</span>
                <h3 className={styles.panelTitle}>Etapas disponiveis</h3>
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
                <span className={styles.panelEyebrow}>Assistencia</span>
                <h3 className={styles.panelTitle}>Melhor resultado</h3>
              </div>
              <span className={styles.iconLead}>
                <Sparkles className="h-4 w-4" />
              </span>
            </div>
            <div className={styles.metricStack}>
              <div className={styles.metricRow}>
                <span>Resumo da vaga</span>
                <strong>curto</strong>
              </div>
              <div className={styles.metricRow}>
                <span>Criterios obrigatorios</span>
                <strong>3-5</strong>
              </div>
              <div className={styles.metricRow}>
                <span>Itens de scorecard</span>
                <strong>4-6</strong>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
