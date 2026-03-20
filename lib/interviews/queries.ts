import { prisma } from "@/lib/prisma/client";

export async function getUpcomingInterviews(organizationId: string) {
  return prisma.interview.findMany({
    where: {
      organizationId,
      status: "SCHEDULED",
      startsAt: {
        gte: new Date()
      }
    },
    orderBy: [{ startsAt: "asc" }],
    include: {
      application: {
        include: {
          candidate: true,
          job: {
            include: {
              scorecardItems: {
                orderBy: { order: "asc" }
              }
            }
          }
        }
      },
      scheduledBy: {
        select: {
          name: true,
          email: true
        }
      }
    },
    take: 20
  });
}

export async function getInterviewById(interviewId: string, organizationId: string) {
  return prisma.interview.findFirst({
    where: {
      id: interviewId,
      organizationId
    },
    include: {
      application: {
        include: {
          candidate: true,
          job: {
            include: {
              scorecardItems: {
                orderBy: { order: "asc" }
              }
            }
          },
          currentStage: true
        }
      },
      scheduledBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      },
      feedbacks: {
        orderBy: { createdAt: "desc" },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        }
      }
    }
  });
}
