import { prisma } from "@/lib/prisma/client";

import { getAiOverageRateCents, getEffectiveBillingLimits, getEstimatedMrrCents } from "./plans";
import { listStripeInvoices, isStripeConfigured } from "./stripe";
import { getBillingUsage } from "./usage";

export async function getBillingPageData(organizationId: string) {
  const [organization, lifecycleEvents, requests] = await Promise.all([
    prisma.organization.findUnique({
      where: {
        id: organizationId
      }
    }),
    prisma.auditEvent.findMany({
      where: {
        organizationId,
        action: {
          in: [
            "billing.trial_started",
            "billing.subscription_activated",
            "billing.checkout_completed",
            "billing.subscription_past_due",
            "billing.past_due_downgraded"
          ]
        }
      },
      orderBy: {
        createdAt: "asc"
      }
    }),
    prisma.billingUpgradeRequest.findMany({
      where: {
        organizationId
      },
      orderBy: {
        createdAt: "desc"
      },
      include: {
        requestedBy: {
          select: {
            name: true,
            email: true
          }
        },
        reviewedBy: {
          select: {
            name: true,
            email: true
          }
        }
      },
      take: 10
    })
  ] as const);

  if (!organization) {
    return null;
  }

  const usage = await getBillingUsage(organizationId);

  let invoices: Awaited<ReturnType<typeof listStripeInvoices>> = [];

  if (isStripeConfigured() && organization.stripeCustomerId) {
    try {
      invoices = await listStripeInvoices(organization.stripeCustomerId);
    } catch (error) {
      console.error("Failed to fetch Stripe invoices", error);
    }
  }

  const trialStartedAt = lifecycleEvents.find((event) => event.action === "billing.trial_started")?.createdAt ?? null;
  const activatedAt =
    lifecycleEvents.find((event) => event.action === "billing.subscription_activated")?.createdAt ??
    lifecycleEvents.find((event) => event.action === "billing.checkout_completed")?.createdAt ??
    null;
  const firstPastDueAt =
    lifecycleEvents.find((event) => event.action === "billing.subscription_past_due")?.createdAt ?? null;
  const downgradedAt =
    lifecycleEvents.find((event) => event.action === "billing.past_due_downgraded")?.createdAt ?? null;

  const daysToConvert =
    trialStartedAt && activatedAt
      ? Math.max(0, Math.round((activatedAt.getTime() - trialStartedAt.getTime()) / (1000 * 60 * 60 * 24)))
      : null;
  const effectiveLimits = getEffectiveBillingLimits(organization.billingPlan, {
    billingExtraSeats: organization.billingExtraSeats,
    billingAiAddonUnits: organization.billingAiAddonUnits
  });
  const estimatedMrrCents = getEstimatedMrrCents({
    plan: organization.billingPlan,
    billingExtraSeats: organization.billingExtraSeats,
    billingAiAddonUnits: organization.billingAiAddonUnits,
    billingContractedMrrCents: organization.billingContractedMrrCents
  });
  const aiIncludedAnalyses = effectiveLimits.monthlyAiAnalyses ?? usage.monthlyAiAnalyses;
  const aiOverageAnalyses = Math.max(0, usage.monthlyAiAnalyses - aiIncludedAnalyses);
  const aiOverageRevenueCents = aiOverageAnalyses * getAiOverageRateCents(organization.billingAiOverageRateCents);

  return {
    organization,
    usage,
    effectiveLimits,
    invoices,
    requests,
    metrics: {
      trialStartedAt,
      activatedAt,
      firstPastDueAt,
      downgradedAt,
      convertedFromTrial: !!(trialStartedAt && activatedAt && activatedAt > trialStartedAt),
      daysToConvert,
      estimatedMrrCents,
      estimatedArrCents: estimatedMrrCents * 12,
      aiOverageAnalyses,
      aiOverageRevenueCents
    }
  };
}
