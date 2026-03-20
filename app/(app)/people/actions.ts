"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth/permissions";
import { createPeopleTask, updatePeopleTaskStatus, addPeopleTaskComment } from "@/modules/people-tasks/service";
import { peopleTaskCommentSchema, peopleTaskFormSchema, peopleTaskStatusSchema } from "@/modules/people-tasks/validators";
import { updateWorkflowStepStatus } from "@/modules/people-ops/service";
import { workflowStepStatusSchema } from "@/modules/people-ops/validators";

function revalidatePeopleSurface() {
  revalidatePath("/dashboard");
  revalidatePath("/people/command-center");
  revalidatePath("/people/tasks");
  revalidatePath("/people/onboarding");
  revalidatePath("/people/offboarding");
  revalidatePath("/people/calendar");
  revalidatePath("/people/compliance");
}

export async function createPeopleTaskAction(formData: FormData) {
  const user = await requirePermission("manage_people_tasks");
  const parsed = peopleTaskFormSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    assigneeUserId: formData.get("assigneeUserId"),
    assigneeEmployeeId: formData.get("assigneeEmployeeId"),
    relatedEmployeeId: formData.get("relatedEmployeeId"),
    priority: formData.get("priority"),
    dueAt: formData.get("dueAt"),
    sourceType: formData.get("sourceType") || "manual",
    sourceId: formData.get("sourceId")
  });

  if (!parsed.success) {
    return;
  }

  await createPeopleTask({
    organizationId: user.organizationId,
    actorId: user.id,
    data: parsed.data
  });

  revalidatePeopleSurface();
}

export async function updatePeopleTaskStatusAction(formData: FormData) {
  const user = await requirePermission("manage_people_tasks");
  const parsed = peopleTaskStatusSchema.safeParse({
    taskId: formData.get("taskId"),
    status: formData.get("status")
  });

  if (!parsed.success) {
    return;
  }

  await updatePeopleTaskStatus({
    organizationId: user.organizationId,
    actorId: user.id,
    taskId: parsed.data.taskId,
    status: parsed.data.status
  });

  revalidatePeopleSurface();
}

export async function addPeopleTaskCommentAction(formData: FormData) {
  const user = await requirePermission("manage_people_tasks");
  const parsed = peopleTaskCommentSchema.safeParse({
    taskId: formData.get("taskId"),
    message: formData.get("message")
  });

  if (!parsed.success) {
    return;
  }

  await addPeopleTaskComment({
    organizationId: user.organizationId,
    actorId: user.id,
    taskId: parsed.data.taskId,
    message: parsed.data.message
  });

  revalidatePeopleSurface();
}

export async function updateWorkflowStepStatusAction(formData: FormData) {
  const user = await requirePermission("manage_people_workflows");
  const parsed = workflowStepStatusSchema.safeParse({
    stepId: formData.get("stepId"),
    status: formData.get("status")
  });

  if (!parsed.success) {
    return;
  }

  await updateWorkflowStepStatus({
    organizationId: user.organizationId,
    actorId: user.id,
    stepId: parsed.data.stepId,
    status: parsed.data.status
  });

  revalidatePeopleSurface();
}
