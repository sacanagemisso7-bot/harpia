import { prisma } from "@/lib/prisma/client";

export async function getRecentAuditEvents(organizationId: string, take = 12) {
  return prisma.auditEvent.findMany({
    where: {
      organizationId
    },
    orderBy: {
      createdAt: "desc"
    },
    take,
    include: {
      actor: {
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
