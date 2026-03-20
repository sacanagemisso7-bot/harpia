import { AgentRunMode, AgentRunStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma/client";

export async function listRecentWatchtowerRuns(organizationId: string, limit = 4) {
  return prisma.agentRun.findMany({
    where: {
      organizationId,
      mode: AgentRunMode.WATCHTOWER,
      status: {
        in: [AgentRunStatus.SUCCEEDED, AgentRunStatus.FAILED]
      }
    },
    orderBy: [{ createdAt: "desc" }],
    take: limit
  });
}
