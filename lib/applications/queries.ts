import { prisma } from "@/lib/prisma/client";

export async function getApplicationById(applicationId: string, organizationId: string) {
  return prisma.application.findFirst({
    where: {
      id: applicationId,
      organizationId
    },
    include: {
      candidate: {
        include: {
          resumes: {
            orderBy: { uploadedAt: "desc" },
            take: 1
          }
        }
      },
      job: {
        include: {
          criteria: {
            orderBy: { order: "asc" }
          },
          scorecardItems: {
            orderBy: { order: "asc" }
          }
        }
      },
      currentStage: true,
      history: {
        orderBy: { createdAt: "desc" },
        include: {
          fromStage: true,
          toStage: true,
          movedBy: true
        }
      },
      notes: {
        orderBy: { createdAt: "desc" },
        include: {
          author: {
            select: {
              name: true,
              email: true
            }
          }
        }
      },
      interviews: {
        orderBy: { startsAt: "asc" },
        include: {
          feedbacks: {
            orderBy: { createdAt: "desc" },
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  role: true
                }
              }
            }
          }
        }
      },
      organization: {
        include: {
          departmentPlaybooks: true
        }
      }
    }
  });
}

type PipelineFilters = {
  q?: string;
  jobId?: string;
};

export async function getPipelineBoard(organizationId: string, filters: PipelineFilters = {}) {
  return prisma.pipelineStage.findMany({
    where: { organizationId },
    orderBy: { position: "asc" },
    include: {
      currentFor: {
        where: {
          ...(filters.jobId ? { jobId: filters.jobId } : {}),
          ...(filters.q
            ? {
                OR: [
                  { candidate: { fullName: { contains: filters.q, mode: "insensitive" } } },
                  { candidate: { currentTitle: { contains: filters.q, mode: "insensitive" } } },
                  { job: { title: { contains: filters.q, mode: "insensitive" } } }
                ]
              }
            : {})
        },
        orderBy: [{ score: "desc" }, { appliedAt: "asc" }],
        include: {
          candidate: true,
          job: true
        }
      }
    }
  });
}
