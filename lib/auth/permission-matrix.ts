import { UserRole } from "@prisma/client";

export type AppPermission =
  | "view_analytics"
  | "view_pipeline"
  | "view_interviews"
  | "view_ops_inbox"
  | "view_people_command_center"
  | "view_chat"
  | "review_agent_approvals"
  | "view_employees"
  | "manage_employees"
  | "view_hr_requests"
  | "manage_hr_requests"
  | "view_people_tasks"
  | "manage_people_tasks"
  | "view_people_calendar"
  | "view_compliance"
  | "manage_compliance"
  | "manage_people_workflows"
  | "manage_checkins"
  | "manage_knowledge"
  | "manage_jobs"
  | "manage_candidates"
  | "manage_applications"
  | "manage_interviews"
  | "submit_interview_feedback"
  | "manage_communications"
  | "manage_workspace"
  | "manage_team"
  | "create_hiring_notes"
  | "save_views";

const permissionMatrix: Record<AppPermission, UserRole[]> = {
  view_analytics: [
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.PEOPLE_ADMIN,
    UserRole.PEOPLE_OPS,
    UserRole.MANAGER,
    UserRole.RECRUITER,
    UserRole.HIRING_MANAGER
  ],
  view_pipeline: [UserRole.OWNER, UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER],
  view_interviews: [UserRole.OWNER, UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER],
  view_ops_inbox: [
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.PEOPLE_ADMIN,
    UserRole.PEOPLE_OPS,
    UserRole.MANAGER,
    UserRole.RECRUITER,
    UserRole.HIRING_MANAGER
  ],
  view_people_command_center: [
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.PEOPLE_ADMIN,
    UserRole.PEOPLE_OPS,
    UserRole.MANAGER,
    UserRole.RECRUITER,
    UserRole.HIRING_MANAGER
  ],
  view_chat: [
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.PEOPLE_ADMIN,
    UserRole.PEOPLE_OPS,
    UserRole.MANAGER,
    UserRole.RECRUITER,
    UserRole.HIRING_MANAGER
  ],
  review_agent_approvals: [UserRole.OWNER, UserRole.ADMIN, UserRole.PEOPLE_ADMIN, UserRole.PEOPLE_OPS, UserRole.MANAGER],
  view_employees: [UserRole.OWNER, UserRole.ADMIN, UserRole.PEOPLE_ADMIN, UserRole.PEOPLE_OPS, UserRole.MANAGER],
  manage_employees: [UserRole.OWNER, UserRole.ADMIN, UserRole.PEOPLE_ADMIN, UserRole.PEOPLE_OPS],
  view_hr_requests: [UserRole.OWNER, UserRole.ADMIN, UserRole.PEOPLE_ADMIN, UserRole.PEOPLE_OPS, UserRole.MANAGER],
  manage_hr_requests: [UserRole.OWNER, UserRole.ADMIN, UserRole.PEOPLE_ADMIN, UserRole.PEOPLE_OPS, UserRole.MANAGER],
  view_people_tasks: [UserRole.OWNER, UserRole.ADMIN, UserRole.PEOPLE_ADMIN, UserRole.PEOPLE_OPS, UserRole.MANAGER],
  manage_people_tasks: [UserRole.OWNER, UserRole.ADMIN, UserRole.PEOPLE_ADMIN, UserRole.PEOPLE_OPS, UserRole.MANAGER],
  view_people_calendar: [UserRole.OWNER, UserRole.ADMIN, UserRole.PEOPLE_ADMIN, UserRole.PEOPLE_OPS, UserRole.MANAGER],
  view_compliance: [UserRole.OWNER, UserRole.ADMIN, UserRole.PEOPLE_ADMIN, UserRole.PEOPLE_OPS, UserRole.MANAGER],
  manage_compliance: [UserRole.OWNER, UserRole.ADMIN, UserRole.PEOPLE_ADMIN, UserRole.PEOPLE_OPS, UserRole.MANAGER],
  manage_people_workflows: [UserRole.OWNER, UserRole.ADMIN, UserRole.PEOPLE_ADMIN, UserRole.PEOPLE_OPS],
  manage_checkins: [UserRole.OWNER, UserRole.ADMIN, UserRole.PEOPLE_ADMIN, UserRole.PEOPLE_OPS, UserRole.MANAGER],
  manage_knowledge: [UserRole.OWNER, UserRole.ADMIN, UserRole.PEOPLE_ADMIN, UserRole.PEOPLE_OPS, UserRole.RECRUITER],
  manage_jobs: [UserRole.OWNER, UserRole.ADMIN, UserRole.RECRUITER],
  manage_candidates: [UserRole.OWNER, UserRole.ADMIN, UserRole.RECRUITER],
  manage_applications: [UserRole.OWNER, UserRole.ADMIN, UserRole.RECRUITER],
  manage_interviews: [UserRole.OWNER, UserRole.ADMIN, UserRole.RECRUITER],
  submit_interview_feedback: [UserRole.OWNER, UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER],
  manage_communications: [UserRole.OWNER, UserRole.ADMIN],
  manage_workspace: [UserRole.OWNER, UserRole.ADMIN],
  manage_team: [UserRole.OWNER, UserRole.ADMIN, UserRole.PEOPLE_ADMIN],
  create_hiring_notes: [UserRole.OWNER, UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER],
  save_views: [
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.PEOPLE_ADMIN,
    UserRole.PEOPLE_OPS,
    UserRole.MANAGER,
    UserRole.RECRUITER,
    UserRole.HIRING_MANAGER
  ]
};

export function hasPermission(role: string, permission: AppPermission) {
  const normalizedRole = role as UserRole;
  return permissionMatrix[permission].includes(normalizedRole);
}

export function getPermissionsForRole(role: string) {
  return (Object.keys(permissionMatrix) as AppPermission[]).filter((permission) => hasPermission(role, permission));
}
