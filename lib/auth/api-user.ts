import { auth } from "@/auth";
import { getActiveOrganizationCookie } from "@/lib/auth/organization-context";
import { prisma } from "@/lib/prisma/client";

export async function getApiCurrentUser() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id
    },
    include: {
      memberships: {
        include: {
          organization: true
        },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }]
      }
    }
  });

  if (!user) {
    return null;
  }

  const activeOrganizationId = await getActiveOrganizationCookie();
  const activeMembership =
    user.memberships.find((membership) => membership.organizationId === activeOrganizationId) ??
    user.memberships.find((membership) => membership.organizationId === user.organizationId) ??
    user.memberships[0];

  if (!activeMembership) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: activeMembership.role,
    organizationId: activeMembership.organizationId,
    organizationName: activeMembership.organization.name
  };
}
