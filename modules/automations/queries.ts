import { AgentRunMode, BackgroundJobType, PeopleTaskStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma/client";

const AUTOMATION_JOB_TYPES = [
  BackgroundJobType.WATCHTOWER_SWEEP,
  BackgroundJobType.PEOPLE_REMINDER,
  BackgroundJobType.HR_REQUEST_SLA_ALERT,
  BackgroundJobType.COMPLIANCE_ALERT,
  BackgroundJobType.INTERNAL_SUMMARY_BUILD
];

export async function getAutomationStudioData(organizationId: string) {
  const [runs, jobs, openWatchtowerTasks, pendingApprovals] = await Promise.all([
    prisma.agentRun.findMany({
      where: {
        organizationId,
        mode: {
          in: [AgentRunMode.AUTOMATION, AgentRunMode.WATCHTOWER]
        }
      },
      include: {
        approvals: {
          orderBy: {
            createdAt: "desc"
          },
          take: 2
        },
        executions: {
          orderBy: {
            createdAt: "desc"
          },
          take: 2
        },
        steps: {
          orderBy: {
            startedAt: "asc"
          }
        },
        startedByUser: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 8
    }),
    prisma.backgroundJob.findMany({
      where: {
        organizationId,
        type: {
          in: AUTOMATION_JOB_TYPES
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 10
    }),
    prisma.peopleTask.count({
      where: {
        organizationId,
        status: {
          notIn: [PeopleTaskStatus.DONE]
        },
        OR: [
          {
            sourceType: {
              startsWith: "watchtower_"
            }
          },
          {
            sourceType: "ai_resolution"
          }
        ]
      }
    }),
    prisma.agentApprovalRequest.count({
      where: {
        organizationId,
        status: "PENDING"
      }
    })
  ]);

  return {
    jobs,
    openWatchtowerTasks,
    pendingApprovals,
    runs
  };
}
