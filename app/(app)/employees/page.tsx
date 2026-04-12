import { bulkUpdateEmployeeStatusAction, createEmployeeAction, updateEmployeeStatusAction } from "@/app/(app)/employees/actions";
import { deleteSavedViewAction, saveWorkspaceViewAction } from "@/app/(app)/saved-views/actions";
import { EmployeesWorkspace } from "@/components/operations/employees-workspace";
import { hasPermission, requirePermission } from "@/lib/auth/permissions";
import { getSavedViews } from "@/lib/saved-views/queries";
import { listEmployees, listEmployeesForSelect } from "@/modules/employees/queries";
import { SavedViewType } from "@prisma/client";

export default async function EmployeesPage() {
  const user = await requirePermission("view_employees");
  const [employees, managerOptions, savedViews] = await Promise.all([
    listEmployees(user.organizationId),
    listEmployeesForSelect(user.organizationId),
    getSavedViews(user.id, user.organizationId, SavedViewType.EMPLOYEES)
  ]);
  const canManage = hasPermission(user.role, "manage_employees");

  return (
    <EmployeesWorkspace
      employees={employees}
      managerOptions={managerOptions}
      canManage={canManage}
      createEmployeeAction={createEmployeeAction}
      updateEmployeeStatusAction={updateEmployeeStatusAction}
      bulkUpdateEmployeeStatusAction={bulkUpdateEmployeeStatusAction}
      savedViews={savedViews}
      saveWorkspaceViewAction={saveWorkspaceViewAction}
      deleteSavedViewAction={deleteSavedViewAction}
    />
  );
}
