import { BillingPlan, BillingStatus } from "@prisma/client";

import { createAuditEvent } from "@/lib/audit/events";
import { logInfo } from "@/lib/observability/logger";
import { prisma } from "@/lib/prisma/client";

import { sendBillingEmailToWorkspaceAdmins } from "./emails";

type BillingLifecycleResult = {
  trialsEndingSoon: number;
  trialsExpired: number;
  subscriptionsDowngraded: number;
  pastDueReminders: number;
};

async function getPastDueStartedAt(organizationId: string, fallbackDate: Date | null) {
  const event = await prisma.auditEvent.findFirst({
    where: {
      organizationId,
      action: "billing.subscription_past_due"
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  return event?.createdAt ?? fallbackDate ?? new Date();
}

export async function processBillingLifecycle() {
  const now = new Date();
  const trialWarningThreshold = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 3);

  const [trialsEndingSoon, expiredTrials, pastDueOrganizations] = await Promise.all([
    prisma.organization.findMany({
      where: {
        billingStatus: BillingStatus.TRIALING,
        billingTrialEndsAt: {
          gt: now,
          lte: trialWarningThreshold
        }
      }
    }),
    prisma.organization.findMany({
      where: {
        billingStatus: BillingStatus.TRIALING,
        billingTrialEndsAt: {
          lte: now
        }
      }
    }),
    prisma.organization.findMany({
      where: {
        billingStatus: BillingStatus.PAST_DUE,
        billingCurrentPeriodEndsAt: {
          lte: now
        }
      }
    })
  ]);

  let trialsEndingSoonCount = 0;
  let expiredTrialsCount = 0;
  let subscriptionsDowngradedCount = 0;
  let pastDueRemindersCount = 0;

  for (const organization of trialsEndingSoon) {
    const emailResult = await sendBillingEmailToWorkspaceAdmins({
      organizationId: organization.id,
      kind: "trial_ending",
      subject: `Seu trial do HireFlow AI termina em breve`,
      html: `<p>O trial do workspace <strong>${organization.name}</strong> termina em breve.</p><p>Abra a area de billing para escolher um plano e evitar interrupcoes em analytics, automacoes e outros recursos premium.</p>`,
      text: `O trial do workspace ${organization.name} termina em breve. Abra a area de billing para escolher um plano e evitar interrupcoes.`
    });

    if (emailResult.delivered) {
      trialsEndingSoonCount += 1;
    }
  }

  for (const organization of expiredTrials) {
    await prisma.organization.update({
      where: {
        id: organization.id
      },
      data: {
        billingPlan: BillingPlan.STARTER,
        billingStatus: BillingStatus.INCOMPLETE,
        billingTrialEndsAt: null,
        billingCurrentPeriodEndsAt: null
      }
    });

    await createAuditEvent({
      organizationId: organization.id,
      action: "billing.trial_expired_downgraded",
      entityType: "organization",
      entityId: organization.id,
      summary: "Trial expirado; workspace movido para o plano Starter.",
      metadata: {
        previousStatus: BillingStatus.TRIALING,
        nextStatus: BillingStatus.INCOMPLETE,
        nextPlan: BillingPlan.STARTER
      }
    });

    const emailResult = await sendBillingEmailToWorkspaceAdmins({
      organizationId: organization.id,
      kind: "trial_expired",
      subject: `O trial do ${organization.name} expirou`,
      html: `<p>O trial do workspace <strong>${organization.name}</strong> expirou e o ambiente voltou para o plano <strong>Starter</strong>.</p><p>Alguns recursos premium, como automacoes e analytics avancado, ficam indisponiveis ate a assinatura ser retomada.</p>`,
      text: `O trial do workspace ${organization.name} expirou e o ambiente voltou para o plano Starter. Recursos premium ficam indisponiveis ate a assinatura ser retomada.`
    });

    expiredTrialsCount += 1;

    if (emailResult.delivered) {
      subscriptionsDowngradedCount += 1;
    }
  }

  for (const organization of pastDueOrganizations) {
    const pastDueStartedAt = await getPastDueStartedAt(organization.id, organization.billingCurrentPeriodEndsAt);
    const daysPastDue = Math.floor((now.getTime() - pastDueStartedAt.getTime()) / (1000 * 60 * 60 * 24));

    if (daysPastDue >= 7) {
      await prisma.organization.update({
        where: {
          id: organization.id
        },
        data: {
          billingPlan: BillingPlan.STARTER,
          billingStatus: BillingStatus.CANCELED,
          billingCurrentPeriodEndsAt: null
        }
      });

      await createAuditEvent({
        organizationId: organization.id,
        action: "billing.past_due_downgraded",
        entityType: "organization",
        entityId: organization.id,
        summary: "Assinatura vencida; workspace rebaixado para o plano Starter.",
        metadata: {
          previousStatus: BillingStatus.PAST_DUE,
          nextStatus: BillingStatus.CANCELED,
          nextPlan: BillingPlan.STARTER,
          daysPastDue
        }
      });

      const emailResult = await sendBillingEmailToWorkspaceAdmins({
        organizationId: organization.id,
        kind: "past_due_day_7",
        subject: `Workspace ${organization.name} rebaixado por cobranca pendente`,
        html: `<p>A assinatura do workspace <strong>${organization.name}</strong> permaneceu pendente por mais de 7 dias.</p><p>O ambiente foi rebaixado para o plano <strong>Starter</strong>. Reative a assinatura para recuperar analytics avancado, automacoes e recursos premium.</p>`,
        text: `A assinatura do workspace ${organization.name} permaneceu pendente por mais de 7 dias. O ambiente foi rebaixado para o plano Starter. Reative a assinatura para recuperar recursos premium.`
      });

      if (emailResult.delivered) {
        pastDueRemindersCount += 1;
      }

      continue;
    }

    if (daysPastDue >= 3) {
      const emailResult = await sendBillingEmailToWorkspaceAdmins({
        organizationId: organization.id,
        kind: "past_due_day_3",
        subject: `Cobranca pendente no workspace ${organization.name}`,
        html: `<p>A assinatura do workspace <strong>${organization.name}</strong> segue pendente ha ${daysPastDue} dias.</p><p>Abra o billing para regularizar a cobranca e evitar downgrade automatico.</p>`,
        text: `A assinatura do workspace ${organization.name} segue pendente ha ${daysPastDue} dias. Abra o billing para regularizar a cobranca e evitar downgrade automatico.`
      });

      if (emailResult.delivered) {
        pastDueRemindersCount += 1;
      }

      continue;
    }

    const emailResult = await sendBillingEmailToWorkspaceAdmins({
      organizationId: organization.id,
      kind: "past_due_day_0",
      subject: `Assinatura do ${organization.name} entrou em status pendente`,
      html: `<p>A assinatura do workspace <strong>${organization.name}</strong> entrou em estado pendente.</p><p>Abra o billing para regularizar o pagamento antes que recursos premium sejam afetados.</p>`,
      text: `A assinatura do workspace ${organization.name} entrou em estado pendente. Abra o billing para regularizar o pagamento antes que recursos premium sejam afetados.`
    });

    if (emailResult.delivered) {
      pastDueRemindersCount += 1;
    }
  }

  const result: BillingLifecycleResult = {
    trialsEndingSoon: trialsEndingSoonCount,
    trialsExpired: expiredTrialsCount,
    subscriptionsDowngraded: subscriptionsDowngradedCount,
    pastDueReminders: pastDueRemindersCount
  };

  logInfo("Billing lifecycle processed", result, "billing");

  return result;
}
