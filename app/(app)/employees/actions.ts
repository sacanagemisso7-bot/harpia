"use server";

import { revalidatePath } from "next/cache";
import { PeopleWorkflowKind } from "@prisma/client";

import { requirePermission } from "@/lib/auth/permissions";
import { createEmployeeCheckIn } from "@/modules/checkins/service";
import { employeeCheckInSchema } from "@/modules/checkins/validators";
import { createEmployee } from "@/modules/employees/service";
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
