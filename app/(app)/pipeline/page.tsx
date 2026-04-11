import { SavedViewType } from "@prisma/client";
import Link from "next/link";

import styles from "../workspace-expansion.module.css";
import { ApplicationStageForm } from "@/components/applications/application-stage-form";
import { FilterBar } from "@/components/layout/filter-bar";
import { PageHeader } from "@/components/layout/page-header";
import { SavedViewForm } from "@/components/saved-views/saved-view-form";
import { SavedViewList } from "@/components/saved-views/saved-view-list";
import { Badge } from "@/components/ui/badge";
import { hasPermission, requirePermission } from "@/lib/auth/permissions";
import { getPipelineBoard } from "@/lib/applications/queries";
import { getJobs } from "@/lib/jobs/queries";
import { getPipelineStages } from "@/lib/pipeline/queries";
import { getSavedViews } from "@/lib/saved-views/queries";
import { formatScore } from "@/lib/utils";

import { moveApplicationStage } from "../applications/actions";
import { createSavedView } from "../saved-views/actions";

export default async function PipelinePage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; jobId?: string }>;
}) {
  const user = await requirePermission("view_pipeline");
  const canManageApplications = hasPermission(user.role, "manage_applications");
  const filters = await searchParams;
  const query = new URLSearchParams(
    Object.entries(filters).filter(([, value]) => typeof value === "string" && value.length > 0) as Array<[string, string]>
  ).toString();
  const [board, stages, jobs, savedViews] = await Promise.all([
    getPipelineBoard(user.organizationId, {
      q: filters.q,
      jobId: filters.jobId
    }),
    getPipelineStages(user.organizationId),
    getJobs(user.organizationId, {
      status: "OPEN"
    }),
    getSavedViews(user.id, user.organizationId, SavedViewType.PIPELINE)
  ]);

  const totalApplications = board.reduce((total, stage) => total + stage.currentFor.length, 0);
  const activeStages = board.filter((stage) => stage.currentFor.length > 0).length;
  const terminalStages = board.filter((stage) => stage.isTerminal).length;
  const heaviestStages = [...board].sort((left, right) => right.currentFor.length - left.currentFor.length).slice(0, 4);

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Pipeline"
        title="Board operacional do processo seletivo"
        description="Movimente candidaturas entre etapas, acompanhe score e mantenha o time alinhado sobre o estado real do funil."
      />

      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Aplicações</span>
          <strong className={styles.statValue}>{totalApplications}</strong>
          <p className={styles.statHint}>Volume visivel no board atual</p>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Etapas ativas</span>
          <strong className={styles.statValue}>{activeStages}</strong>
          <p className={styles.statHint}>Colunas com pelo menos uma candidatura</p>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Terminal</span>
          <strong className={styles.statValue}>{terminalStages}</strong>
          <p className={styles.statHint}>Etapas finais configuradas no pipeline</p>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Vagas abertas</span>
          <strong className={styles.statValue}>{jobs.items.length}</strong>
          <p className={styles.statHint}>Opcoes disponíveis no filtro atual</p>
        </div>
      </section>

      <div className={styles.layout}>
        <div className={styles.column}>
          <FilterBar
            q={filters.q}
            resetHref="/pipeline"
            placeholder="Buscar por candidato, cargo ou vaga"
            selects={[
              {
                name: "jobId",
                label: "Vaga",
                placeholder: "Todas as vagas abertas",
                value: filters.jobId,
                options: jobs.items.map((job) => ({
                  label: job.title,
                  value: job.id
                }))
              }
            ]}
          />

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Pipeline board</span>
              <h2 className={styles.panelTitle}>Estado atual do funil</h2>
              <p className={styles.panelDescription}>Cada etapa mostra volume, score e a capacidade do time de mover aplicações sem sair da propria tela.</p>
            </div>

            <div className={styles.boardWrap}>
              <div className={styles.boardGrid}>
                {board.map((stage) => (
                  <div key={stage.id} className={styles.boardColumn}>
                    <div className={styles.boardColumnHead}>
                      <div className={styles.boardColumnCopy}>
                        <strong>{stage.name}</strong>
                        <span>{stage.currentFor.length} candidatura(s)</span>
                      </div>
                      <Badge variant={stage.isTerminal ? "destructive" : stage.isDefault ? "success" : "outline"}>
                        {stage.currentFor.length}
                      </Badge>
                    </div>

                    <div className={styles.boardList}>
                      {stage.currentFor.length ? (
                        stage.currentFor.map((application) => (
                          <div key={application.id} className={styles.boardCard}>
                            <div className={styles.itemLead}>
                              <Link href={`/applications/${application.id}`} className={styles.itemTitle}>
                                {application.candidate.fullName}
                              </Link>
                              <span className={styles.itemMeta}>{application.job.title}</span>
                            </div>

                            <div className={styles.boardCardMeta}>
                              <Badge variant="outline">{formatScore(application.score)}</Badge>
                              <span>{application.candidate.currentTitle || "Perfil"}</span>
                            </div>

                            {canManageApplications ? (
                              <ApplicationStageForm
                                compact
                                stages={stages}
                                currentStageId={application.currentStageId}
                                action={moveApplicationStage.bind(null, application.id)}
                              />
                            ) : null}
                          </div>
                        ))
                      ) : (
                        <div className={styles.emptyState}>Nenhuma candidatura nesta etapa.</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        <aside className={styles.column}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Views</span>
              <h2 className={styles.panelTitle}>Salvar leitura atual</h2>
              <p className={styles.panelDescription}>Guarde visoes por vaga ou por fase do funil para o time reabrir com um clique.</p>
            </div>

            <SavedViewForm action={createSavedView} query={query} type={SavedViewType.PIPELINE} />
            <SavedViewList title="Views salvas" views={savedViews} basePath="/pipeline" />
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Leitura r?pida</span>
              <h2 className={styles.panelTitle}>Etapas mais carregadas</h2>
              <p className={styles.panelDescription}>Use esta leitura para saber onde o funil esta acumulando volume e onde vale atacar primeiro.</p>
            </div>

            <div className={styles.list}>
              {heaviestStages.map((stage) => (
                <div key={stage.id} className={styles.listItem}>
                  <div className={styles.rowBetween}>
                    <strong className={styles.itemTitle}>{stage.name}</strong>
                    <Badge variant="outline">{stage.currentFor.length}</Badge>
                  </div>
                  <p className={styles.itemDescription}>
                    {stage.isTerminal ? "Etapa terminal." : stage.isDefault ? "Etapa padrao do fluxo." : "Etapa intermedi?ria do pipeline."}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
