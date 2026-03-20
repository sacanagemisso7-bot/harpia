import { AgentApprovalStatus } from "@prisma/client";

import { listAgentApprovalRequests, listRecentAgentRuns } from "@/modules/ai-agent/queries";
import { getPeopleDashboard, listUpcomingPeopleEvents } from "@/modules/people-ops/queries";
import { getHrRequestQueueSummary } from "@/modules/hr-requests/queries";
import { listPeopleTasks } from "@/modules/people-tasks/queries";

export async function getDesktopOperationalHome(organizationId: string) {
  const [dashboard, tasks, requests, events] = await Promise.all([
    getPeopleDashboard(organizationId),
    listPeopleTasks(organizationId),
    getHrRequestQueueSummary(organizationId),
    listUpcomingPeopleEvents(organizationId, 8)
  ]);

  return {
    dashboard,
    tasks: tasks.slice(0, 8),
    requests: requests.requests.slice(0, 8),
    events: events.slice(0, 8)
  };
}

export async function getDesktopOperationalInbox(organizationId: string) {
  const dashboard = await getPeopleDashboard(organizationId);

  return {
    items: dashboard.alerts,
    metrics: {
      openRequests: dashboard.metrics.openRequests,
      overdueTasks: dashboard.metrics.overdueTasks,
      pendingCompliance: dashboard.metrics.pendingCompliance,
      requestsAtRisk: dashboard.metrics.requestsAtRisk
    }
  };
}

export async function getDesktopAgentApprovals(organizationId: string) {
  const [approvals, recentRuns] = await Promise.all([
    listAgentApprovalRequests(organizationId, AgentApprovalStatus.PENDING),
    listRecentAgentRuns(organizationId, 8)
  ]);

  return {
    approvals,
    recentRuns
  };
}
