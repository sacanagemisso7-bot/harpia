import { BillingPlan, BillingStatus } from "@prisma/client";
import type { ReactNode } from "react";

import { signOut } from "@/auth";
import { HarpiaSystemShellClient } from "@/components/layout/harpia-system-shell-client";
import { BILLING_LIMIT_LABELS, BILLING_STATUS_LABELS, getPlanDefinition } from "@/lib/billing/plans";

type AppShellProps = {
  user: {
    name?: string | null;
    email?: string | null;
    role: string;
    organizationId: string;
    organizationName: string;
    memberships: Array<{
      organizationId: string;
      organizationName: string;
      role: string;
      isDefault: boolean;
    }>;
  };
  canViewRevenueOps: boolean;
  billing: {
    plan: BillingPlan;
    status: BillingStatus;
    trialEndsAt: Date | null;
    currentPeriodEndsAt: Date | null;
    usage: {
      activeJobs: number;
      teamMembers: number;
      monthlyAiAnalyses: number;
      monthlyCandidates: number;
    };
    effectiveLimits: {
      activeJobs: number | null;
      teamMembers: number | null;
      monthlyAiAnalyses: number | null;
      monthlyCandidates: number | null;
    };
  } | null;
  children: ReactNode;
  switchOrganization: (formData: FormData) => Promise<void>;
};

export function AppShell({ user, canViewRevenueOps, billing, children, switchOrganization }: AppShellProps) {
  const billingPlan = billing ? getPlanDefinition(billing.plan) : null;
  const usageAlerts =
    billing && billingPlan
      ? (Object.entries(billing.effectiveLimits) as Array<[keyof typeof billing.effectiveLimits, number | null]>).reduce<
          Array<{
            key: keyof typeof billing.effectiveLimits;
            limit: number;
            usage: number;
            ratio: number;
          }>
        >((accumulator, [key, limit]) => {
          if (typeof limit !== "number" || limit <= 0) {
            return accumulator;
          }

          accumulator.push({
            key,
            limit,
            usage: billing.usage[key],
            ratio: billing.usage[key] / limit
          });

          return accumulator;
        }, [])
          .filter((item) => item.ratio >= 0.8)
          .sort((left, right) => right.ratio - left.ratio)
      : [];

  const showBillingSignal =
    !!billing &&
    (billing.status === BillingStatus.TRIALING || billing.status === BillingStatus.PAST_DUE || usageAlerts.length > 0);

  const billingSignal = showBillingSignal
    ? [
        billing?.status === BillingStatus.TRIALING
          ? `trial ${billing.trialEndsAt ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(billing.trialEndsAt) : "live"}`
          : billing?.status === BillingStatus.PAST_DUE
            ? "billing due"
            : "limit close",
        usageAlerts[0]
          ? `${usageAlerts[0].usage}/${usageAlerts[0].limit} ${BILLING_LIMIT_LABELS[usageAlerts[0].key].toLowerCase()}`
          : billingPlan?.label ?? "growth",
        billing ? BILLING_STATUS_LABELS[billing.status].toLowerCase() : "active"
      ]
    : [];

  async function signOutAction() {
    "use server";

    await signOut({
      redirectTo: "/login"
    });
  }

  return (
    <HarpiaSystemShellClient
      user={user}
      canViewRevenueOps={canViewRevenueOps}
      billingSignal={billingSignal}
      showBillingSignal={showBillingSignal}
      switchOrganization={switchOrganization}
      signOutAction={signOutAction}
    >
      {children}
    </HarpiaSystemShellClient>
  );
}
