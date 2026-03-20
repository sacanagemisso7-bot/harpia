import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getActiveOrganizationCookie } from "@/lib/auth/organization-context";
import { prisma } from "@/lib/prisma/client";

export async function requireCurrentUser() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id
    },
    include: {
      organization: true,
      memberships: {
        include: {
          organization: true
        },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }]
      }
    }
  });

  if (!user) {
    redirect("/login");
  }

  if (!user.memberships.length) {
    await prisma.organizationMembership.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        role: user.role,
        isDefault: true
      }
    });

    return requireCurrentUser();
  }

  const activeOrganizationId = await getActiveOrganizationCookie();
  const activeMembership =
    user.memberships.find((membership) => membership.organizationId === activeOrganizationId) ??
    user.memberships.find((membership) => membership.organizationId === user.organizationId) ??
    user.memberships[0];

  if (!activeMembership) {
    redirect("/login");
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    role: activeMembership.role as unknown as string,
    organizationId: activeMembership.organizationId,
    organizationName: activeMembership.organization.name,
    primaryOrganizationId: user.organizationId,
    primaryRole: user.role as unknown as string,
    organizationBillingPlan: activeMembership.organization.billingPlan as unknown as string,
    organizationBillingStatus: activeMembership.organization.billingStatus as unknown as string,
    organizationBillingTrialEndsAt: activeMembership.organization.billingTrialEndsAt,
    organizationBillingCurrentPeriodEndsAt: activeMembership.organization.billingCurrentPeriodEndsAt,
    memberships: user.memberships.map((membership) => ({
      organizationId: membership.organizationId,
      organizationName: membership.organization.name,
      role: membership.role as unknown as string,
      isDefault: membership.isDefault
    }))
  };
}
