import { ComplianceRequirementType, ComplianceStatus, PolicyRolloutStatus } from "@prisma/client";

import { createAuditEvent } from "@/lib/audit/events";
import { prisma } from "@/lib/prisma/client";
import { enqueueBackgroundJob } from "@/modules/background-jobs/service";

async function syncPolicyRolloutStatus(policyRolloutId: string) {
  const rollout = await prisma.policyRollout.findUnique({
    where: {
      id: policyRolloutId
    },
    include: {
      acknowledgements: {
        select: {
          id: true,
          acknowledgedAt: true
        }
      }
    }
  });

  if (!rollout) {
    return null;
  }

  const assigned = rollout.acknowledgements.length;
  const acknowledged = rollout.acknowledgements.filter((item) => !!item.acknowledgedAt).length;
  const status = assigned > 0 && acknowledged === assigned ? PolicyRolloutStatus.COMPLETED : PolicyRolloutStatus.ACTIVE;

  return prisma.policyRollout.update({
    where: {
      id: rollout.id
    },
    data: {
      status
    }
  });
}

export async function acknowledgePolicy(input: {
  organizationId: string;
  actorId: string;
  acknowledgementId: string;
}) {
  const acknowledgement = await prisma.policyAcknowledgement.findFirst({
    where: {
      id: input.acknowledgementId,
      organizationId: input.organizationId
    },
    include: {
      employee: {
        select: {
          id: true,
          fullName: true
        }
      },
      document: {
        select: {
          id: true,
          title: true
        }
      }
    }
  });

  if (!acknowledgement) {
    throw new Error("Aceite de politica nao encontrado.");
  }

  const acknowledgedAt = acknowledgement.acknowledgedAt ?? new Date();

  const updated = await prisma.policyAcknowledgement.update({
    where: {
      id: acknowledgement.id
    },
    data: {
      acknowledgedAt
    }
  });

  await prisma.complianceRequirement.updateMany({
    where: {
      organizationId: input.organizationId,
      employeeId: acknowledgement.employeeId,
      type: ComplianceRequirementType.POLICY,
      status: ComplianceStatus.PENDING,
      OR: [
        {
          sourceType: "policy_acknowledgement",
          sourceId: acknowledgement.id
        },
        ...(acknowledgement.documentId
          ? [
              {
                sourceType: "knowledge_document",
                sourceId: acknowledgement.documentId
              }
            ]
          : [])
      ]
    },
    data: {
      status: ComplianceStatus.COMPLETED,
      completedAt: acknowledgedAt
    }
  });

  await createAuditEvent({
    organizationId: input.organizationId,
    actorId: input.actorId,
    action: "policy_acknowledgement.acknowledged",
    entityType: "policy_acknowledgement",
    entityId: acknowledgement.id,
    summary: `${acknowledgement.employee.fullName} confirmou ${acknowledgement.document?.title ?? acknowledgement.title}.`,
    metadata: {
      employeeId: acknowledgement.employeeId,
      documentId: acknowledgement.documentId ?? null,
      policyRolloutId: acknowledgement.policyRolloutId ?? null
    }
  });

  if (acknowledgement.policyRolloutId) {
    await syncPolicyRolloutStatus(acknowledgement.policyRolloutId);
  }

  return updated;
}

