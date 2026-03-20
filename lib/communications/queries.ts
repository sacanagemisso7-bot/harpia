import { prisma } from "@/lib/prisma/client";

export async function getEmailTemplates(organizationId: string) {
  return prisma.emailTemplate.findMany({
    where: { organizationId },
    orderBy: { type: "asc" }
  });
}
