import { SavedViewType } from "@prisma/client";

import { PipelineWorkspace } from "@/components/hiring/pipeline-workspace";
import { hasPermission, requirePermission } from "@/lib/auth/permissions";
import { getPipelineBoard } from "@/lib/applications/queries";
import { getJobs } from "@/lib/jobs/queries";
import { getPipelineStages } from "@/lib/pipeline/queries";
import { getSavedViews } from "@/lib/saved-views/queries";

import { moveApplicationStage } from "../applications/actions";
import { deleteSavedViewAction, saveWorkspaceViewAction } from "../saved-views/actions";

export default async function PipelinePage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; jobId?: string; view?: string; selected?: string }>;
}) {
  const user = await requirePermission("view_pipeline");
  const canManageApplications = hasPermission(user.role, "manage_applications");
  await searchParams;

  const [board, stages, jobs, savedViews] = await Promise.all([
    getPipelineBoard(user.organizationId),
    getPipelineStages(user.organizationId),
    getJobs(user.organizationId, {
      status: "OPEN",
      pageSize: 120
    }),
    getSavedViews(user.id, user.organizationId, SavedViewType.PIPELINE)
  ]);

  return (
    <PipelineWorkspace
      board={board}
      stages={stages}
      jobs={jobs.items.map((job) => ({ id: job.id, title: job.title }))}
      canManageApplications={canManageApplications}
      savedViews={savedViews}
      moveApplicationStageAction={moveApplicationStage}
      saveWorkspaceViewAction={saveWorkspaceViewAction}
      deleteSavedViewAction={deleteSavedViewAction}
    />
  );
}
