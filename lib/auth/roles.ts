import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/lib/auth/current-user";

export const roleOrder: Record<UserRole, number> = {
  OWNER: 8,
  ADMIN: 7,
  PEOPLE_ADMIN: 6,
  PEOPLE_OPS: 5,
  MANAGER: 4,
  RECRUITER: 3,
  HIRING_MANAGER: 2,
  EMPLOYEE: 1
};

export function hasMinimumRole(role: string, minimumRole: UserRole) {
  const normalizedRole = role as UserRole;
  return (roleOrder[normalizedRole] ?? 0) >= roleOrder[minimumRole];
}

export function getRoleLabel(role: UserRole) {
  return (
    {
      OWNER: "Owner",
      ADMIN: "Admin",
      PEOPLE_ADMIN: "People Admin",
      PEOPLE_OPS: "People Ops",
      MANAGER: "Manager",
      RECRUITER: "Recruiter",
      HIRING_MANAGER: "Hiring Manager",
      EMPLOYEE: "Employee"
    } satisfies Record<UserRole, string>
  )[role];
}

export function getAssignableRoles(actorRole: string) {
  const normalizedRole = actorRole as UserRole;

  if (normalizedRole === UserRole.OWNER) {
    return [
      UserRole.OWNER,
      UserRole.ADMIN,
      UserRole.PEOPLE_ADMIN,
      UserRole.PEOPLE_OPS,
      UserRole.MANAGER,
      UserRole.RECRUITER,
      UserRole.HIRING_MANAGER,
      UserRole.EMPLOYEE
    ];
  }

  if (normalizedRole === UserRole.ADMIN) {
    return [
      UserRole.PEOPLE_ADMIN,
      UserRole.PEOPLE_OPS,
      UserRole.MANAGER,
      UserRole.RECRUITER,
      UserRole.HIRING_MANAGER,
      UserRole.EMPLOYEE
    ];
  }

  if (normalizedRole === UserRole.PEOPLE_ADMIN) {
    return [UserRole.PEOPLE_OPS, UserRole.MANAGER, UserRole.EMPLOYEE];
  }

  return [];
}

export function canAssignRole(actorRole: string, nextRole: UserRole) {
  return getAssignableRoles(actorRole).includes(nextRole);
}

export function canManageTeamMember(actorRole: string, targetRole: string) {
  const normalizedActor = actorRole as UserRole;
  const normalizedTarget = targetRole as UserRole;

  if (normalizedActor === UserRole.OWNER) {
    return true;
  }

  if (normalizedActor === UserRole.ADMIN) {
    return normalizedTarget !== UserRole.OWNER && normalizedTarget !== UserRole.ADMIN;
  }

  if (normalizedActor === UserRole.PEOPLE_ADMIN) {
    return normalizedTarget === UserRole.PEOPLE_OPS || normalizedTarget === UserRole.MANAGER || normalizedTarget === UserRole.EMPLOYEE;
  }

  return false;
}

export async function requireMinimumRole(minimumRole: UserRole) {
  const user = await requireCurrentUser();

  if (!hasMinimumRole(user.role, minimumRole)) {
    redirect("/dashboard");
  }

  return user;
}

export async function requireOneOfRoles(roles: UserRole[]) {
  const user = await requireCurrentUser();

  if (!roles.some((role) => role === user.role)) {
    redirect("/dashboard");
  }

  return user;
}
