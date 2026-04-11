import { ComplianceRequirementType, ComplianceStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma/client";

export async function listComplianceRequirements(organizationId: string) {
  return prisma.complianceRequirement.findMany({
    where: {
      organizationId
    },
    include: {
      employee: {
        select: {
          id: true,
          fullName: true,
          title: true
        }
      }
    },
    orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }]
  });
}

export async function listPolicyAcknowledgements(input: {
  organizationId: string;
  employeeId?: string;
  linkedUserId?: string;
}) {
  return prisma.policyAcknowledgement.findMany({
    where: {
      organizationId: input.organizationId,
      ...(input.employeeId ? { employeeId: input.employeeId } : {}),
      ...(input.linkedUserId
        ? {
            employee: {
              linkedUserId: input.linkedUserId
            }
          }
        : {})
    },
    include: {
      employee: {
        select: {
          id: true,
          fullName: true,
          title: true,
          linkedUserId: true
        }
      },
        document: {
          select: {
            id: true,
            title: true,
            summary: true,
            type: true,
            versionLabel: true
          }
        }
      },
    orderBy: [{ acknowledgedAt: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }]
  });
}

export async function getComplianceSummary(organizationId: string) {
  const [requirements, policyAcknowledgements] = await Promise.all([
    listComplianceRequirements(organizationId),
    listPolicyAcknowledgements({ organizationId })
  ]);

  const pendingRequirements = requirements.filter((item) => item.status === ComplianceStatus.PENDING);
  const overdueRequirements = pendingRequirements.filter((item) => item.dueAt && item.dueAt.getTime() < Date.now());
  const pendingAcknowledgements = policyAcknowledgements.filter((item) => !item.acknowledgedAt);
  const overdueAcknowledgements = pendingAcknowledgements.filter((item) => item.dueAt && item.dueAt.getTime() < Date.now());

  return {
    requirements,
    policyAcknowledgements,
    metrics: {
      total: requirements.length + policyAcknowledgements.length,
      pending: pendingRequirements.length + pendingAcknowledgements.length,
      overdue: overdueRequirements.length + overdueAcknowledgements.length,
      completed:
        requirements.filter((item) => item.status === ComplianceStatus.COMPLETED).length +
        policyAcknowledgements.filter((item) => !!item.acknowledgedAt).length,
      pendingAcknowledgements: pendingAcknowledgements.length,
      overdueAcknowledgements: overdueAcknowledgements.length
    }
  };
}

export async function getComplianceDashboardSnapshot(organizationId: string, limit = 6) {
  const [pendingRequirements, pendingAcknowledgements, requirements] = await Promise.all([
    prisma.complianceRequirement.count({
      where: {
        organizationId,
        status: ComplianceStatus.PENDING
      }
    }),
    prisma.policyAcknowledgement.count({
      where: {
        organizationId,
        acknowledgedAt: null
      }
    }),
    prisma.complianceRequirement.findMany({
      where: {
        organizationId,
        status: ComplianceStatus.PENDING
      },
      select: {
        id: true,
        title: true,
        dueAt: true,
        employee: {
          select: {
            fullName: true
          }
        }
      },
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      take: limit
    })
  ]);

  return {
    requirements,
    metrics: {
      pending: pendingRequirements + pendingAcknowledgements
    }
  };
}

