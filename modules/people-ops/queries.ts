import { PeopleWorkflowKind, PeopleWorkflowRunStatus, PeopleWorkflowStepStatus } from "@prisma/client";

import { getDashboardMetrics } from "@/lib/dashboard/queries";
import { prisma } from "@/lib/prisma/client";
import { getComplianceSummary } from "@/modules/compliance/queries";
import { getHrRequestQueueSummary } from "@/modules/hr-requests/queries";
import { listPeopleTasks } from "@/modules/people-tasks/queries";
import { listRecentWatchtowerRuns } from "@/modules/watchtower/queries";

export async function listWorkflowRunsByKind(organizationId: string, kind: PeopleWorkflowKind) {
  return prisma.peopleWorkflowRun.findMany({
    where: {
      organizationId,
      kind
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
    orderBy: [{ startedAt: "desc" }]
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

export async function getPeopleDashboard(organizationId: string) {
  const [employeeCount, onboardingRuns, offboardingRuns, tasks, requestSummary, complianceSummary, events, hiring, watchtowerRuns] =
    await Promise.all([
      prisma.employee.count({
        where: {
          organizationId
        }
      }),
      listWorkflowRunsByKind(organizationId, PeopleWorkflowKind.ONBOARDING),
      listWorkflowRunsByKind(organizationId, PeopleWorkflowKind.OFFBOARDING),
      listPeopleTasks(organizationId),
      getHrRequestQueueSummary(organizationId),
      getComplianceSummary(organizationId),
      listUpcomingPeopleEvents(organizationId, 8),
      getDashboardMetrics(organizationId),
      listRecentWatchtowerRuns(organizationId, 2)
    ]);

  const activeOnboarding = onboardingRuns.filter((run) => run.status === PeopleWorkflowRunStatus.ACTIVE);
  const activeOffboarding = offboardingRuns.filter((run) => run.status === PeopleWorkflowRunStatus.ACTIVE);
  const overdueTasks = tasks.filter((task) => task.isOverdue);
  const todaysEvents = events.filter((event) => {
    const startsAt = event.startsAt;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    return startsAt >= todayStart && startsAt <= todayEnd;
  });
  const blockedWorkflowSteps = [...activeOnboarding, ...activeOffboarding].flatMap((run) =>
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
          ? run.error ?? "A varredura automatica encontrou um erro e precisa de revisao."
          : "Leitura automatica do agente sobre gargalos, pendencias e riscos operacionais.",
      href: "/people/command-center",
      severity: run.riskLevel === "HIGH" || run.riskLevel === "CRITICAL" ? ("high" as const) : ("medium" as const)
    })),
    ...overdueTasks.slice(0, 3).map((task) => ({
      type: "overdue_task" as const,
      title: `Tarefa vencida: ${task.title}`,
      description: task.relatedEmployee ? `${task.relatedEmployee.fullName} segue com pendencia operacional.` : "Ha uma tarefa operacional atrasada.",
      href: "/people/tasks",
      severity: "high" as const
    })),
    ...requestSummary.requests
      .filter((request) => request.effectiveSlaStatus !== "ON_TRACK")
      .slice(0, 3)
      .map((request) => ({
        type: "hr_request" as const,
        title: `${request.title} com SLA ${request.effectiveSlaStatus.toLowerCase()}`,
        description: `Solicitacao em ${request.status.toLowerCase()} na fila interna.`,
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
      onboardingActive: activeOnboarding.length,
      offboardingActive: activeOffboarding.length,
      openRequests: requestSummary.metrics.open,
      overdueTasks: overdueTasks.length,
      pendingCompliance: complianceSummary.metrics.pending,
      eventsToday: todaysEvents.length,
      requestsAtRisk: requestSummary.metrics.atRisk + requestSummary.metrics.breached
    },
    alerts,
    requests: requestSummary.requests.slice(0, 6),
    overdueTasks: overdueTasks.slice(0, 6),
    onboarding: activeOnboarding.slice(0, 4),
    offboarding: activeOffboarding.slice(0, 4),
    events: events.slice(0, 6),
    compliance: complianceSummary.requirements.slice(0, 6),
    hiring: {
      jobCount: hiring.jobCount,
      applicationCount: hiring.applicationCount,
      slaAlerts: hiring.slaAlerts.length,
      intelligenceHighlights: hiring.intelligenceHighlights,
      decisionNetwork: hiring.decisionNetwork
    }
  };
}
