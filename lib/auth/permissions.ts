import type { Route } from "next";
import { redirect } from "next/navigation";

import { hasPermission, type AppPermission, getPermissionsForRole } from "@/lib/auth/permission-matrix";
import { requireCurrentUser } from "@/lib/auth/current-user";
export { hasPermission, getPermissionsForRole, type AppPermission } from "@/lib/auth/permission-matrix";

export async function requirePermission(permission: AppPermission) {
  const user = await requireCurrentUser();

  if (!hasPermission(user.role, permission)) {
    redirect((user.role === "EMPLOYEE" ? "/me/policies" : "/dashboard") as Route);
  }

  return user;
}