export async function getPolicyOperationalSnapshot(input: {
  organizationId: string;
  documentIds?: string[];
  employeeIds?: string[];
  limit?: number;
}) {
  const documentIds = Array.from(new Set((input.documentIds ?? []).filter(Boolean)));
  const employeeIds = Array.from(new Set((input.employeeIds ?? []).filter(Boolean)));
  const limit = input.limit ?? 5;

  const acknowledgementWhere = {
    organizationId: input.organizationId,
    ...(documentIds.length ? { documentId: { in: documentIds } } : {}),
    ...(employeeIds.length ? { employeeId: { in: employeeIds } } : {})
  };

  const acknowledgementIds = documentIds.length
    ? (
        await prisma.policyAcknowledgement.findMany({
          where: acknowledgementWhere,
          select: {
            id: true
          },
          take: 100
        })
      ).map((item) => item.id)
    : [];

  const [acknowledgements, requirements] = await Promise.all([
    prisma.policyAcknowledgement.findMany({
      where:
        documentIds.length || employeeIds.length
          ? acknowledgementWhere
          : {
              organizationId: input.organizationId,
              dueAt: {
                gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30)
              }
            },
      include: {
        employee: {
          select: {
            id: true,
            fullName: true
          }
        },
        document: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: [{ dueAt: "asc" }, { updatedAt: "desc" }],
      take: Math.max(limit * 3, 12)
    }),
    prisma.complianceRequirement.findMany({
      where: {
        organizationId: input.organizationId,
        type: ComplianceRequirementType.POLICY,
        status: ComplianceStatus.PENDING,
        ...(employeeIds.length ? { employeeId: { in: employeeIds } } : {}),
        ...(documentIds.length || acknowledgementIds.length
          ? {
              OR: [
                ...(acknowledgementIds.length
                  ? [
                      {
                        sourceType: "policy_acknowledgement",
                        sourceId: {
                          in: acknowledgementIds
                        }
                      }
                    ]
                  : []),
                ...(documentIds.length
                  ? [
                      {
                        sourceType: "knowledge_document",
                        sourceId: {
                          in: documentIds
                        }
                      }
                    ]
                  : [])
              ]
            }
          : {})
      },
      include: {
        employee: {
          select: {
            id: true,
            fullName: true
          }
        }
      },
      orderBy: [{ dueAt: "asc" }, { updatedAt: "desc" }],
      take: Math.max(limit * 2, 8)
    })
  ]);

  const pendingAcknowledgements = acknowledgements.filter((item) => !item.acknowledgedAt);
  const overdueAcknowledgements = pendingAcknowledgements.filter((item) => item.dueAt && item.dueAt.getTime() < Date.now());

  return {
    pendingAcknowledgements: pendingAcknowledgements.length,
    overdueAcknowledgements: overdueAcknowledgements.length,
    pendingPolicyRequirements: requirements.length,
    items: acknowledgements.slice(0, limit).map((item) => ({
      id: item.id,
      title: item.title,
      employeeId: item.employeeId,
      employeeName: item.employee.fullName,
      documentTitle: item.document?.title ?? null,
      dueAt: item.dueAt,
      status: item.acknowledgedAt ? ("ACKNOWLEDGED" as const) : item.dueAt && item.dueAt.getTime() < Date.now() ? ("OVERDUE" as const) : ("PENDING" as const),
      href: item.employeeId ? `/employees/${item.employeeId}` : "/people/compliance"
    })),
    requirements: requirements.slice(0, limit).map((item) => ({
      id: item.id,
      title: item.title,
      employeeId: item.employeeId,
      employeeName: item.employee.fullName,
      dueAt: item.dueAt,
      status: item.status,
      href: item.employeeId ? `/employees/${item.employeeId}` : "/people/compliance"
    }))
  };
}

export async function getSelfServicePolicyWorkspace(input: {
  organizationId: string;
  userId: string;
}) {
  const employee = await prisma.employee.findFirst({
    where: {
      organizationId: input.organizationId,
      linkedUserId: input.userId
    },
    select: {
      id: true,
      fullName: true,
      title: true,
      department: true,
      policyAcknowledgements: {
        include: {
          document: {
            select: {
              id: true,
              title: true,
              summary: true,
              versionLabel: true
            }
          }
        },
        orderBy: [{ acknowledgedAt: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }]
      },
      complianceRequirements: {
        where: {
          type: ComplianceRequirementType.POLICY
        },
        orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }]
      }
    }
  });

  if (!employee) {
    return null;
  }

  return {
    employee,
    pendingAcknowledgements: employee.policyAcknowledgements.filter((item) => !item.acknowledgedAt),
    acknowledged: employee.policyAcknowledgements.filter((item) => !!item.acknowledgedAt),
    pendingPolicyRequirements: employee.complianceRequirements.filter((item) => item.status === ComplianceStatus.PENDING)
  };
}
