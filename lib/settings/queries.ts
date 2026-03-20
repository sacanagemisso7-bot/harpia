import { prisma } from "@/lib/prisma/client";
import { getEffectiveBillingLimits } from "@/lib/billing/plans";
import { getBillingUsage } from "@/lib/billing/usage";

export async function getOrganizationSettings(organizationId: string) {
  return prisma.organization.findUnique({
    where: { id: organizationId }
  });
}

export async function getOrganizationBillingOverview(organizationId: string) {
  const [organization, usage] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId }
    }),
    getBillingUsage(organizationId)
  ]);

  if (!organization) {
    return null;
  }

  return {
    organization,
    usage,
    effectiveLimits: getEffectiveBillingLimits(organization.billingPlan, {
      billingExtraSeats: organization.billingExtraSeats,
      billingAiAddonUnits: organization.billingAiAddonUnits
    })
  };
}
