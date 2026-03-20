import { AutomationTrigger } from "@prisma/client";

import { createAuditEvent } from "@/lib/audit/events";
import { hasPlanFeature } from "@/lib/billing/features";
import { prisma } from "@/lib/prisma/client";

type ApplyJobAutomationParams = {
  applicationId: string;
  organizationId: string;
  actorId: string;
  trigger: AutomationTrigger;
  note?: string;
};

export async function applyJobAutomationRule({
  applicationId,
  organizationId,
  actorId,
  trigger,
  note
}: ApplyJobAutomationParams) {
  const application = await prisma.application.findFirst({
    where: {
      id: applicationId,
      organizationId
    },
    include: {
      job: {
        include: {
          organization: {
            select: {
              billingPlan: true
            }
          },
          automationRules: {
            where: {
              trigger,
              enabled: true
            },
            include: {
              targetStage: true
            },
            take: 1
          }
        }
      },
      currentStage: true
    }
  });

  const rule = application?.job.automationRules[0];

  if (
    !application ||
    !rule ||
    application.currentStageId === rule.targetStageId ||
    !hasPlanFeature(application.job.organization.billingPlan, "job_automations")
  ) {
    return null;
  }

  await prisma.application.update({
    where: {
      id: application.id
    },
    data: {
      currentStageId: rule.targetStageId,
      history: {
        create: {
          fromStageId: application.currentStageId,
          toStageId: rule.targetStageId,
          movedById: actorId,
          notes: note || `Movida automaticamente pela regra ${trigger}.`
        }
      }
    }
  });

  await createAuditEvent({
    organizationId,
    actorId,
    action: "application.automation_stage_moved",
    entityType: "application",
    entityId: application.id,
    summary: `Automacao moveu a aplicacao para ${rule.targetStage.name} via trigger ${trigger}.`,
    metadata: {
      applicationId: application.id,
      trigger,
      toStageId: rule.targetStageId,
      ruleId: rule.id
    }
  });

  return {
    applicationId: application.id,
    fromStageId: application.currentStageId,
    toStageId: rule.targetStageId
  };
}
