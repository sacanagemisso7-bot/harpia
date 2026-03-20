import { BillingPlan, BillingStatus } from "@prisma/client";

export type BillingLimitKey = "activeJobs" | "teamMembers" | "monthlyAiAnalyses" | "monthlyCandidates";
export const EXTRA_SEAT_MONTHLY_PRICE_CENTS = 7900;
export const AI_ADDON_UNIT_MONTHLY_PRICE_CENTS = 14900;
export const AI_ADDON_UNIT_ANALYSES = 250;
export const DEFAULT_AI_OVERAGE_RATE_CENTS = 120;

type BillingPlanDefinition = {
  label: string;
  description: string;
  monthlyPriceLabel: string;
  annualPriceLabel: string;
  limits: Record<BillingLimitKey, number | null>;
};

export const BILLING_PLAN_DEFINITIONS: Record<BillingPlan, BillingPlanDefinition> = {
  [BillingPlan.STARTER]: {
    label: "Starter",
    description: "Para times pequenos que querem sair do caos operacional e padronizar o basico.",
    monthlyPriceLabel: "R$ 499/mes",
    annualPriceLabel: "R$ 4.990/ano",
    limits: {
      activeJobs: 3,
      teamMembers: 2,
      monthlyAiAnalyses: 120,
      monthlyCandidates: 250
    }
  },
  [BillingPlan.GROWTH]: {
    label: "Growth",
    description: "Para operacoes que ja precisam de volume, automacoes e analytics mais fortes.",
    monthlyPriceLabel: "R$ 1.290/mes",
    annualPriceLabel: "R$ 12.900/ano",
    limits: {
      activeJobs: 12,
      teamMembers: 8,
      monthlyAiAnalyses: 1200,
      monthlyCandidates: 2500
    }
  },
  [BillingPlan.BUSINESS]: {
    label: "Business",
    description: "Para operacoes com mais governanca, onboarding e escopo negociado.",
    monthlyPriceLabel: "Sob consulta",
    annualPriceLabel: "Sob consulta anual",
    limits: {
      activeJobs: null,
      teamMembers: null,
      monthlyAiAnalyses: null,
      monthlyCandidates: null
    }
  }
};

export const BILLING_STATUS_LABELS: Record<BillingStatus, string> = {
  [BillingStatus.TRIALING]: "Trial",
  [BillingStatus.ACTIVE]: "Ativo",
  [BillingStatus.PAST_DUE]: "Pendente",
  [BillingStatus.CANCELED]: "Cancelado",
  [BillingStatus.INCOMPLETE]: "Nao configurado"
};

export const BILLING_LIMIT_LABELS: Record<BillingLimitKey, string> = {
  activeJobs: "vagas ativas",
  teamMembers: "membros do time",
  monthlyAiAnalyses: "analises com IA no mes",
  monthlyCandidates: "candidatos no mes"
};

export function getPlanDefinition(plan: BillingPlan) {
  return BILLING_PLAN_DEFINITIONS[plan];
}

export function getBasePlanMonthlyPriceCents(plan: BillingPlan) {
  if (plan === BillingPlan.STARTER) {
    return 49900;
  }

  if (plan === BillingPlan.GROWTH) {
    return 129000;
  }

  return 0;
}

type LimitOverrideInput = {
  billingExtraSeats?: number | null;
  billingAiAddonUnits?: number | null;
};

export function getEffectiveBillingLimits(
  plan: BillingPlan,
  overrides?: LimitOverrideInput
): Record<BillingLimitKey, number | null> {
  const baseLimits = getPlanDefinition(plan).limits;
  const extraSeats = Math.max(0, overrides?.billingExtraSeats ?? 0);
  const aiAddonUnits = Math.max(0, overrides?.billingAiAddonUnits ?? 0);

  return {
    ...baseLimits,
    teamMembers: baseLimits.teamMembers === null ? null : baseLimits.teamMembers + extraSeats,
    monthlyAiAnalyses:
      baseLimits.monthlyAiAnalyses === null ? null : baseLimits.monthlyAiAnalyses + aiAddonUnits * AI_ADDON_UNIT_ANALYSES
  };
}

export function getEstimatedMrrCents(input: {
  plan: BillingPlan;
  billingExtraSeats?: number | null;
  billingAiAddonUnits?: number | null;
  billingContractedMrrCents?: number | null;
}) {
  if (typeof input.billingContractedMrrCents === "number" && input.billingContractedMrrCents > 0) {
    return input.billingContractedMrrCents;
  }

  return (
    getBasePlanMonthlyPriceCents(input.plan) +
    Math.max(0, input.billingExtraSeats ?? 0) * EXTRA_SEAT_MONTHLY_PRICE_CENTS +
    Math.max(0, input.billingAiAddonUnits ?? 0) * AI_ADDON_UNIT_MONTHLY_PRICE_CENTS
  );
}

export function getAiOverageRateCents(organizationRate?: number | null) {
  return Math.max(0, organizationRate ?? DEFAULT_AI_OVERAGE_RATE_CENTS);
}

export function isBillingActive(status: BillingStatus, trialEndsAt?: Date | null) {
  if (status === BillingStatus.ACTIVE) {
    return true;
  }

  if (status === BillingStatus.TRIALING) {
    return !trialEndsAt || trialEndsAt.getTime() > Date.now();
  }

  return false;
}

export function formatLimitValue(value: number | null) {
  return value === null ? "Ilimitado" : value.toString();
}
