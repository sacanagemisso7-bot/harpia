import { SavedViewType } from "@prisma/client";

import { JobsWorkspace } from "@/components/hiring/jobs-workspace";
import { hasPermission } from "@/lib/auth/permissions";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { getJobs } from "@/lib/jobs/queries";
import { getSavedViews } from "@/lib/saved-views/queries";

import { deleteSavedViewAction, saveWorkspaceViewAction } from "../saved-views/actions";

export default async function JobsPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; view?: string; selected?: string }>;
}) {
  const user = await requireCurrentUser();
  const canManageJobs = hasPermission(user.role, "manage_jobs");
  await searchParams;

  const [jobs, savedViews] = await Promise.all([
    getJobs(user.organizationId, {
      pageSize: 160
    }),
    getSavedViews(user.id, user.organizationId, SavedViewType.JOBS)
  ]);

  return (
    <JobsWorkspace
      jobs={jobs.items}
      canManageJobs={canManageJobs}
      savedViews={savedViews}
      saveWorkspaceViewAction={saveWorkspaceViewAction}
      deleteSavedViewAction={deleteSavedViewAction}
    />
  );
}
