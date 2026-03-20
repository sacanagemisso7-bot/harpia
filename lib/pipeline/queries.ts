import { prisma } from "@/lib/prisma/client";

export async function getPipelineStages(organizationId: string) {
  return prisma.pipelineStage.findMany({
    where: { organizationId },
    orderBy: { position: "asc" }
  });
}
