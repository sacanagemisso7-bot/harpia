import { prisma } from "@/lib/prisma/client";

type JobFilters = {
  q?: string;
  status?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
};

export async function getJobs(organizationId: string, filters: JobFilters = {}) {
  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = filters.pageSize ?? 8;
  const where = {
    organizationId,
    ...(filters.q
      ? {
          OR: [
            { title: { contains: filters.q, mode: "insensitive" as const } },
            { department: { contains: filters.q, mode: "insensitive" as const } },
            { location: { contains: filters.q, mode: "insensitive" as const } }
          ]
        }
      : {}),
    ...(filters.status ? { status: filters.status as never } : {})
  };

  const orderBy =
    filters.sort === "title"
      ? [{ title: "asc" as const }]
      : filters.sort === "applications"
        ? [{ applications: { _count: "desc" as const } }]
        : filters.sort === "score"
          ? [{ applications: { _count: "desc" as const } }, { createdAt: "desc" as const }]
          : [{ status: "asc" as const }, { createdAt: "desc" as const }];

  const [items, total] = await Promise.all([
    prisma.job.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        criteria: {
          orderBy: { order: "asc" }
        },
        _count: {
          select: {
            applications: true
          }
        }
      }
    }),
    prisma.job.count({ where })
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize))
  };
}

export async function getOpenJobsForCandidate(candidateId: string, organizationId: string) {
  const existingApplications = await prisma.application.findMany({
    where: {
      organizationId,
      candidateId
    },
    select: {
      jobId: true
    }
  });

  return prisma.job.findMany({
    where: {
      organizationId,
      status: "OPEN",
      id: {
        notIn: existingApplications.map((application) => application.jobId)
      }
    },
    orderBy: { createdAt: "desc" }
  });
}

export async function getJobById(jobId: string, organizationId: string) {
  return prisma.job.findFirst({
    where: {
      id: jobId,
      organizationId
    },
    include: {
      criteria: {
        orderBy: { order: "asc" }
      },
      scorecardItems: {
        orderBy: { order: "asc" }
      },
      automationRules: {
        orderBy: { createdAt: "asc" },
        include: {
          targetStage: true
        }
      },
      applications: {
        orderBy: [{ score: "desc" }, { appliedAt: "desc" }],
        include: {
          candidate: true,
          currentStage: true,
          history: {
            orderBy: { createdAt: "desc" },
            take: 1
          }
        }
      },
      _count: {
        select: {
          applications: true
        }
      }
    }
  });
}