export async function assignPolicyToEmployees(input: {
  organizationId: string;
  actorId: string;
  documentId: string;
  employeeIds: string[];
  dueAt?: Date | null;
}) {
  const employeeIds = Array.from(new Set(input.employeeIds.filter(Boolean)));

  if (!employeeIds.length) {
    throw new Error("Selecione pelo menos um colaborador para atribuir a politica.");
  }

  const document = await prisma.knowledgeDocument.findFirst({
    where: {
      id: input.documentId,
      organizationId: input.organizationId,
      type: "POLICY",
      status: "READY"
    },
    select: {
      id: true,
      title: true,
      summary: true,
      description: true,
      versionLabel: true,
      publishedAt: true,
      requiresAcknowledgement: true
    }
  });

  if (!document) {
    throw new Error("Politica interna nao encontrada para atribuicao.");
  }

  if (!document.publishedAt) {
    throw new Error("Publique a policy antes de iniciar um rollout.");
  }

  const effectiveVersionLabel = document.versionLabel ?? `v${document.publishedAt.getFullYear()}.1`;
  const rolloutTitle = `${document.title} · ${effectiveVersionLabel}`;

  const employees = await prisma.employee.findMany({
    where: {
      organizationId: input.organizationId,
      id: {
        in: employeeIds
      }
    },
    select: {
      id: true,
      fullName: true
    }
  });

  const existingAcknowledgements = await prisma.policyAcknowledgement.findMany({
    where: {
      organizationId: input.organizationId,
      documentId: document.id,
      employeeId: {
        in: employeeIds
      }
    },
    orderBy: [{ createdAt: "desc" }]
  });

  const acknowledgementByEmployeeId = new Map<string, (typeof existingAcknowledgements)[number]>();

  for (const acknowledgement of existingAcknowledgements) {
    if (!acknowledgementByEmployeeId.has(acknowledgement.employeeId) || !acknowledgement.acknowledgedAt) {
      acknowledgementByEmployeeId.set(acknowledgement.employeeId, acknowledgement);
    }
  }

  const employeesNeedingAssignment = employees.filter((employee) => !acknowledgementByEmployeeId.get(employee.id)?.acknowledgedAt);

  if (!employeesNeedingAssignment.length) {
    return {
      rolloutId: null,
      rolloutTitle,
      created: 0,
      updated: 0,
      skipped: employees.length
    };
  }

  const rollout = await prisma.policyRollout.create({
    data: {
      organizationId: input.organizationId,
      documentId: document.id,
      createdById: input.actorId,
      title: rolloutTitle,
      dueAt: input.dueAt ?? null
    }
  });

  if (!document.requiresAcknowledgement) {
    await prisma.knowledgeDocument.update({
      where: {
        id: document.id
      },
      data: {
        requiresAcknowledgement: true
      }
    });
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const employee of employees) {
    const existingAcknowledgement = acknowledgementByEmployeeId.get(employee.id);
    const title = `Aceite da politica: ${document.title} (${effectiveVersionLabel})`;

    const acknowledgement =
      existingAcknowledgement && !existingAcknowledgement.acknowledgedAt
        ? await prisma.policyAcknowledgement.update({
            where: {
              id: existingAcknowledgement.id
            },
            data: {
              title,
              dueAt: input.dueAt ?? existingAcknowledgement.dueAt ?? null,
              policyRolloutId: rollout.id
            }
          })
        : existingAcknowledgement?.acknowledgedAt
          ? null
          : await prisma.policyAcknowledgement.create({
              data: {
                organizationId: input.organizationId,
                employeeId: employee.id,
                documentId: document.id,
                policyRolloutId: rollout.id,
                title,
                dueAt: input.dueAt ?? null
              }
            });

    if (!acknowledgement) {
      skipped += 1;
      continue;
    }

    if (existingAcknowledgement && !existingAcknowledgement.acknowledgedAt) {
      updated += 1;
    } else {
      created += 1;
    }

    const existingRequirement = await prisma.complianceRequirement.findFirst({
      where: {
        organizationId: input.organizationId,
        employeeId: employee.id,
        type: ComplianceRequirementType.POLICY,
        OR: [
          {
            sourceType: "policy_acknowledgement",
            sourceId: acknowledgement.id
          },
          {
            sourceType: "knowledge_document",
            sourceId: document.id
          }
        ]
      }
    });

    const requirementData = {
      title,
      description: document.summary ?? document.description ?? `Confirmar leitura e aceite de ${document.title}.`,
      dueAt: input.dueAt ?? null,
      status: acknowledgement.acknowledgedAt ? ComplianceStatus.COMPLETED : ComplianceStatus.PENDING,
      completedAt: acknowledgement.acknowledgedAt ?? null,
      sourceType: "policy_acknowledgement",
      sourceId: acknowledgement.id
    };

    if (existingRequirement) {
      await prisma.complianceRequirement.update({
        where: {
          id: existingRequirement.id
        },
        data: requirementData
      });
    } else {
      await prisma.complianceRequirement.create({
        data: {
          organizationId: input.organizationId,
          employeeId: employee.id,
          type: ComplianceRequirementType.POLICY,
          ...requirementData
        }
      });
    }

    await enqueueBackgroundJob({
      organizationId: input.organizationId,
      type: "PEOPLE_REMINDER",
      payload: {
        employeeId: employee.id,
        channel: "email",
        reason: "policy_assignment"
      },
      uniqueKey: `policy-assignment:${acknowledgement.id}:initial-email`
    });

    if (input.dueAt) {
      const dueSoonReminderAt = new Date(Math.max(Date.now(), input.dueAt.getTime() - 1000 * 60 * 60 * 24));

      if (dueSoonReminderAt.getTime() > Date.now() + 1000 * 60 * 5) {
        await enqueueBackgroundJob({
          organizationId: input.organizationId,
          type: "PEOPLE_REMINDER",
          payload: {
            employeeId: employee.id,
            channel: "email",
            reason: "policy_ack_due_soon"
          },
          uniqueKey: `policy-assignment:${acknowledgement.id}:due-soon-email`,
          availableAt: dueSoonReminderAt
        });
      }
    }
  }

  await createAuditEvent({
    organizationId: input.organizationId,
    actorId: input.actorId,
    action: "policy_rollout.launched",
    entityType: "policy_rollout",
    entityId: rollout.id,
    summary: `Rollout ${rolloutTitle} iniciado para ${employees.length} colaborador(es).`,
    metadata: {
      documentId: document.id,
      created,
      updated,
      skipped,
      dueAt: input.dueAt?.toISOString() ?? null
    }
  });

  await syncPolicyRolloutStatus(rollout.id);

  return {
    rolloutId: rollout.id,
    rolloutTitle,
    created,
    updated,
    skipped
  };
}
