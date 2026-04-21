"use server";

import { PeopleTaskPriority } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { buildPeopleTaskResolveAssist } from "@/lib/ai/resolve-assist";
import { createAuditEvent } from "@/lib/audit/events";
import { requirePermission } from "@/lib/auth/permissions";
import { parseDateInputValue } from "@/lib/dates/parse-date-input";
import { prisma } from "@/lib/prisma/client";
import { applyAgentAction } from "@/modules/ai-agent/service";
import { createPeopleTask, updatePeopleTaskStatus, addPeopleTaskComment } from "@/modules/people-tasks/service";
import { peopleTaskCommentSchema, peopleTaskFormSchema, peopleTaskStatusSchema } from "@/modules/people-tasks/validators";
import { updateWorkflowStepStatus } from "@/modules/people-ops/service";
import { workflowStepStatusSchema } from "@/modules/people-ops/validators";
import type { AiResolveActionState } from "@/types/ai-resolve";

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

export async function bulkUpdatePeopleTaskStatusAction(formData: FormData) {
  const user = await requirePermission("manage_people_tasks");
  const taskIds = formData
    .getAll("taskIds")
    .map((value) => String(value))
    .filter(Boolean);
  const status = formData.get("status");

  if (!taskIds.length || typeof status !== "string") {
    return;
  }

  const parsed = peopleTaskStatusSchema.shape.status.safeParse(status);

  if (!parsed.success) {
    return;
  }

  for (const taskId of taskIds) {
    await updatePeopleTaskStatus({
      organizationId: user.organizationId,
      actorId: user.id,
      taskId,
      status: parsed.data
    });
  }

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

export async function updatePeopleTaskDetailsAction(formData: FormData) {
  const user = await requirePermission("manage_people_tasks");
  const taskId = String(formData.get("taskId") ?? "");
  const assigneeUserId = String(formData.get("assigneeUserId") ?? "").trim();
  const priority = String(formData.get("priority") ?? "");
  const dueAt = parseDateInputValue(formData.get("dueAt")) ?? null;

  if (!taskId || !Object.values(PeopleTaskPriority).includes(priority as PeopleTaskPriority)) {
    return;
  }

  const task = await prisma.peopleTask.findFirst({
    where: {
      id: taskId,
      organizationId: user.organizationId
    },
    select: {
      id: true,
      title: true
    }
  });

  if (!task) {
    return;
  }

  const updated = await prisma.peopleTask.update({
    where: { id: task.id },
    data: {
      assigneeUserId: assigneeUserId || null,
      priority: priority as PeopleTaskPriority,
      dueAt
    }
  });

  await createAuditEvent({
    organizationId: user.organizationId,
    actorId: user.id,
    action: "people_task.details_updated",
    entityType: "people_task",
    entityId: updated.id,
    summary: `Contexto da tarefa ${updated.title} atualizado.`,
    metadata: {
      assigneeUserId: updated.assigneeUserId,
      priority: updated.priority,
      dueAt: updated.dueAt?.toISOString() ?? null
    }
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

export async function resolvePeopleTaskWithAiAction(
  _previousState: AiResolveActionState,
  formData: FormData
): Promise<AiResolveActionState> {
  const user = await requirePermission("manage_people_tasks");
  const taskId = String(formData.get("taskId") ?? "");
  const mode = formData.get("mode") === "approval" ? "approval" : "apply";

  if (!taskId) {
    return {
      error: "Tarefa inválida.",
      mode
    };
  }

  const task = await prisma.peopleTask.findFirst({
    where: {
      id: taskId,
      organizationId: user.organizationId
    },
    select: {
      id: true,
      title: true,
      description: true,
      priority: true,
      status: true,
      sourceType: true,
      dueAt: true,
      assigneeUser: {
        select: {
          name: true
        }
      },
      assigneeEmployee: {
        select: {
          fullName: true
        }
      },
      relatedEmployee: {
        select: {
          fullName: true
        }
      },
      comments: {
        select: {
          id: true
        }
      }
    }
  });

  if (!task) {
    return {
      error: "Tarefa não encontrada.",
      mode
    };
  }

  const assist = buildPeopleTaskResolveAssist({
    title: task.title,
    description: task.description,
    priority: task.priority,
    status: task.status,
    sourceType: task.sourceType,
    isOverdue: !!task.dueAt && task.dueAt.getTime() < Date.now() && task.status !== "DONE",
    relatedEmployeeName: task.relatedEmployee?.fullName ?? null,
    assigneeName: task.assigneeUser?.name ?? task.assigneeEmployee?.fullName ?? null,
    commentCount: task.comments.length
  });

  const parsedStatus = peopleTaskStatusSchema.shape.status.safeParse(String(formData.get("status") ?? assist.suggestedStatus));

  if (!parsedStatus.success) {
    return {
      error: "Status sugerido inválido.",
      mode
    };
  }

  const requestedStatus = parsedStatus.data;
  const note = String(formData.get("note") ?? "").trim() || assist.draftNote;

  try {
    if (mode === "approval") {
      const result = await applyAgentAction({
        organizationId: user.organizationId,
        userId: user.id,
        userRole: user.role,
        type: "resolve_people_task",
        payload: {
          taskId: task.id,
          status: requestedStatus,
          note
        },
        goal: `Resolver a tarefa ${task.title} com apoio da IA.`
      });

      await createAuditEvent({
        organizationId: user.organizationId,
        actorId: user.id,
        action: "people_task.ai_resolution_requested",
        entityType: "people_task",
        entityId: task.id,
        summary: result.summary,
        metadata: {
          mode,
          status: requestedStatus
        }
      });

      revalidatePeopleSurface();

      return {
        success: result.summary,
        mode
      };
    }

    const updated = await updatePeopleTaskStatus({
      organizationId: user.organizationId,
      actorId: user.id,
      taskId: task.id,
      status: requestedStatus
    });

    await addPeopleTaskComment({
      organizationId: user.organizationId,
      actorId: user.id,
      taskId: task.id,
      message: note
    });

    await createAuditEvent({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "people_task.ai_resolution_applied",
      entityType: "people_task",
      entityId: task.id,
      summary: `Encaminhamento assistido aplicado em ${updated.title}.`,
      metadata: {
        status: updated.status
      }
    });

    revalidatePeopleSurface();

    return {
      success: `Encaminhamento aplicado em ${updated.title}.`,
      mode
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Não foi possível concluir a ação assistida agora.",
      mode
    };
  }
}
