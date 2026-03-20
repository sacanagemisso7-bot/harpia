import { AgentApprovalStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma/client";

export async function listAgentApprovalRequests(organizationId: string, status?: AgentApprovalStatus) {
  return prisma.agentApprovalRequest.findMany({
    where: {
      organizationId,
      ...(status ? { status } : {})
    },
    include: {
      requestedByUser: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      approverUser: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      agentRun: {
        include: {
          chatThread: {
            select: {
              id: true,
              title: true
            }
          },
          startedByUser: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          executions: {
            orderBy: [{ createdAt: "desc" }],
            take: 1
          }
        }
      }
    },
    orderBy: [{ createdAt: "desc" }]
  });
}

export async function listRecentAgentRuns(organizationId: string, limit = 12) {
  return prisma.agentRun.findMany({
    where: {
      organizationId
    },
    include: {
      startedByUser: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      approvals: {
        orderBy: [{ createdAt: "desc" }],
        take: 1
      },
      executions: {
        orderBy: [{ createdAt: "desc" }],
        take: 1
      }
    },
    orderBy: [{ createdAt: "desc" }],
    take: limit
  });
}

export async function getAgentApprovalReviewContext(organizationId: string, approvalRequestId: string) {
  return prisma.agentApprovalRequest.findFirst({
    where: {
      id: approvalRequestId,
      organizationId
    },
    include: {
      agentRun: {
        select: {
          id: true,
          chatThreadId: true
        }
      }
    }
  });
}
