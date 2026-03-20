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
