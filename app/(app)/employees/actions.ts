"use server";

import { revalidatePath } from "next/cache";
import { EmployeeStatus, PeopleWorkflowKind } from "@prisma/client";

import { createAuditEvent } from "@/lib/audit/events";
import { requirePermission } from "@/lib/auth/permissions";
import { parseDateInputValue } from "@/lib/dates/parse-date-input";
import { prisma } from "@/lib/prisma/client";
import { createEmployeeCheckIn } from "@/modules/checkins/service";
import { employeeCheckInSchema } from "@/modules/checkins/validators";
import { createEmployee, updateEmployeeStatus } from "@/modules/employees/service";
import { employeeFormSchema } from "@/modules/employees/validators";
import { createWorkflowRunFromTemplate } from "@/modules/people-ops/service";

function revalidateEmployeeSurface(employeeId?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/people/command-center");
  revalidatePath("/employees");
  revalidatePath("/people/onboarding");
  revalidatePath("/people/offboarding");
  revalidatePath("/people/calendar");
  revalidatePath("/people/compliance");
  if (employeeId) {
    revalidatePath(`/employees/${employeeId}`);
  }
}

export async function createEmployeeAction(formData: FormData) {
  const user = await requirePermission("manage_employees");
  const parsed = employeeFormSchema.safeParse({
    fullName: formData.get("fullName"),
    preferredName: formData.get("preferredName"),
    workEmail: formData.get("workEmail"),
    personalEmail: formData.get("personalEmail"),
    phone: formData.get("phone"),
    title: formData.get("title"),
    department: formData.get("department"),
    managerEmployeeId: formData.get("managerEmployeeId"),
    location: formData.get("location"),
    employmentType: formData.get("employmentType"),
    status: formData.get("status"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    notes: formData.get("notes")
  });

  if (!parsed.success) {
    return;
  }

  const employee = await createEmployee({
    organizationId: user.organizationId,
    actorId: user.id,
    data: parsed.data
  });

  revalidateEmployeeSurface(employee.id);
}

export async function updateEmployeeStatusAction(formData: FormData) {
  const user = await requirePermission("manage_employees");
  const employeeId = String(formData.get("employeeId") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!employeeId || !Object.values(EmployeeStatus).includes(status as EmployeeStatus)) {
    return;
  }

  await updateEmployeeStatus({
    organizationId: user.organizationId,
    actorId: user.id,
    employeeId,
    status: status as EmployeeStatus
  });

  revalidateEmployeeSurface(employeeId);
}

export async function updateEmployeeContextAction(formData: FormData) {
  const user = await requirePermission("manage_employees");
  const employeeId = String(formData.get("employeeId") ?? "");

  if (!employeeId) {
    return;
  }

  const employee = await prisma.employee.findFirst({
    where: {
      id: employeeId,
      organizationId: user.organizationId
    },
    select: {
      id: true,
      fullName: true
    }
  });

  if (!employee) {
    return;
  }

  const managerEmployeeIdValue = String(formData.get("managerEmployeeId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const department = String(formData.get("department") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const employmentType = String(formData.get("employmentType") ?? "").trim();
  const workEmail = String(formData.get("workEmail") ?? "").trim();
  const startDate = parseDateInputValue(formData.get("startDate")) ?? null;

  if (!title || !department) {
    return;
  }

  const updated = await prisma.employee.update({
    where: { id: employee.id },
    data: {
      managerEmployeeId: managerEmployeeIdValue && managerEmployeeIdValue !== employee.id ? managerEmployeeIdValue : null,
      title,
      department,
      location: location || null,
      employmentType: employmentType || null,
      workEmail: workEmail || null,
      startDate
    }
  });

  await createAuditEvent({
    organizationId: user.organizationId,
    actorId: user.id,
    action: "employee.context_updated",
    entityType: "employee",
    entityId: updated.id,
    summary: `Contexto de ${updated.fullName} atualizado.`,
    metadata: {
      managerEmployeeId: updated.managerEmployeeId,
      title: updated.title,
      department: updated.department,
      location: updated.location,
      employmentType: updated.employmentType,
      workEmail: updated.workEmail,
      startDate: updated.startDate?.toISOString() ?? null
    }
  });

  revalidateEmployeeSurface(employee.id);
}

export async function bulkUpdateEmployeeStatusAction(formData: FormData) {
  const user = await requirePermission("manage_employees");
  const employeeIds = formData
    .getAll("employeeIds")
    .map((value) => String(value))
    .filter(Boolean);
  const status = String(formData.get("status") ?? "");

  if (!employeeIds.length || !Object.values(EmployeeStatus).includes(status as EmployeeStatus)) {
    return;
  }

  for (const employeeId of employeeIds) {
    await updateEmployeeStatus({
      organizationId: user.organizationId,
      actorId: user.id,
      employeeId,
      status: status as EmployeeStatus
    });
  }

  revalidateEmployeeSurface();
}

export async function createEmployeeCheckInAction(formData: FormData) {
  const user = await requirePermission("manage_checkins");
  const parsed = employeeCheckInSchema.safeParse({
    employeeId: formData.get("employeeId"),
    type: formData.get("type"),
    title: formData.get("title"),
    summary: formData.get("summary"),
    followUpAt: formData.get("followUpAt")
  });

  if (!parsed.success) {
    return;
  }

  await createEmployeeCheckIn({
    organizationId: user.organizationId,
    actorId: user.id,
    data: parsed.data
  });

  revalidateEmployeeSurface(parsed.data.employeeId);
}

export async function startEmployeeWorkflowAction(formData: FormData) {
  const user = await requirePermission("manage_people_workflows");
  const employeeId = String(formData.get("employeeId") ?? "");
  const kind = String(formData.get("kind") ?? "") as PeopleWorkflowKind;

  if (!employeeId || !kind) {
    return;
  }

  await createWorkflowRunFromTemplate({
    organizationId: user.organizationId,
    employeeId,
    createdById: user.id,
    kind
  });

  revalidateEmployeeSurface(employeeId);
}
