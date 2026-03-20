import { BillingApprovalStatus, BillingStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma/client";

import { getAiOverageRateCents, getEffectiveBillingLimits, getEstimatedMrrCents } from "./plans";
import { getBillingUsage } from "./usage";

export async function getRevenueOpsSnapshot() {
  const organizations = await prisma.organization.findMany({
    orderBy: {
      updatedAt: "desc"
    }
  });

  const pendingRequests = await prisma.billingUpgradeRequest.findMany({
    where: {
      status: BillingApprovalStatus.PENDING
    },
    include: {
      organization: true,
      requestedBy: true
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  const organizationsWithMetrics = await Promise.all(
    organizations.map(async (organization) => {
      const usage = await getBillingUsage(organization.id);
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
      const includedAi = effectiveLimits.monthlyAiAnalyses ?? usage.monthlyAiAnalyses;
      const overageAnalyses = Math.max(0, usage.monthlyAiAnalyses - includedAi);
      const aiOverageRevenueCents = overageAnalyses * getAiOverageRateCents(organization.billingAiOverageRateCents);

      return {
        organization,
        usage,
        effectiveLimits,
        estimatedMrrCents,
        aiOverageRevenueCents,
        projectedMonthlyRevenueCents: estimatedMrrCents + aiOverageRevenueCents
      };
    })
  );

  const summary = organizationsWithMetrics.reduce(
    (accumulator, item) => {
      accumulator.organizations += 1;
      accumulator.projectedMrrCents += item.projectedMonthlyRevenueCents;
      accumulator.projectedArrCents += item.projectedMonthlyRevenueCents * 12;

      if (item.organization.billingStatus === BillingStatus.ACTIVE) {
        accumulator.activeOrganizations += 1;
      }

      if (item.organization.billingStatus === BillingStatus.TRIALING) {
        accumulator.trialOrganizations += 1;
      }

      if (item.organization.billingStatus === BillingStatus.PAST_DUE) {
        accumulator.pastDueOrganizations += 1;
      }

      return accumulator;
    },
    {
      organizations: 0,
      activeOrganizations: 0,
      trialOrganizations: 0,
      pastDueOrganizations: 0,
      projectedMrrCents: 0,
      projectedArrCents: 0
    }
  );

  return {
    summary,
    organizations: organizationsWithMetrics,
    pendingRequests
  };
}
