import { prisma } from "@/lib/prisma/client";

type CandidateFilters = {
  q?: string;
  source?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
};

export async function getCandidates(organizationId: string, filters: CandidateFilters = {}) {
  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = filters.pageSize ?? 8;
  const where = {
    organizationId,
    ...(filters.q
      ? {
          OR: [
            { fullName: { contains: filters.q, mode: "insensitive" as const } },
            { email: { contains: filters.q, mode: "insensitive" as const } },
            { currentTitle: { contains: filters.q, mode: "insensitive" as const } },
            { currentCompany: { contains: filters.q, mode: "insensitive" as const } }
          ]
        }
      : {}),
    ...(filters.source ? { source: filters.source as never } : {})
  };

  const orderBy =
    filters.sort === "name"
      ? [{ fullName: "asc" as const }]
      : filters.sort === "experience"
        ? [{ yearsExperience: "desc" as const }, { createdAt: "desc" as const }]
        : [{ createdAt: "desc" as const }];

  const [items, total] = await Promise.all([
    prisma.candidate.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        resumes: {
          orderBy: { uploadedAt: "desc" },
          take: 1
        },
        _count: {
          select: {
            applications: true,
            resumes: true
          }
        }
      }
    }),
    prisma.candidate.count({ where })
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize))
  };
}

export async function getCandidateById(candidateId: string, organizationId: string) {
  return prisma.candidate.findFirst({
    where: {
      id: candidateId,
      organizationId
    },
    include: {
      resumes: {
        orderBy: { uploadedAt: "desc" }
      },
      applications: {
        orderBy: [{ score: "desc" }, { appliedAt: "desc" }],
        include: {
          job: true,
          currentStage: true,
          history: {
            orderBy: { createdAt: "desc" },
            take: 1
          }
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
      }
    }
  });
}
