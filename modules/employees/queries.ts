import { prisma } from "@/lib/prisma/client";

export async function listEmployees(organizationId: string) {
  return prisma.employee.findMany({
    where: {
      organizationId
    },
    include: {
      manager: {
        select: {
          id: true,
          fullName: true,
          title: true
        }
      },
      directReports: {
        select: {
          id: true
        }
      },
      workflowRuns: {
        where: {
          status: "ACTIVE"
        },
        include: {
          steps: true
        }
      }
    },
    orderBy: [{ createdAt: "desc" }]
  });
}

export async function getEmployeeProfile(organizationId: string, employeeId: string) {
  return prisma.employee.findFirst({
    where: {
      id: employeeId,
      organizationId
    },
    include: {
      manager: {
        select: {
          id: true,
          fullName: true,
          title: true
        }
      },
      directReports: {
        select: {
          id: true,
          fullName: true,
          title: true
        },
        orderBy: [{ fullName: "asc" }]
      },
      workflowRuns: {
        include: {
          steps: {
            orderBy: [{ order: "asc" }]
          }
        },
        orderBy: [{ startedAt: "desc" }]
      },
      assignedTasks: {
        include: {
          assigneeUser: {
            select: {
              id: true,
              name: true
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
        orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }]
      },
      relatedTasks: {
        include: {
          assigneeUser: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }]
      },
      requestedHrRequests: {
        include: {
          assigneeUser: {
            select: {
              id: true,
              name: true
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
      },
      complianceRequirements: {
        orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }]
      },
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
      checkIns: {
        include: {
          author: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: [{ createdAt: "desc" }]
      },
      peopleEvents: {
        orderBy: [{ startsAt: "asc" }]
      }
    }
  });
}

export async function listEmployeesForSelect(organizationId: string) {
  return prisma.employee.findMany({
    where: {
      organizationId
    },
    select: {
      id: true,
      fullName: true,
      title: true,
      department: true
    },
    orderBy: [{ fullName: "asc" }]
  });
}
