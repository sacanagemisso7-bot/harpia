import {
  addPeopleTaskCommentAction,
  bulkUpdatePeopleTaskStatusAction,
  createPeopleTaskAction,
  updatePeopleTaskDetailsAction,
  updatePeopleTaskStatusAction
} from "@/app/(app)/people/actions";
import { deleteSavedViewAction, saveWorkspaceViewAction } from "@/app/(app)/saved-views/actions";
import { PeopleTasksWorkspace } from "@/components/operations/people-tasks-workspace";
import { hasPermission, requirePermission } from "@/lib/auth/permissions";
import { getSavedViews } from "@/lib/saved-views/queries";
import { getTeamMembers } from "@/lib/team/queries";
import { listEmployeesForSelect } from "@/modules/employees/queries";
import { getPeopleTaskSummary } from "@/modules/people-tasks/queries";
import { SavedViewType } from "@prisma/client";

export default async function PeopleTasksPage() {
  const user = await requirePermission("view_people_tasks");
  const [taskSummary, employees, teamMembers, savedViews] = await Promise.all([
    getPeopleTaskSummary(user.organizationId),
    listEmployeesForSelect(user.organizationId),
    getTeamMembers(user.organizationId),
    getSavedViews(user.id, user.organizationId, SavedViewType.PEOPLE_TASKS)
  ]);
  const canManage = hasPermission(user.role, "manage_people_tasks");

  return (
    <PeopleTasksWorkspace
      tasks={taskSummary.tasks}
      metrics={taskSummary.metrics}
      employees={employees}
      teamMembers={teamMembers}
      canManage={canManage}
      createPeopleTaskAction={createPeopleTaskAction}
      updatePeopleTaskStatusAction={updatePeopleTaskStatusAction}
      bulkUpdatePeopleTaskStatusAction={bulkUpdatePeopleTaskStatusAction}
      updatePeopleTaskDetailsAction={updatePeopleTaskDetailsAction}
      addPeopleTaskCommentAction={addPeopleTaskCommentAction}
      savedViews={savedViews}
      saveWorkspaceViewAction={saveWorkspaceViewAction}
      deleteSavedViewAction={deleteSavedViewAction}
    />
  );
}
