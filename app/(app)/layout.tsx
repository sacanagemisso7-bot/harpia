import { switchActiveOrganization } from "@/app/(app)/actions";
import { AppShell } from "@/components/layout/app-shell";
import { canAccessRevenueOps } from "@/lib/billing/revenue-ops";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { getOrganizationBillingOverview } from "@/lib/settings/queries";

export default async function AppLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const user = await requireCurrentUser();
  const billingOverview = await getOrganizationBillingOverview(user.organizationId);

  return (
    <AppShell
      user={{
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        organizationName: user.organizationName,
        memberships: user.memberships
      }}
      canViewRevenueOps={canAccessRevenueOps(user.email)}
      billing={
        billingOverview
          ? {
              plan: billingOverview.organization.billingPlan,
              status: billingOverview.organization.billingStatus,
              trialEndsAt: billingOverview.organization.billingTrialEndsAt,
              currentPeriodEndsAt: billingOverview.organization.billingCurrentPeriodEndsAt,
              usage: billingOverview.usage,
              effectiveLimits: billingOverview.effectiveLimits
            }
          : null
      }
      switchOrganization={switchActiveOrganization}
    >
      {children}
    </AppShell>
  );
}
