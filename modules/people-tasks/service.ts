import { PeopleTaskStatus } from "@prisma/client";

import { createAuditEvent } from "@/lib/audit/events";
import { prisma } from "@/lib/prisma/client";
import type { PeopleTaskFormInput } from "@/modules/people-tasks/validators";

export async function createPeopleTask(input: {
  organizationId: string;
  actorId: string;
  data: PeopleTaskFormInput;
}) {
  const task = await prisma.peopleTask.create({
    data: {
      organizationId: input.organizationId,
      title: input.data.title,
      description: input.data.description ?? null,
      assigneeUserId: input.data.assigneeUserId ?? null,
      assigneeEmployeeId: input.data.assigneeEmployeeId ?? null,
      relatedEmployeeId: input.data.relatedEmployeeId ?? null,
      createdById: input.actorId,
      sourceType: input.data.sourceType,
      sourceId: input.data.sourceId ?? null,
      priority: input.data.priority,
      dueAt: input.data.dueAt ?? null
    }
  });

  await createAuditEvent({
    organizationId: input.organizationId,
    actorId: input.actorId,
    action: "people_task.created",
    entityType: "people_task",
    entityId: task.id,
    summary: `Tarefa operacional criada: ${task.title}.`,
    metadata: {
      priority: task.priority,
      sourceType: task.sourceType
    }
  });

  return task;
}

export async function updatePeopleTaskStatus(input: {
  organizationId: string;
  actorId: string;
  taskId: string;
  status: PeopleTaskStatus;
}) {
  const task = await prisma.peopleTask.findFirst({
    where: {
      id: input.taskId,
      organizationId: input.organizationId
    }
  });

  if (!task) {
    throw new Error("Tarefa não encontrada.");
  }

  const updated = await prisma.peopleTask.update({
    where: {
      id: task.id
    },
    data: {
      status: input.status,
      completedAt: input.status === PeopleTaskStatus.DONE ? new Date() : null
    }
  });

  await createAuditEvent({
    organizationId: input.organizationId,
    actorId: input.actorId,
    action: "people_task.status_updated",
    entityType: "people_task",
    entityId: updated.id,
    summary: `Tarefa ${updated.title} atualizada para ${updated.status}.`,
    metadata: {
      status: updated.status
    }
  });

  return updated;
}

export async function addPeopleTaskComment(input: {
  organizationId: string;
  actorId: string;
  taskId: string;
  message: string;
}) {
  const task = await prisma.peopleTask.findFirst({
    where: {
      id: input.taskId,
      organizationId: input.organizationId
    }
  });

  if (!task) {
    throw new Error("Tarefa não encontrada.");
  }

  const comment = await prisma.peopleTaskComment.create({
    data: {
      organizationId: input.organizationId,
      taskId: task.id,
      authorId: input.actorId,
      message: input.message
    }
  });

  await createAuditEvent({
    organizationId: input.organizationId,
    actorId: input.actorId,
    action: "people_task.comment_added",
    entityType: "people_task",
    entityId: task.id,
    summary: `Comentario adicionado na tarefa ${task.title}.`
  });

  return comment;
}

export function isTaskOverdue(task: {
  dueAt: Date | null;
  status: PeopleTaskStatus;
}) {
  return !!task.dueAt && task.dueAt.getTime() < Date.now() && task.status !== PeopleTaskStatus.DONE;
}
