import { HrRequestStatus, SlaStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma/client";
import { getEffectiveSlaStatus } from "@/modules/hr-requests/service";

export async function listHrRequests(organizationId: string) {
  const requests = await prisma.hrRequest.findMany({
    where: {
      organizationId
    },
    include: {
      requesterUser: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      requesterEmployee: {
        select: {
          id: true,
          fullName: true,
          title: true
        }
      },
      assigneeUser: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      comments: {
        orderBy: [{ createdAt: "desc" }],
        take: 3,
        include: {
          author: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }
    },
    orderBy: [{ createdAt: "desc" }]
  });

  return requests.map((request) => ({
    ...request,
    effectiveSlaStatus: getEffectiveSlaStatus({
      dueAt: request.dueAt,
      status: request.status
    })
  }));
}

export async function getHrRequestQueueSummary(organizationId: string) {
  const requests = await listHrRequests(organizationId);
  const openStatuses: HrRequestStatus[] = [HrRequestStatus.OPEN, HrRequestStatus.IN_PROGRESS, HrRequestStatus.WAITING_ON_REQUESTER];

  return {
    requests,
    metrics: {
      open: requests.filter((request) => openStatuses.includes(request.status)).length,
      atRisk: requests.filter((request) => request.effectiveSlaStatus === SlaStatus.AT_RISK).length,
      breached: requests.filter((request) => request.effectiveSlaStatus === SlaStatus.BREACHED).length,
      avgResolutionHours: calculateAverageResolutionHours(requests)
    }
  };
}

function calculateAverageResolutionHours(
  requests: Array<{
    createdAt: Date;
    resolvedAt: Date | null;
  }>
) {
  const resolved = requests.filter((request) => request.resolvedAt);

  if (!resolved.length) {
    return 0;
  }

  const totalHours = resolved.reduce((accumulator, request) => {
    return accumulator + ((request.resolvedAt?.getTime() ?? request.createdAt.getTime()) - request.createdAt.getTime()) / (1000 * 60 * 60);
  }, 0);

  return Math.round((totalHours / resolved.length) * 10) / 10;
}
