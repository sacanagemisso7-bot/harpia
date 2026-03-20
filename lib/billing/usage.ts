import { JobStatus, type BillingPlan } from "@prisma/client";

import { prisma } from "@/lib/prisma/client";

import { BILLING_LIMIT_LABELS, getEffectiveBillingLimits, type BillingLimitKey } from "./plans";

export async function getBillingUsage(organizationId: string) {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [activeJobs, teamMembers, monthlyAiAnalyses, monthlyCandidates] = await Promise.all([
    prisma.job.count({
      where: {
        organizationId,
        status: {
          in: [JobStatus.OPEN, JobStatus.ON_HOLD]
        }
      }
    }),
    prisma.organizationMembership.count({
      where: {
        organizationId
      }
    }),
    prisma.auditEvent.count({
      where: {
        organizationId,
        action: "candidate.resume_ai_analyzed",
        createdAt: {
          gte: monthStart
        }
      }
    }),
    prisma.candidate.count({
      where: {
        organizationId,
        createdAt: {
          gte: monthStart
        }
      }
    })
  ]);

  return {
    activeJobs,
    teamMembers,
    monthlyAiAnalyses,
    monthlyCandidates
  };
}

export async function checkBillingLimit(organizationId: string, plan: BillingPlan, key: BillingLimitKey) {
  const [usage, organization] = await Promise.all([
    getBillingUsage(organizationId),
    prisma.organization.findUnique({
      where: {
        id: organizationId
      },
      select: {
        billingExtraSeats: true,
        billingAiAddonUnits: true
      }
    })
  ]);
  const limit = getEffectiveBillingLimits(plan, organization ?? undefined)[key];
  const current = usage[key];

  if (limit === null) {
    return {
      allowed: true,
      current,
      limit
    };
  }

  return {
    allowed: current < limit,
    current,
    limit,
    message:
      current >= limit
        ? `Seu plano atual atingiu o limite de ${limit} ${BILLING_LIMIT_LABELS[key]}.`
        : undefined
  };
}
