import { prisma } from "@/lib/prisma/client";

export async function getDepartmentPlaybooks(organizationId: string) {
  return prisma.departmentPlaybook.findMany({
    where: {
      organizationId
    },
    orderBy: [{ department: "asc" }, { createdAt: "asc" }]
  });
}

export async function getDepartmentPlaybook(organizationId: string, department: string) {
  return prisma.departmentPlaybook.findUnique({
    where: {
      organizationId_department: {
        organizationId,
        department
      }
    }
  });
}
