import {
  addHrRequestCommentAction,
  bulkUpdateHrRequestStatusAction,
  createHrRequestAction,
  updateHrRequestDetailsAction,
  updateHrRequestStatusAction
} from "@/app/(app)/requests/actions";
import { deleteSavedViewAction, saveWorkspaceViewAction } from "@/app/(app)/saved-views/actions";
import { RequestsWorkspace } from "@/components/operations/requests-workspace";
import { hasPermission, requirePermission } from "@/lib/auth/permissions";
import { getSavedViews } from "@/lib/saved-views/queries";
import { getTeamMembers } from "@/lib/team/queries";
import { listEmployeesForSelect } from "@/modules/employees/queries";
import { getHrRequestQueueSummary } from "@/modules/hr-requests/queries";
import { SavedViewType } from "@prisma/client";

export default async function RequestsPage() {
  const user = await requirePermission("view_hr_requests");
  const [queue, employees, teamMembers, savedViews] = await Promise.all([
    getHrRequestQueueSummary(user.organizationId),
    listEmployeesForSelect(user.organizationId),
    getTeamMembers(user.organizationId),
    getSavedViews(user.id, user.organizationId, SavedViewType.REQUESTS)
  ]);
  const canManage = hasPermission(user.role, "manage_hr_requests");

  return (
    <RequestsWorkspace
      requests={queue.requests}
      metrics={queue.metrics}
      employees={employees}
      teamMembers={teamMembers}
      canManage={canManage}
      createHrRequestAction={createHrRequestAction}
      updateHrRequestStatusAction={updateHrRequestStatusAction}
      bulkUpdateHrRequestStatusAction={bulkUpdateHrRequestStatusAction}
      updateHrRequestDetailsAction={updateHrRequestDetailsAction}
      addHrRequestCommentAction={addHrRequestCommentAction}
      savedViews={savedViews}
      saveWorkspaceViewAction={saveWorkspaceViewAction}
      deleteSavedViewAction={deleteSavedViewAction}
    />
  );
}
