import { prisma } from "@/lib/prisma/client";

export async function getCareersOrganization(slug: string) {
  return prisma.organization.findUnique({
    where: { slug }
  });
}

export async function getCareersJobs(slug: string) {
  return prisma.job.findMany({
    where: {
      organization: {
        slug
      },
      status: "OPEN"
    },
    orderBy: { createdAt: "desc" },
    include: {
      criteria: {
        orderBy: { order: "asc" }
      },
      organization: true
    }
  });
}

export async function getCareersJob(slug: string, jobId: string) {
  return prisma.job.findFirst({
    where: {
      id: jobId,
      status: "OPEN",
      organization: {
        slug
      }
    },
    include: {
      organization: true,
      criteria: {
        orderBy: { order: "asc" }
      }
    }
  });
}
