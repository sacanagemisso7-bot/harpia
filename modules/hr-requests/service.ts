import { HrRequestStatus, PeopleTaskPriority, SlaStatus } from "@prisma/client";

import { createAuditEvent } from "@/lib/audit/events";
import { prisma } from "@/lib/prisma/client";
import type { HrRequestFormInput } from "@/modules/hr-requests/validators";

export function getEffectiveSlaStatus(input: {
  dueAt: Date | null;
  status: HrRequestStatus;
}) {
  if (input.status === HrRequestStatus.RESOLVED || input.status === HrRequestStatus.CANCELED) {
    return SlaStatus.ON_TRACK;
  }

  if (!input.dueAt) {
    return SlaStatus.ON_TRACK;
  }

  const now = Date.now();
  const dueAt = input.dueAt.getTime();

  if (dueAt <= now) {
    return SlaStatus.BREACHED;
  }

  if (dueAt - now <= 1000 * 60 * 60 * 24) {
    return SlaStatus.AT_RISK;
  }

  return SlaStatus.ON_TRACK;
}

export async function createHrRequest(input: {
  organizationId: string;
  actorId: string;
  data: HrRequestFormInput;
}) {
  const request = await prisma.hrRequest.create({
    data: {
      organizationId: input.organizationId,
      requesterUserId: input.actorId,
      requesterEmployeeId: input.data.requesterEmployeeId ?? null,
      assigneeUserId: input.data.assigneeUserId ?? null,
      title: input.data.title,
      description: input.data.description,
      category: input.data.category,
      priority: input.data.priority,
      dueAt: input.data.dueAt ?? null,
      slaStatus: getEffectiveSlaStatus({
        dueAt: input.data.dueAt ?? null,
        status: HrRequestStatus.OPEN
      })
    }
  });

  await createAuditEvent({
    organizationId: input.organizationId,
    actorId: input.actorId,
    action: "hr_request.created",
    entityType: "hr_request",
    entityId: request.id,
    summary: `Solicitacao interna criada: ${request.title}.`,
    metadata: {
      category: request.category,
      priority: request.priority
    }
  });

  return request;
}

export async function updateHrRequestStatus(input: {
  organizationId: string;
  actorId: string;
  requestId: string;
  status: HrRequestStatus;
}) {
  const request = await prisma.hrRequest.findFirst({
    where: {
      id: input.requestId,
      organizationId: input.organizationId
    }
  });

  if (!request) {
    throw new Error("Solicitacao nao encontrada.");
  }

  const nextFirstResponseAt =
    !request.firstResponseAt && input.status !== HrRequestStatus.OPEN ? new Date() : request.firstResponseAt;
  const nextResolvedAt =
    input.status === HrRequestStatus.RESOLVED || input.status === HrRequestStatus.CANCELED ? new Date() : null;

  const updated = await prisma.hrRequest.update({
    where: {
      id: request.id
    },
    data: {
      status: input.status,
      firstResponseAt: nextFirstResponseAt,
      resolvedAt: nextResolvedAt,
      slaStatus: getEffectiveSlaStatus({
        dueAt: request.dueAt,
        status: input.status
      })
    }
  });

  await createAuditEvent({
    organizationId: input.organizationId,
    actorId: input.actorId,
    action: "hr_request.status_updated",
    entityType: "hr_request",
    entityId: updated.id,
    summary: `Solicitacao ${updated.title} atualizada para ${updated.status}.`,
    metadata: {
      status: updated.status
    }
  });

  return updated;
}

export async function addHrRequestComment(input: {
  organizationId: string;
  actorId: string;
  requestId: string;
  message: string;
  isInternal?: boolean;
}) {
  const request = await prisma.hrRequest.findFirst({
    where: {
      id: input.requestId,
      organizationId: input.organizationId
    }
  });

  if (!request) {
    throw new Error("Solicitacao nao encontrada.");
  }

  const comment = await prisma.hrRequestComment.create({
    data: {
      organizationId: input.organizationId,
      requestId: request.id,
      authorId: input.actorId,
      message: input.message,
      isInternal: input.isInternal ?? false
    }
  });

  await createAuditEvent({
    organizationId: input.organizationId,
    actorId: input.actorId,
    action: "hr_request.comment_added",
    entityType: "hr_request",
    entityId: request.id,
    summary: `Comentario adicionado na solicitacao ${request.title}.`
  });

  return comment;
}

export const HR_REQUEST_PRIORITY_LABELS: Record<PeopleTaskPriority, string> = {
  LOW: "Baixa",
  MEDIUM: "Media",
  HIGH: "Alta",
  URGENT: "Urgente"
};
