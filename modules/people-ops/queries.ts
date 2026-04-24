import { unstable_cache } from "next/cache";
import { PeopleWorkflowKind, PeopleWorkflowRunStatus, PeopleWorkflowStepStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma/client";
import { getComplianceDashboardSnapshot } from "@/modules/compliance/queries";
import { getHrRequestDashboardSnapshot } from "@/modules/hr-requests/queries";
import { getPeopleTaskDashboardSnapshot } from "@/modules/people-tasks/queries";
import { listRecentWatchtowerRuns } from "@/modules/watchtower/queries";

export async function listWorkflowRunsByKind(
  organizationId: string,
  kind: PeopleWorkflowKind,
  options?: {
    status?: PeopleWorkflowRunStatus;
    take?: number;
  }
) {
  return prisma.peopleWorkflowRun.findMany({
    where: {
      organizationId,
      kind,
      ...(options?.status ? { status: options.status } : {})
    },
    include: {
      employee: {
        select: {
          id: true,
          fullName: true,
          title: true,
          department: true,
          status: true
        }
      },
      steps: {
        orderBy: [{ order: "asc" }]
      }
    },
    orderBy: [{ startedAt: "desc" }],
    ...(options?.take ? { take: options.take } : {})
  });
}

export async function listUpcomingPeopleEvents(organizationId: string, limit = 12) {
  return prisma.peopleEvent.findMany({
    where: {
      organizationId,
      startsAt: {
        gte: new Date(new Date().setHours(0, 0, 0, 0))
      }
    },
    include: {
      relatedEmployee: {
        select: {
          id: true,
          fullName: true,
          title: true
        }
      }
    },
    orderBy: [{ startsAt: "asc" }],
    take: limit
  });
}

async function listWorkflowRunsForDashboard(organizationId: string, kind: PeopleWorkflowKind) {
  return prisma.peopleWorkflowRun.findMany({
    where: {
      organizationId,
      kind,
      status: PeopleWorkflowRunStatus.ACTIVE
    },
    select: {
      id: true,
      kind: true,
      employee: {
        select: {
          id: true,
          fullName: true,
          title: true,
          department: true,
          status: true
        }
      },
      steps: {
        select: {
          id: true,
          status: true,
          title: true
        },
        orderBy: {
          order: "asc"
        },
        take: 8
      }
    },
    orderBy: {
      startedAt: "desc"
    },
    take: 2
  });
}

async function getHiringDashboardLite(organizationId: string) {
  const jobCount = await prisma.job.count({
    where: {
      organizationId
    }
  });

  const applicationCount = await prisma.application.count({
    where: {
      organizationId
    }
  });

  const applications = await prisma.application.findMany({
    where: {
      organizationId
    },
    select: {
      id: true,
      score: true,
      appliedAt: true,
      candidate: {
        select: {
          fullName: true
        }
      },
      job: {
        select: {
          title: true
        }
      },
      currentStage: {
        select: {
          name: true,
          isTerminal: true
        }
      }
    },
    orderBy: [{ score: "desc" }, { updatedAt: "desc" }],
    take: 8
  });

  const activeApplications = applications.filter((application) => !application.currentStage?.isTerminal);

  const decisionNetwork = activeApplications
    .map((application) => {
      const stagnantHours = Math.max(1, Math.round((Date.now() - application.appliedAt.getTime()) / (1000 * 60 * 60)));

      return {
        id: application.id,
        candidateName: application.candidate.fullName,
        jobTitle: application.job.title,
        score: application.score ?? 0,
        stageName: application.currentStage?.name ?? "Sem etapa",
        stagnantHours,
        href: `/applications/${application.id}`
      };
    })
    .slice(0, 12);

  return {
    applicationCount,
    decisionNetwork,
    intelligenceHighlights: decisionNetwork
      .filter((application) => application.score >= 80 || application.stagnantHours >= 72)
      .slice(0, 4)
      .map((application) => ({
        id: application.id,
        candidateName: application.candidateName,
        jobTitle: application.jobTitle,
        score: application.score,
        stageName: application.stageName,
        href: application.href
      })),
    jobCount,
    slaAlerts: []
  };
}

async function loadPeopleDashboard(organizationId: string) {
  // Keep dashboard SSR gentle on small production pools. It is better to show a fast,
  // useful cockpit than to fan out many Prisma queries and block the whole page.
  const employeeCount = await prisma.employee.count({
    where: {
      organizationId
    }
  });
  const onboardingActiveCount = await prisma.peopleWorkflowRun.count({
    where: {
      organizationId,
      kind: PeopleWorkflowKind.ONBOARDING,
      status: PeopleWorkflowRunStatus.ACTIVE
    }
  });
  const offboardingActiveCount = await prisma.peopleWorkflowRun.count({
    where: {
      organizationId,
      kind: PeopleWorkflowKind.OFFBOARDING,
      status: PeopleWorkflowRunStatus.ACTIVE
    }
  });
  const events = await listUpcomingPeopleEvents(organizationId, 6);
  const watchtowerRuns = await listRecentWatchtowerRuns(organizationId, 2);
  const onboardingRuns = await listWorkflowRunsForDashboard(organizationId, PeopleWorkflowKind.ONBOARDING);
  const offboardingRuns = await listWorkflowRunsForDashboard(organizationId, PeopleWorkflowKind.OFFBOARDING);
  const tasks = await getPeopleTaskDashboardSnapshot(organizationId, 4);
  const requestSummary = await getHrRequestDashboardSnapshot(organizationId, 4);
  const complianceSummary = await getComplianceDashboardSnapshot(organizationId, 4);
  const hiring = await getHiringDashboardLite(organizationId);

  const todaysEvents = events.filter((event) => {
    const startsAt = event.startsAt;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    return startsAt >= todayStart && startsAt <= todayEnd;
  });

  const blockedWorkflowSteps = [...onboardingRuns, ...offboardingRuns].flatMap((run) =>
    run.steps
      .filter((step) => step.status === PeopleWorkflowStepStatus.BLOCKED)
      .map((step) => ({
        runId: run.id,
        employeeId: run.employee.id,
        employeeName: run.employee.fullName,
        title: step.title,
        kind: run.kind
      }))
  );

  const alerts = [
    ...watchtowerRuns.map((run) => ({
      type: "watchtower" as const,
      title: run.summary ?? "Watchtower executou uma nova varredura operacional.",
      description:
        run.status === "FAILED"
          ? run.error ?? "A varredura automática encontrou um erro e precisa de revisão."
          : "Leitura automática do agente sobre gargalos, pendências e riscos operacionais.",
      href: "/people/command-center",
      severity: run.riskLevel === "HIGH" || run.riskLevel === "CRITICAL" ? ("high" as const) : ("medium" as const)
    })),
    ...tasks.tasks.slice(0, 3).map((task) => ({
      type: "overdue_task" as const,
      title: `Tarefa vencida: ${task.title}`,
      description: task.relatedEmployee ? `${task.relatedEmployee.fullName} segue com pendência operacional.` : "Há uma tarefa operacional atrasada.",
      href: "/people/tasks",
      severity: "high" as const
    })),
    ...requestSummary.requests
      .filter((request) => request.effectiveSlaStatus !== "ON_TRACK")
      .slice(0, 3)
      .map((request) => ({
        type: "hr_request" as const,
        title: `${request.title} com SLA ${request.effectiveSlaStatus.toLowerCase()}`,
        description: `Solicitação em ${request.status.toLowerCase()} na fila interna.`,
        href: "/requests",
        severity: request.effectiveSlaStatus === "BREACHED" ? ("high" as const) : ("medium" as const)
      })),
    ...blockedWorkflowSteps.slice(0, 3).map((step) => ({
      type: "workflow_blocked" as const,
      title: `${step.employeeName} com etapa bloqueada`,
      description: `${step.title} no fluxo de ${step.kind.toLowerCase()}.`,
      href: step.kind === PeopleWorkflowKind.ONBOARDING ? "/people/onboarding" : "/people/offboarding",
      severity: "medium" as const
    }))
  ].slice(0, 8);

  return {
    metrics: {
      employees: employeeCount,
      onboardingActive: onboardingActiveCount,
      offboardingActive: offboardingActiveCount,
      openRequests: requestSummary.metrics.open,
      overdueTasks: tasks.overdueCount,
      pendingCompliance: complianceSummary.metrics.pending,
      eventsToday: todaysEvents.length,
      requestsAtRisk: requestSummary.metrics.atRisk + requestSummary.metrics.breached
    },
    alerts,
    requests: requestSummary.requests,
    overdueTasks: tasks.tasks,
    onboarding: onboardingRuns.slice(0, 4),
    offboarding: offboardingRuns.slice(0, 4),
    events: events.slice(0, 6),
    compliance: complianceSummary.requirements,
    hiring: {
      jobCount: hiring.jobCount,
      applicationCount: hiring.applicationCount,
      slaAlerts: hiring.slaAlerts.length,
      intelligenceHighlights: hiring.intelligenceHighlights,
      decisionNetwork: hiring.decisionNetwork
    }
  };
}

const getPeopleDashboardCached = unstable_cache(loadPeopleDashboard, ["people-dashboard"], {
  revalidate: 15
});

function getEmptyPeopleDashboard() {
  return {
    metrics: {
      employees: 0,
      onboardingActive: 0,
      offboardingActive: 0,
      openRequests: 0,
      overdueTasks: 0,
      pendingCompliance: 0,
      eventsToday: 0,
      requestsAtRisk: 0
    },
    alerts: [
      {
        type: "watchtower" as const,
        title: "Dashboard em modo rapido",
        description: "Os dados detalhados ainda estao carregando. Use os modulos laterais para operar normalmente.",
        href: "/people/command-center",
        severity: "medium" as const
      }
    ],
    requests: [],
    overdueTasks: [],
    onboarding: [],
    offboarding: [],
    events: [],
    compliance: [],
    hiring: {
      jobCount: 0,
      applicationCount: 0,
      slaAlerts: 0,
      intelligenceHighlights: [],
      decisionNetwork: []
    }
  };
}

function withDashboardTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T) {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => {
      setTimeout(() => resolve(fallback), timeoutMs);
    })
  ]);
}

export async function getPeopleDashboard(organizationId: string) {
  try {
    return await withDashboardTimeout(getPeopleDashboardCached(organizationId), 2500, getEmptyPeopleDashboard());
  } catch (error) {
    console.error("[dashboard] failed to load people dashboard", error);
    return getEmptyPeopleDashboard();
  }
}
