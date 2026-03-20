import { Prisma } from "@prisma/client";

import { forwardObservabilityEvent } from "@/lib/observability/forwarder";
import { prisma } from "@/lib/prisma/client";

type AuditEventInput = {
  organizationId: string;
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
  metadata?: Record<string, unknown> | null;
};

function toInputJsonValue(metadata: Record<string, unknown> | null | undefined) {
  return metadata ? (metadata as Prisma.InputJsonValue) : undefined;
}

export async function createAuditEvent(input: AuditEventInput) {
  const event = await prisma.auditEvent.create({
    data: {
      organizationId: input.organizationId,
      actorId: input.actorId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      summary: input.summary,
      metadata: toInputJsonValue(input.metadata)
    }
  });

  await forwardObservabilityEvent({
    type: "audit_event",
    payload: {
      id: event.id,
      organizationId: event.organizationId,
      actorId: event.actorId,
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId,
      summary: event.summary,
      metadata: input.metadata ?? null
    }
  });

  return event;
}

export async function createAuditEvents(inputs: AuditEventInput[]) {
  if (!inputs.length) {
    return;
  }

  await prisma.auditEvent.createMany({
    data: inputs.map((input) => ({
      organizationId: input.organizationId,
      actorId: input.actorId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      summary: input.summary,
      metadata: toInputJsonValue(input.metadata)
    }))
  });
}
