import { SavedViewType } from "@prisma/client";
import Link from "next/link";

import { ApplicationStageForm } from "@/components/applications/application-stage-form";
import { FilterBar } from "@/components/layout/filter-bar";
import { PageHeader } from "@/components/layout/page-header";
import { SavedViewForm } from "@/components/saved-views/saved-view-form";
import { SavedViewList } from "@/components/saved-views/saved-view-list";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pipeline"
        title="Board operacional do processo seletivo"
        description="Movimente candidaturas entre etapas, acompanhe score e mantenha o time alinhado sobre o estado real do funil."
      />

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

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <SavedViewForm action={createSavedView} query={query} type={SavedViewType.PIPELINE} />
        <SavedViewList title="Views salvas" views={savedViews} basePath="/pipeline" />
      </section>

      <section className="grid gap-5 xl:grid-cols-5">
        {board.map((stage) => (
          <Card key={stage.id} className="panel-hover flex min-h-[520px] flex-col">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>{stage.name}</CardTitle>
                  <CardDescription>{stage.currentFor.length} candidaturas</CardDescription>
                </div>
                <Badge variant={stage.isTerminal ? "destructive" : stage.isDefault ? "success" : "outline"}>
                  {stage.currentFor.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
              {stage.currentFor.length ? (
                stage.currentFor.map((application) => (
                  <div key={application.id} className="rounded-[1.35rem] border border-border/70 bg-white/75 p-4">
                    <div className="space-y-3">
                      <div>
                        <Link href={`/applications/${application.id}`} className="font-semibold hover:text-primary">
                          {application.candidate.fullName}
                        </Link>
                        <p className="text-sm text-muted-foreground">{application.job.title}</p>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <Badge variant="outline">{formatScore(application.score)}</Badge>
                        <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                          {application.candidate.currentTitle || "Perfil"}
                        </span>
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
                  </div>
                ))
              ) : (
                <div className="rounded-[1.35rem] border border-dashed border-border bg-white/75 p-4 text-sm text-muted-foreground">
                  Nenhuma candidatura nesta etapa.
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
