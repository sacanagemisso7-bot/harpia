import type { CompanyChatMessageMetadata } from "./company-chat";

export type DesktopSessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  organizationId: string;
  organizationName: string;
};

export type DesktopMembership = {
  organizationId: string;
  organizationName: string;
  role: string;
  isDefault: boolean;
};

export type DesktopSessionResponse = {
  ok: true;
  token: string;
  user: DesktopSessionUser;
  memberships: DesktopMembership[];
};

export type DesktopBootstrapResponse = {
  ok: true;
  user: DesktopSessionUser;
  home: {
    metrics: {
      employees: number;
      onboardingActive: number;
      offboardingActive: number;
      openRequests: number;
      overdueTasks: number;
      pendingCompliance: number;
      eventsToday: number;
      requestsAtRisk: number;
    };
    alerts: Array<{
      title: string;
      description: string;
      href: string;
      severity: "high" | "medium";
    }>;
    hiring: {
      jobCount: number;
      applicationCount: number;
      slaAlerts: number;
    };
  };
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    dueAt: string | null;
    sourceType: string;
    assigneeName: string | null;
    relatedEmployeeName: string | null;
  }>;
  requests: Array<{
    id: string;
    title: string;
    status: string;
    category: string;
    priority: string;
    effectiveSlaStatus: string;
    dueAt: string | null;
    assigneeName: string | null;
    requesterName: string | null;
  }>;
  events: Array<{
    id: string;
    title: string;
    type: string;
    startsAt: string;
    endsAt: string | null;
    description: string | null;
    employeeName: string | null;
  }>;
};

export type DesktopInboxResponse = {
  ok: true;
  inbox: {
    items: Array<{
      type: string;
      title: string;
      description: string;
      href: string;
      severity: "high" | "medium";
    }>;
    metrics: {
      openRequests: number;
      overdueTasks: number;
      pendingCompliance: number;
      requestsAtRisk: number;
    };
  };
};

export type DesktopTasksResponse = {
  ok: true;
  tasks: DesktopBootstrapResponse["tasks"];
};

export type DesktopRequestsResponse = {
  ok: true;
  requests: DesktopBootstrapResponse["requests"];
};

export type DesktopEventsResponse = {
  ok: true;
  events: DesktopBootstrapResponse["events"];
};

export type DesktopAgentApprovalsResponse = {
  ok: true;
  approvals: Array<{
    id: string;
    title: string;
    summary: string;
    riskLevel: string;
    status: string;
    createdAt: string;
    expiresAt: string | null;
    requestedByName: string | null;
    requestedByEmail: string | null;
    threadId: string | null;
    threadTitle: string | null;
  }>;
  recentRuns: Array<{
    id: string;
    goal: string;
    summary: string | null;
    status: string;
    riskLevel: string;
    requiresApproval: boolean;
    createdAt: string;
    startedByName: string | null;
    latestApprovalStatus: string | null;
    latestExecutionStatus: string | null;
    error: string | null;
  }>;
};

export type DesktopChatWorkspaceResponse = {
  ok: true;
  workspace: {
    threads: Array<{
      id: string;
      title: string;
      scope: string;
      lastMessageAt: string;
      latestMessage: string | null;
    }>;
    activeThread: {
      id: string;
      title: string;
      scope: string;
      messages: Array<{
        id: string;
        role: string;
        content: string;
        createdAt: string;
        metadata: CompanyChatMessageMetadata | null;
      }>;
    } | null;
  };
};
