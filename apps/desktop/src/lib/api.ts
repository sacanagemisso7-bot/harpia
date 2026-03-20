import type {
  DesktopAgentApprovalsResponse,
  DesktopBootstrapResponse,
  DesktopChatWorkspaceResponse,
  DesktopEventsResponse,
  DesktopInboxResponse,
  DesktopRequestsResponse,
  DesktopSessionResponse,
  DesktopTasksResponse
} from "../../../../types/desktop";

type RequestOptions = {
  method?: "GET" | "POST";
  body?: unknown;
  token?: string | null;
};

async function requestJson<T>(baseUrl: string, path: string, options?: RequestOptions): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options?.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options?.token ? { Authorization: `Bearer ${options.token}` } : {})
    },
    body: options?.body ? JSON.stringify(options.body) : undefined
  });

  const payload = (await response.json().catch(() => null)) as T | { error?: string } | null;

  if (!response.ok) {
    throw new Error((payload as { error?: string } | null)?.error || "Request failed");
  }

  return payload as T;
}

export const desktopApi = {
  login(baseUrl: string, input: { email: string; password: string; organizationId?: string }) {
    return requestJson<DesktopSessionResponse>(baseUrl, "/api/v1/desktop/session", {
      method: "POST",
      body: input
    });
  },
  getBootstrap(baseUrl: string, token: string) {
    return requestJson<DesktopBootstrapResponse>(baseUrl, "/api/v1/desktop/bootstrap", {
      token
    });
  },
  getInbox(baseUrl: string, token: string) {
    return requestJson<DesktopInboxResponse>(baseUrl, "/api/v1/desktop/inbox", {
      token
    });
  },
  getTasks(baseUrl: string, token: string) {
    return requestJson<DesktopTasksResponse>(baseUrl, "/api/v1/desktop/tasks", {
      token
    });
  },
  getRequests(baseUrl: string, token: string) {
    return requestJson<DesktopRequestsResponse>(baseUrl, "/api/v1/desktop/requests", {
      token
    });
  },
  getEvents(baseUrl: string, token: string) {
    return requestJson<DesktopEventsResponse>(baseUrl, "/api/v1/desktop/events", {
      token
    });
  },
  getAgentApprovals(baseUrl: string, token: string) {
    return requestJson<DesktopAgentApprovalsResponse>(baseUrl, "/api/v1/desktop/approvals", {
      token
    });
  },
  getChatWorkspace(baseUrl: string, token: string, threadId?: string) {
    const suffix = threadId ? `?threadId=${encodeURIComponent(threadId)}` : "";
    return requestJson<DesktopChatWorkspaceResponse>(baseUrl, `/api/v1/desktop/chat/threads${suffix}`, {
      token
    });
  },
  sendChatMessage(baseUrl: string, token: string, input: { message: string; threadId?: string }) {
    return requestJson<{ ok: true; threadId: string }>(baseUrl, "/api/v1/desktop/chat/messages", {
      method: "POST",
      token,
      body: input
    });
  },
  applyChatAction(
    baseUrl: string,
    token: string,
    input: { threadId: string; actionType: string; payload: Record<string, unknown> }
  ) {
    return requestJson<{ ok: true; summary: string }>(baseUrl, "/api/v1/desktop/chat/actions", {
      method: "POST",
      token,
      body: input
    });
  },
  reviewAgentApproval(
    baseUrl: string,
    token: string,
    input: { approvalRequestId: string; decision: "APPROVE" | "REJECT"; notes?: string }
  ) {
    return requestJson<{ ok: true; summary: string }>(baseUrl, "/api/v1/desktop/approvals", {
      method: "POST",
      token,
      body: input
    });
  }
};
