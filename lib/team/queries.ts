import { prisma } from "@/lib/prisma/client";

export async function getTeamMembers(organizationId: string) {
  return prisma.organizationMembership.findMany({
    where: {
      organizationId
    },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          organizationId: true
        }
      }
    }
  }).then((memberships) =>
    memberships.map((membership) => ({
      id: membership.user.id,
      membershipId: membership.id,
      name: membership.user.name,
      email: membership.user.email,
      role: membership.role,
      createdAt: membership.createdAt,
      isDefault: membership.isDefault,
      primaryOrganizationId: membership.user.organizationId
    }))
  );
}

export async function getPendingInvites(organizationId: string) {
  return prisma.organizationInvite.findMany({
    where: {
      organizationId,
      acceptedAt: null,
      revokedAt: null,
      expiresAt: {
        gt: new Date()
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    include: {
      invitedBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      }
    }
  });
}

export async function getInviteByToken(token: string) {
  return prisma.organizationInvite.findUnique({
    where: {
      token
    },
    include: {
      organization: true
    }
  });
}
