import { PeopleTaskStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma/client";
import { isTaskOverdue } from "@/modules/people-tasks/service";

export async function listPeopleTasks(organizationId: string) {
  const tasks = await prisma.peopleTask.findMany({
    where: {
      organizationId
    },
    include: {
      assigneeUser: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      assigneeEmployee: {
        select: {
          id: true,
          fullName: true,
          title: true
        }
      },
      relatedEmployee: {
        select: {
          id: true,
          fullName: true,
          title: true
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
  });

  return tasks.map((task) => ({
    ...task,
    isOverdue: isTaskOverdue(task)
  }));
}

export async function getPeopleTaskDashboardSnapshot(organizationId: string, limit = 6) {
  const now = new Date();
  const [overdueCount, tasks] = await Promise.all([
    prisma.peopleTask.count({
      where: {
        organizationId,
        dueAt: {
          lt: now
        },
        status: {
          not: PeopleTaskStatus.DONE
        }
      }
    }),
    prisma.peopleTask.findMany({
      where: {
        organizationId,
        dueAt: {
          lt: now
        },
        status: {
          not: PeopleTaskStatus.DONE
        }
      },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueAt: true,
        sourceType: true,
        assigneeEmployee: {
          select: {
            fullName: true
          }
        },
        relatedEmployee: {
          select: {
            fullName: true,
            title: true
          }
        },
        assigneeUser: {
          select: {
            name: true
          }
        }
      },
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      take: limit
    })
  ]);

  return {
    overdueCount,
    tasks: tasks.map((task) => ({
      ...task,
      isOverdue: isTaskOverdue(task)
    }))
  };
}

export async function getPeopleTaskSummary(organizationId: string) {
  const tasks = await listPeopleTasks(organizationId);

  return {
    tasks,
    metrics: {
      total: tasks.length,
      overdue: tasks.filter((task) => task.isOverdue).length,
      blocked: tasks.filter((task) => task.status === PeopleTaskStatus.BLOCKED).length,
      inProgress: tasks.filter((task) => task.status === PeopleTaskStatus.IN_PROGRESS).length
    }
  };
}
