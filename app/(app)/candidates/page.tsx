import { SavedViewType } from "@prisma/client";

import { CandidatesWorkspace } from "@/components/hiring/candidates-workspace";
import { hasPermission } from "@/lib/auth/permissions";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { getCandidates } from "@/lib/candidates/queries";
import { getSavedViews } from "@/lib/saved-views/queries";

import { deleteSavedViewAction, saveWorkspaceViewAction } from "../saved-views/actions";

export default async function CandidatesPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; view?: string; selected?: string }>;
}) {
  const user = await requireCurrentUser();
  const canManageCandidates = hasPermission(user.role, "manage_candidates");
  await searchParams;

  const [candidates, savedViews] = await Promise.all([
    getCandidates(user.organizationId, {
      pageSize: 160
    }),
    getSavedViews(user.id, user.organizationId, SavedViewType.CANDIDATES)
  ]);

  return (
    <CandidatesWorkspace
      candidates={candidates.items}
      canManageCandidates={canManageCandidates}
      savedViews={savedViews}
      saveWorkspaceViewAction={saveWorkspaceViewAction}
      deleteSavedViewAction={deleteSavedViewAction}
    />
  );
}
