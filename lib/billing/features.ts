import { BillingPlan } from "@prisma/client";

export type BillingFeature =
  | "advanced_analytics"
  | "job_automations"
  | "invoice_history"
  | "priority_support"
  | "multi_org_workspaces";

const BILLING_FEATURES: Record<BillingPlan, BillingFeature[]> = {
  [BillingPlan.STARTER]: [],
  [BillingPlan.GROWTH]: ["advanced_analytics", "job_automations", "invoice_history"],
  [BillingPlan.BUSINESS]: [
    "advanced_analytics",
    "job_automations",
    "invoice_history",
    "priority_support",
    "multi_org_workspaces"
  ]
};

export const BILLING_FEATURE_LABELS: Record<BillingFeature, string> = {
  advanced_analytics: "Analytics avancado",
  job_automations: "Automacoes por vaga",
  invoice_history: "Historico de invoices",
  priority_support: "Suporte prioritario",
  multi_org_workspaces: "Multi-workspace"
};

export function hasPlanFeature(plan: BillingPlan | string, feature: BillingFeature) {
  return BILLING_FEATURES[plan as BillingPlan]?.includes(feature) ?? false;
}

export function getPlanFeatures(plan: BillingPlan | string) {
  return BILLING_FEATURES[plan as BillingPlan] ?? [];
}
