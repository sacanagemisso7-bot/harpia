import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { desktopApi } from "./lib/api";
import type {
  CompanyChatActionProposal,
  CompanyChatAgentExecution,
  CompanyChatCitation,
  CompanyChatMessageMetadata,
  CompanyChatPolicyOperations,
  CompanyChatPolicyDraft
} from "../../../types/company-chat";
import type {
  DesktopAgentApprovalsResponse,
  DesktopBootstrapResponse,
  DesktopChatWorkspaceResponse,
  DesktopEventsResponse,
  DesktopInboxResponse,
  DesktopRequestsResponse,
  DesktopSessionResponse,
  DesktopTasksResponse
} from "../../../types/desktop";
import { brand } from "../../../lib/brand";

type AppView = "home" | "inbox" | "tasks" | "requests" | "calendar" | "approvals" | "chat" | "settings";
type AppTheme = "dark" | "light";

const STORAGE_KEY = "harpia-desktop-session";
const LEGACY_STORAGE_KEY = "hireflow-desktop-session";
const THEME_STORAGE_KEY = "harpia-desktop-theme";
const LEGACY_THEME_STORAGE_KEY = "hireflow-desktop-theme";
const PEOPLE_OPS_ROLES = new Set(["OWNER", "ADMIN", "PEOPLE_ADMIN", "PEOPLE_OPS", "MANAGER"]);
const DEFAULT_SUGGESTED_PROMPTS = [
  "Quais pendencias operacionais de RH merecem atencao hoje?",
  "Resuma o backlog de onboarding e offboarding da semana.",
  "Existem solicitacoes internas com SLA em risco?"
];

function loadStoredSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as { apiBase: string; token: string }) : null;
  } catch {
    return null;
  }
}

function saveStoredSession(input: { apiBase: string; token: string } | null) {
  if (!input) {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(input));
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}

function loadStoredTheme(): AppTheme {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY) ?? localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
    return raw === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

function parseMessageMetadata(metadata: unknown): CompanyChatMessageMetadata {
  if (!metadata || typeof metadata !== "object") {
    return {
      suggestedPrompts: [],
      relatedEntities: [],
      actionProposals: [],
      toolTraces: [],
      citations: [],
      emailDraft: null,
      policyDraft: null,
      policyOperations: null,
      agentExecution: null
    };
  }

  const data = metadata as Record<string, unknown>;

  return {
    suggestedPrompts: Array.isArray(data.suggestedPrompts)
      ? data.suggestedPrompts.filter((item): item is string => typeof item === "string")
      : [],
    relatedEntities: Array.isArray(data.relatedEntities)
      ? data.relatedEntities.filter(
          (item): item is CompanyChatMessageMetadata["relatedEntities"][number] =>
            !!item && typeof item === "object" && typeof (item as { id?: unknown }).id === "string"
        )
      : [],
    actionProposals: Array.isArray(data.actionProposals)
      ? data.actionProposals.filter(
          (item): item is CompanyChatActionProposal =>
            !!item && typeof item === "object" && typeof (item as { type?: unknown }).type === "string"
        )
      : [],
    toolTraces: Array.isArray(data.toolTraces)
      ? data.toolTraces.filter(
          (item): item is CompanyChatMessageMetadata["toolTraces"][number] =>
            !!item && typeof item === "object" && typeof (item as { tool?: unknown }).tool === "string"
        )
      : [],
    citations: Array.isArray(data.citations)
      ? data.citations.filter(
          (item): item is CompanyChatCitation =>
            !!item &&
            typeof item === "object" &&
            typeof (item as { id?: unknown }).id === "string" &&
            typeof (item as { documentId?: unknown }).documentId === "string" &&
            typeof (item as { title?: unknown }).title === "string" &&
            typeof (item as { excerpt?: unknown }).excerpt === "string"
        )
      : [],
    emailDraft:
      data.emailDraft && typeof data.emailDraft === "object" && typeof (data.emailDraft as { subject?: unknown }).subject === "string"
        ? {
            subject: String((data.emailDraft as { subject: unknown }).subject),
            body: String((data.emailDraft as { body: unknown }).body),
            to: typeof (data.emailDraft as { to?: unknown }).to === "string" ? String((data.emailDraft as { to?: unknown }).to) : null
          }
        : null,
    policyDraft:
      data.policyDraft &&
      typeof data.policyDraft === "object" &&
      typeof (data.policyDraft as { response?: unknown }).response === "string" &&
      typeof (data.policyDraft as { confidence?: unknown }).confidence === "string" &&
      typeof (data.policyDraft as { summary?: unknown }).summary === "string"
        ? {
            response: String((data.policyDraft as { response: unknown }).response),
            confidence: (data.policyDraft as { confidence: CompanyChatPolicyDraft["confidence"] }).confidence,
            summary: String((data.policyDraft as { summary: unknown }).summary)
          }
        : null,
    policyOperations:
      data.policyOperations &&
      typeof data.policyOperations === "object" &&
      typeof (data.policyOperations as { summary?: unknown }).summary === "string"
        ? {
            summary: String((data.policyOperations as { summary: unknown }).summary),
            pendingAcknowledgements: Number((data.policyOperations as { pendingAcknowledgements?: unknown }).pendingAcknowledgements ?? 0),
            overdueAcknowledgements: Number((data.policyOperations as { overdueAcknowledgements?: unknown }).overdueAcknowledgements ?? 0),
            pendingPolicyRequirements: Number((data.policyOperations as { pendingPolicyRequirements?: unknown }).pendingPolicyRequirements ?? 0),
            items: Array.isArray((data.policyOperations as { items?: unknown[] }).items)
              ? ((data.policyOperations as { items?: unknown[] }).items ?? []).filter(
                  (item): item is CompanyChatPolicyOperations["items"][number] =>
                    !!item &&
                    typeof item === "object" &&
                    typeof (item as { id?: unknown }).id === "string" &&
                    typeof (item as { title?: unknown }).title === "string" &&
                    typeof (item as { employeeName?: unknown }).employeeName === "string" &&
                    typeof (item as { status?: unknown }).status === "string"
                )
              : []
          }
        : null,
    agentExecution:
      data.agentExecution &&
      typeof data.agentExecution === "object" &&
      typeof (data.agentExecution as { agentRunId?: unknown }).agentRunId === "string" &&
      typeof (data.agentExecution as { actionType?: unknown }).actionType === "string"
        ? {
            agentRunId: String((data.agentExecution as { agentRunId: unknown }).agentRunId),
            actionType: (data.agentExecution as { actionType: CompanyChatAgentExecution["actionType"] }).actionType,
            status: (data.agentExecution as { status: CompanyChatAgentExecution["status"] }).status,
            mode: (data.agentExecution as { mode: CompanyChatAgentExecution["mode"] }).mode,
            riskLevel: (data.agentExecution as { riskLevel: CompanyChatAgentExecution["riskLevel"] }).riskLevel,
            requiresApproval: Boolean((data.agentExecution as { requiresApproval?: unknown }).requiresApproval),
            approvalRequestId:
              typeof (data.agentExecution as { approvalRequestId?: unknown }).approvalRequestId === "string"
                ? String((data.agentExecution as { approvalRequestId?: unknown }).approvalRequestId)
                : null,
            approvalStatus:
              typeof (data.agentExecution as { approvalStatus?: unknown }).approvalStatus === "string"
                ? ((data.agentExecution as { approvalStatus?: CompanyChatAgentExecution["approvalStatus"] }).approvalStatus ?? null)
                : null,
            executionStatus:
              typeof (data.agentExecution as { executionStatus?: unknown }).executionStatus === "string"
                ? ((data.agentExecution as { executionStatus?: CompanyChatAgentExecution["executionStatus"] }).executionStatus ?? null)
                : null,
            summary: String((data.agentExecution as { summary: unknown }).summary)
          }
        : null
  };
}

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDateTime(value: string | null, options?: Intl.DateTimeFormatOptions) {
  if (!value) {
    return "Sem data";
  }

  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    ...options
  });
}

function getPriorityLabel(priority: string) {
  const labels: Record<string, string> = {
    LOW: "Baixa",
    MEDIUM: "Media",
    HIGH: "Alta",
    URGENT: "Urgente"
  };

  return labels[priority] ?? formatEnumLabel(priority);
}

function getRequestCategoryLabel(category: string) {
  const labels: Record<string, string> = {
    VACATION: "Ferias",
    BENEFITS: "Beneficios",
    PERSONAL_DATA: "Dados cadastrais",
    DOCUMENTS: "Documentos",
    POLICY: "Politicas",
    LETTER: "Cartas e declaracoes",
    GENERAL_SUPPORT: "Suporte geral"
  };

  return labels[category] ?? formatEnumLabel(category);
}

function getToneClass(tone: "default" | "success" | "warning" | "danger" | "info") {
  return `tone-badge tone-badge-${tone}`;
}

function getPriorityTone(priority: string) {
  if (priority === "URGENT") {
    return getToneClass("danger");
  }

  if (priority === "HIGH") {
    return getToneClass("warning");
  }

  if (priority === "LOW") {
    return getToneClass("info");
  }

  return getToneClass("default");
}

function getStatusTone(status: string) {
  if (status === "DONE" || status === "RESOLVED") {
    return getToneClass("success");
  }

  if (status === "BLOCKED" || status === "CANCELED") {
    return getToneClass("danger");
  }

  if (status === "IN_PROGRESS" || status === "WAITING_ON_REQUESTER") {
    return getToneClass("warning");
  }

  return getToneClass("default");
}

function getSlaTone(status: string) {
  if (status === "BREACHED") {
    return getToneClass("danger");
  }

  if (status === "AT_RISK") {
    return getToneClass("warning");
  }

  return getToneClass("success");
}

function BrandGlyph() {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/brand/harpia-mark.png" alt="" draggable={false} />;
}

function EmptyState({ children }: { children: ReactNode }) {
  return <div className="empty-state">{children}</div>;
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="surface-card metric-card">
      <p className="eyebrow">{label}</p>
      <p className="metric-value">{value}</p>
    </article>
  );
}

export function App() {
  const storedSession = typeof window !== "undefined" ? loadStoredSession() : null;
  const storedTheme = typeof window !== "undefined" ? loadStoredTheme() : "dark";
  const [apiBase, setApiBase] = useState(storedSession?.apiBase || "http://127.0.0.1:3000");
  const [token, setToken] = useState(storedSession?.token || "");
  const [theme, setTheme] = useState<AppTheme>(storedTheme);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [activeView, setActiveView] = useState<AppView>("home");
  const [showPalette, setShowPalette] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [session, setSession] = useState<DesktopSessionResponse | null>(null);
  const [bootstrap, setBootstrap] = useState<DesktopBootstrapResponse | null>(null);
  const [inbox, setInbox] = useState<DesktopInboxResponse | null>(null);
  const [tasks, setTasks] = useState<DesktopTasksResponse["tasks"]>([]);
  const [requests, setRequests] = useState<DesktopRequestsResponse["requests"]>([]);
  const [events, setEvents] = useState<DesktopEventsResponse["events"]>([]);
  const [agentApprovals, setAgentApprovals] = useState<DesktopAgentApprovalsResponse["approvals"]>([]);
  const [recentAgentRuns, setRecentAgentRuns] = useState<DesktopAgentApprovalsResponse["recentRuns"]>([]);
  const [chatWorkspace, setChatWorkspace] = useState<DesktopChatWorkspaceResponse["workspace"] | null>(null);
  const [activeThreadId, setActiveThreadId] = useState<string | undefined>(undefined);
  const notifiedAlertKeysRef = useRef<Set<string>>(new Set());

  const activeRole = bootstrap?.user.role || session?.user.role || null;
  const canViewPeopleOpsQueues = !!activeRole && PEOPLE_OPS_ROLES.has(activeRole);
  const canReviewAgentApprovals = !!activeRole && PEOPLE_OPS_ROLES.has(activeRole);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;

    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
      localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
    } catch {
      // Ignora falhas de persistencia local para nao bloquear a UI.
    }
  }, [theme]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setShowPalette((current) => !current);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }

    saveStoredSession({ apiBase, token });
  }, [apiBase, token]);

  useEffect(() => {
    if (!token) {
      return;
    }

    let isCancelled = false;

    async function run() {
      setLoading(true);
      setError(null);

      try {
        const [bootstrapResponse, inboxResponse, chatResponse] = await Promise.all([
          desktopApi.getBootstrap(apiBase, token),
          desktopApi.getInbox(apiBase, token),
          desktopApi.getChatWorkspace(apiBase, token, activeThreadId)
        ]);

        if (isCancelled) {
          return;
        }

        setBootstrap(bootstrapResponse);
        setInbox(inboxResponse);
        setChatWorkspace(chatResponse.workspace);
        setActiveThreadId((current) => current || chatResponse.workspace.activeThread?.id || chatResponse.workspace.threads[0]?.id);
      } catch (loadError) {
        if (!isCancelled) {
          setError(loadError instanceof Error ? loadError.message : "Nao foi possivel carregar o desktop.");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    void run();

    return () => {
      isCancelled = true;
    };
  }, [apiBase, token, activeThreadId, refreshTick]);

  useEffect(() => {
    if (!token || !canViewPeopleOpsQueues) {
      return;
    }

    if (activeView !== "tasks" && activeView !== "requests" && activeView !== "calendar") {
      return;
    }

    let isCancelled = false;

    async function run() {
      setLoading(true);
      setError(null);

      try {
        if (activeView === "tasks") {
          const response = await desktopApi.getTasks(apiBase, token);
          if (!isCancelled) {
            setTasks(response.tasks);
          }
        }

        if (activeView === "requests") {
          const response = await desktopApi.getRequests(apiBase, token);
          if (!isCancelled) {
            setRequests(response.requests);
          }
        }

        if (activeView === "calendar") {
          const response = await desktopApi.getEvents(apiBase, token);
          if (!isCancelled) {
            setEvents(response.events);
          }
        }
      } catch (loadError) {
        if (!isCancelled) {
          setError(loadError instanceof Error ? loadError.message : "Nao foi possivel sincronizar as filas operacionais.");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    void run();

    return () => {
      isCancelled = true;
    };
  }, [activeView, apiBase, canViewPeopleOpsQueues, token, refreshTick]);

  useEffect(() => {
    if (!token || !canReviewAgentApprovals || activeView !== "approvals") {
      return;
    }

    let isCancelled = false;

    async function run() {
      setLoading(true);
      setError(null);

      try {
        const response = await desktopApi.getAgentApprovals(apiBase, token);

        if (!isCancelled) {
          setAgentApprovals(response.approvals);
          setRecentAgentRuns(response.recentRuns);
        }
      } catch (loadError) {
        if (!isCancelled) {
          setError(loadError instanceof Error ? loadError.message : "Nao foi possivel carregar a fila de aprovacoes do agente.");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    void run();

    return () => {
      isCancelled = true;
    };
  }, [activeView, apiBase, canReviewAgentApprovals, token, refreshTick]);

  useEffect(() => {
    if (!canViewPeopleOpsQueues && (activeView === "tasks" || activeView === "requests" || activeView === "calendar")) {
      setActiveView("home");
    }
  }, [activeView, canViewPeopleOpsQueues]);

  useEffect(() => {
    if (!canReviewAgentApprovals && activeView === "approvals") {
      setActiveView("home");
    }
  }, [activeView, canReviewAgentApprovals]);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthLoading(true);
    setError(null);

    try {
      const nextSession = await desktopApi.login(apiBase, {
        email,
        password
      });
      setSession(nextSession);
      setToken(nextSession.token);
      setActiveView("home");
      setRefreshTick((current) => current + 1);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : `Falha ao autenticar no ${brand.desktopName}.`);
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleSendChatMessage() {
    if (!chatInput.trim() || !token) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await desktopApi.sendChatMessage(apiBase, token, {
        message: chatInput,
        threadId: activeThreadId
      });
      setChatInput("");
      setActiveThreadId(response.threadId);
      setActiveView("chat");
      setRefreshTick((current) => current + 1);
    } catch (chatError) {
      setError(chatError instanceof Error ? chatError.message : "Nao foi possivel conversar com o company chat.");
    } finally {
      setLoading(false);
    }
  }

  async function handleApplyChatAction(proposal: CompanyChatActionProposal) {
    if (!token || !activeThreadId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await desktopApi.applyChatAction(apiBase, token, {
        threadId: activeThreadId,
        actionType: proposal.type,
        payload: proposal.payload
      });
      setRefreshTick((current) => current + 1);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Nao foi possivel executar a acao assistida.");
    } finally {
      setLoading(false);
    }
  }

  async function handleReviewAgentApproval(approvalRequestId: string, decision: "APPROVE" | "REJECT", notes?: string) {
    if (!token) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await desktopApi.reviewAgentApproval(apiBase, token, {
        approvalRequestId,
        decision,
        notes
      });
      setRefreshTick((current) => current + 1);
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Nao foi possivel revisar a aprovacao do agente.");
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    setToken("");
    setSession(null);
    setBootstrap(null);
    setInbox(null);
    setTasks([]);
    setRequests([]);
    setEvents([]);
    setAgentApprovals([]);
    setRecentAgentRuns([]);
    setChatWorkspace(null);
    setActiveThreadId(undefined);
    setActiveView("home");
    saveStoredSession(null);
  }

  const activeThread = chatWorkspace?.activeThread ?? null;
  const notificationItems = useMemo(() => inbox?.inbox.items.slice(0, 5) ?? [], [inbox]);
  const latestAssistantMessage = useMemo(
    () => [...(activeThread?.messages ?? [])].reverse().find((message) => message.role === "ASSISTANT") ?? null,
    [activeThread]
  );
  const latestAssistantMetadata = latestAssistantMessage ? parseMessageMetadata(latestAssistantMessage.metadata) : null;
  const suggestedPrompts =
    latestAssistantMetadata?.suggestedPrompts.length ? latestAssistantMetadata.suggestedPrompts : DEFAULT_SUGGESTED_PROMPTS;

  useEffect(() => {
    if (!token || typeof window === "undefined" || !("Notification" in window)) {
      return;
    }

    if (window.Notification.permission === "default") {
      void window.Notification.requestPermission().catch(() => null);
    }
  }, [token]);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window) || window.Notification.permission !== "granted") {
      return;
    }

    notificationItems
      .filter((item) => item.severity === "high")
      .forEach((item) => {
        const key = `${item.type}:${item.href}:${item.title}`;

        if (notifiedAlertKeysRef.current.has(key)) {
          return;
        }

        notifiedAlertKeysRef.current.add(key);

        const notification = new window.Notification(brand.desktopName, {
          body: `${item.title}\n${item.description}`
        });

        notification.onclick = () => {
          window.focus();
          setActiveView("inbox");
        };
      });
  }, [notificationItems]);

  const quickActions = [
    { label: "Resumo operacional", description: "Abrir o command center executivo.", action: () => setActiveView("home") },
    { label: "Abrir inbox", description: "Ver alertas do dia e gargalos operacionais.", action: () => setActiveView("inbox") },
    ...(canViewPeopleOpsQueues
      ? [
          { label: "Fila de tarefas", description: "Entrar no backlog operacional de people ops.", action: () => setActiveView("tasks") },
          { label: "Solicitacoes RH", description: "Abrir o service desk interno.", action: () => setActiveView("requests") },
          { label: "Eventos de hoje", description: "Ir direto para a agenda operacional.", action: () => setActiveView("calendar") }
        ]
      : []),
    ...(canReviewAgentApprovals
      ? [
          {
            label: "Aprovacoes da IA",
            description: "Revisar acoes sensiveis antes da execucao.",
            action: () => setActiveView("approvals")
          }
        ]
      : []),
    { label: "Company chat", description: "Conversar com o copiloto corporativo.", action: () => setActiveView("chat") },
    {
      label: "Riscos do RH",
      description: "Levar uma pergunta pronta para o assistente.",
      action: () => {
        setChatInput("Resuma os riscos operacionais mais importantes de people ops hoje.");
        setActiveView("chat");
      }
    }
  ];

  const navItems = [
    { id: "home" as AppView, label: "Home", badge: null as number | null },
    { id: "inbox" as AppView, label: "Inbox", badge: notificationItems.length || null },
    ...(canViewPeopleOpsQueues
      ? [
          { id: "tasks" as AppView, label: "Tarefas", badge: bootstrap?.home.metrics.overdueTasks || null },
          { id: "requests" as AppView, label: "Solicitacoes", badge: bootstrap?.home.metrics.openRequests || null },
          { id: "calendar" as AppView, label: "Eventos", badge: bootstrap?.home.metrics.eventsToday || null }
        ]
      : []),
    ...(canReviewAgentApprovals
      ? [{ id: "approvals" as AppView, label: "Aprovacoes", badge: agentApprovals.length || null }]
      : []),
    { id: "chat" as AppView, label: "Company Chat", badge: null as number | null },
    { id: "settings" as AppView, label: "Settings", badge: null as number | null }
  ];

  function renderHomeView() {
    return (
      <>
        <section className="metric-grid metric-grid-wide">
          <MetricCard label="Employees" value={bootstrap?.home.metrics.employees ?? "--"} />
          <MetricCard label="Onboarding" value={bootstrap?.home.metrics.onboardingActive ?? "--"} />
          <MetricCard label="Offboarding" value={bootstrap?.home.metrics.offboardingActive ?? "--"} />
          <MetricCard label="Open requests" value={bootstrap?.home.metrics.openRequests ?? "--"} />
          <MetricCard label="Overdue tasks" value={bootstrap?.home.metrics.overdueTasks ?? "--"} />
          <MetricCard label="Compliance pending" value={bootstrap?.home.metrics.pendingCompliance ?? "--"} />
          <MetricCard label="Events today" value={bootstrap?.home.metrics.eventsToday ?? "--"} />
          <MetricCard label="SLAs at risk" value={bootstrap?.home.metrics.requestsAtRisk ?? "--"} />
        </section>

        <section className="desktop-grid desktop-grid-top">
          <article className="surface-card hero-card">
            <p className="eyebrow">Quick actions</p>
            <h2>Opera a rotina do RH sem sair do desktop.</h2>
            <p className="hero-copy">
              Abra o backlog, entre na fila de solicitacoes, acompanhe eventos do dia ou puxe o copiloto para montar o proximo passo.
            </p>
            <div className="quick-actions">
              {quickActions.map((item) => (
                <button key={item.label} className="action-chip" onClick={item.action}>
                  {item.label}
                </button>
              ))}
            </div>
          </article>

          <article className="surface-card">
            <p className="eyebrow">Operational alerts</p>
            <div className="stack-list">
              {bootstrap?.home.alerts.length ? (
                bootstrap.home.alerts.map((alert) => (
                  <div key={`${alert.href}-${alert.title}`} className="list-row dense-row">
                    <div>
                      <p className="row-title">{alert.title}</p>
                      <p className="row-copy">{alert.description}</p>
                    </div>
                    <span className={getToneClass(alert.severity === "high" ? "danger" : "warning")}>
                      {alert.severity === "high" ? "Alta" : "Atencao"}
                    </span>
                  </div>
                ))
              ) : (
                <EmptyState>Nenhum alerta operacional critico no momento.</EmptyState>
              )}
            </div>
          </article>
        </section>

        <section className="desktop-grid desktop-grid-three">
          <article className="surface-card">
            <p className="eyebrow">People tasks</p>
            <div className="stack-list compact">
              {bootstrap?.tasks.length ? (
                bootstrap.tasks.map((task) => (
                  <div key={task.id} className="list-row task-row">
                    <div>
                      <p className="row-title">{task.title}</p>
                      <p className="row-copy">
                        {task.relatedEmployeeName ?? "Sem colaborador vinculado"} · {formatEnumLabel(task.sourceType)}
                      </p>
                    </div>
                    <div className="stack-actions">
                      <span className={getPriorityTone(task.priority)}>{getPriorityLabel(task.priority)}</span>
                      <span className="row-time">{formatDateTime(task.dueAt, { day: "2-digit", month: "short" })}</span>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState>Nenhuma tarefa operacional aberta.</EmptyState>
              )}
            </div>
          </article>

          <article className="surface-card">
            <p className="eyebrow">RH service desk</p>
            <div className="stack-list compact">
              {bootstrap?.requests.length ? (
                bootstrap.requests.map((request) => (
                  <div key={request.id} className="list-row task-row">
                    <div>
                      <p className="row-title">{request.title}</p>
                      <p className="row-copy">
                        {getRequestCategoryLabel(request.category)} · {request.requesterName ?? "Solicitante interno"}
                      </p>
                    </div>
                    <div className="stack-actions">
                      <span className={getSlaTone(request.effectiveSlaStatus)}>{formatEnumLabel(request.effectiveSlaStatus)}</span>
                      <span className={getStatusTone(request.status)}>{formatEnumLabel(request.status)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState>Nenhuma solicitacao aberta na fila interna.</EmptyState>
              )}
            </div>
          </article>

          <article className="surface-card">
            <p className="eyebrow">Calendar and milestones</p>
            <div className="stack-list compact">
              {bootstrap?.events.length ? (
                bootstrap.events.map((event) => (
                  <div key={event.id} className="list-row task-row">
                    <div>
                      <p className="row-title">{event.title}</p>
                      <p className="row-copy">{event.employeeName ?? "Evento interno da empresa"}</p>
                    </div>
                    <div className="stack-actions">
                      <span className={getToneClass("info")}>{formatEnumLabel(event.type)}</span>
                      <span className="row-time">{formatDateTime(event.startsAt)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState>Sem eventos operacionais para hoje.</EmptyState>
              )}
            </div>
          </article>
        </section>

        <article className="surface-card secondary-surface">
          <div className="surface-heading">
            <div>
              <p className="eyebrow">Hiring module</p>
              <p className="row-title">Hiring continua vivo, mas como modulo complementar.</p>
            </div>
            <span className={getToneClass("default")}>Companion module</span>
          </div>
          <div className="metric-grid metric-grid-compact">
            <div className="mini-metric">
              <span>Vagas</span>
              <strong>{bootstrap?.home.hiring.jobCount ?? "--"}</strong>
            </div>
            <div className="mini-metric">
              <span>Aplicacoes</span>
              <strong>{bootstrap?.home.hiring.applicationCount ?? "--"}</strong>
            </div>
            <div className="mini-metric">
              <span>SLAs hiring</span>
              <strong>{bootstrap?.home.hiring.slaAlerts ?? "--"}</strong>
            </div>
          </div>
        </article>
      </>
    );
  }

  function renderInboxView() {
    return (
      <>
        <section className="metric-grid">
          <MetricCard label="Open requests" value={inbox?.inbox.metrics.openRequests ?? "--"} />
          <MetricCard label="Overdue tasks" value={inbox?.inbox.metrics.overdueTasks ?? "--"} />
          <MetricCard label="Pending compliance" value={inbox?.inbox.metrics.pendingCompliance ?? "--"} />
          <MetricCard label="Requests at risk" value={inbox?.inbox.metrics.requestsAtRisk ?? "--"} />
        </section>

        <article className="surface-card">
          <p className="eyebrow">Operational inbox</p>
          <div className="stack-list">
            {inbox?.inbox.items.length ? (
              inbox.inbox.items.map((item) => (
                <div key={`${item.type}-${item.href}-${item.title}`} className="list-row inbox-row">
                  <div>
                    <p className="row-title">{item.title}</p>
                    <p className="row-copy">{item.description}</p>
                  </div>
                  <div className="stack-actions">
                    <span className={getToneClass(item.severity === "high" ? "danger" : "warning")}>
                      {item.severity === "high" ? "Alta prioridade" : "Atencao"}
                    </span>
                    <span className="row-time">{item.href}</span>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState>Inbox limpa. Nenhum item critico no momento.</EmptyState>
            )}
          </div>
        </article>
      </>
    );
  }

  function renderTasksView() {
    return (
      <article className="surface-card">
        <div className="surface-heading">
          <div>
            <p className="eyebrow">People tasks</p>
            <p className="row-title">Backlog operacional de RH e people ops</p>
          </div>
          <span className={getToneClass("default")}>{tasks.length} itens</span>
        </div>
        <div className="stack-list">
          {tasks.length ? (
            tasks.map((task) => (
              <div key={task.id} className="list-row task-row task-row-expanded">
                <div>
                  <p className="row-title">{task.title}</p>
                  <p className="row-copy">
                    {task.relatedEmployeeName ?? "Sem colaborador vinculado"} · Responsavel: {task.assigneeName ?? "Nao atribuido"}
                  </p>
                  <p className="row-copy">Origem: {formatEnumLabel(task.sourceType)}</p>
                </div>
                <div className="stack-actions stack-actions-wide">
                  <span className={getStatusTone(task.status)}>{formatEnumLabel(task.status)}</span>
                  <span className={getPriorityTone(task.priority)}>{getPriorityLabel(task.priority)}</span>
                  <span className="row-time">{formatDateTime(task.dueAt, { day: "2-digit", month: "short" })}</span>
                </div>
              </div>
            ))
          ) : (
            <EmptyState>Nenhuma tarefa carregada ainda para esta fila.</EmptyState>
          )}
        </div>
      </article>
    );
  }

  function renderRequestsView() {
    return (
      <article className="surface-card">
        <div className="surface-heading">
          <div>
            <p className="eyebrow">Internal RH service desk</p>
            <p className="row-title">Fila operacional de solicitacoes internas</p>
          </div>
          <span className={getToneClass("default")}>{requests.length} itens</span>
        </div>
        <div className="stack-list">
          {requests.length ? (
            requests.map((request) => (
              <div key={request.id} className="list-row task-row task-row-expanded">
                <div>
                  <p className="row-title">{request.title}</p>
                  <p className="row-copy">
                    {getRequestCategoryLabel(request.category)} · {request.requesterName ?? "Solicitante interno"}
                  </p>
                  <p className="row-copy">Responsavel: {request.assigneeName ?? "Fila sem owner"}</p>
                </div>
                <div className="stack-actions stack-actions-wide">
                  <span className={getStatusTone(request.status)}>{formatEnumLabel(request.status)}</span>
                  <span className={getPriorityTone(request.priority)}>{getPriorityLabel(request.priority)}</span>
                  <span className={getSlaTone(request.effectiveSlaStatus)}>{formatEnumLabel(request.effectiveSlaStatus)}</span>
                  <span className="row-time">{formatDateTime(request.dueAt, { day: "2-digit", month: "short" })}</span>
                </div>
              </div>
            ))
          ) : (
            <EmptyState>Nenhuma solicitacao aberta foi carregada.</EmptyState>
          )}
        </div>
      </article>
    );
  }

  function renderCalendarView() {
    return (
      <article className="surface-card">
        <div className="surface-heading">
          <div>
            <p className="eyebrow">People calendar</p>
            <p className="row-title">Eventos, marcos e compromissos operacionais</p>
          </div>
          <span className={getToneClass("default")}>{events.length} eventos</span>
        </div>
        <div className="stack-list">
          {events.length ? (
            events.map((event) => (
              <div key={event.id} className="list-row task-row task-row-expanded">
                <div>
                  <p className="row-title">{event.title}</p>
                  <p className="row-copy">{event.employeeName ?? "Evento interno sem colaborador principal"}</p>
                  {event.description ? <p className="row-copy">{event.description}</p> : null}
                </div>
                <div className="stack-actions stack-actions-wide">
                  <span className={getToneClass("info")}>{formatEnumLabel(event.type)}</span>
                  <span className="row-time">{formatDateTime(event.startsAt)}</span>
                  {event.endsAt ? <span className="row-time">{formatDateTime(event.endsAt)}</span> : null}
                </div>
              </div>
            ))
          ) : (
            <EmptyState>Sem eventos carregados para o calendario operacional.</EmptyState>
          )}
        </div>
      </article>
    );
  }

  function renderApprovalsView() {
    return (
      <div className="desktop-grid desktop-grid-top">
        <article className="surface-card">
          <div className="surface-heading">
            <div>
              <p className="eyebrow">Agent approvals</p>
              <p className="row-title">Fila nativa de checkpoints humanos</p>
            </div>
            <span className={getToneClass("warning")}>{agentApprovals.length} pendencias</span>
          </div>
          <div className="stack-list">
            {agentApprovals.length ? (
              agentApprovals.map((approval) => (
                <div key={approval.id} className="list-row task-row task-row-expanded">
                  <div>
                    <p className="row-title">{approval.title}</p>
                    <p className="row-copy">{approval.summary}</p>
                    <p className="row-copy">
                      {approval.requestedByName ?? "Usuario do workspace"} · {formatDateTime(approval.createdAt)}
                    </p>
                    <p className="row-copy">{approval.threadTitle ?? "Sem thread vinculada"}</p>
                  </div>
                  <div className="stack-actions stack-actions-wide">
                    <span className={getToneClass(approval.riskLevel === "HIGH" || approval.riskLevel === "CRITICAL" ? "danger" : "warning")}>
                      {formatEnumLabel(approval.riskLevel)}
                    </span>
                    <span className={getStatusTone(approval.status)}>{formatEnumLabel(approval.status)}</span>
                    {approval.threadId ? (
                      <button
                        className="secondary-button"
                        onClick={() => {
                          setActiveThreadId(approval.threadId ?? undefined);
                          setActiveView("chat");
                        }}
                      >
                        Abrir chat
                      </button>
                    ) : null}
                    <button className="primary-button" onClick={() => void handleReviewAgentApproval(approval.id, "APPROVE")}>
                      Aprovar
                    </button>
                    <button className="secondary-button" onClick={() => void handleReviewAgentApproval(approval.id, "REJECT")}>
                      Rejeitar
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState>Nenhuma aprovacao pendente no momento.</EmptyState>
            )}
          </div>
        </article>

        <article className="surface-card">
          <div className="surface-heading">
            <div>
              <p className="eyebrow">Recent runs</p>
              <p className="row-title">Historico curto do que a IA executou</p>
            </div>
            <span className={getToneClass("default")}>{recentAgentRuns.length} runs</span>
          </div>
          <div className="stack-list">
            {recentAgentRuns.length ? (
              recentAgentRuns.map((run) => (
                <div key={run.id} className="list-row task-row task-row-expanded">
                  <div>
                    <p className="row-title">{run.summary ?? run.goal}</p>
                    <p className="row-copy">
                      {run.startedByName ?? "Agente"} · {formatDateTime(run.createdAt)}
                    </p>
                    {run.error ? <p className="row-copy">{run.error}</p> : null}
                  </div>
                  <div className="stack-actions stack-actions-wide">
                    <span className={getStatusTone(run.status)}>{formatEnumLabel(run.status)}</span>
                    <span className={getToneClass(run.riskLevel === "HIGH" || run.riskLevel === "CRITICAL" ? "danger" : "info")}>
                      {formatEnumLabel(run.riskLevel)}
                    </span>
                    {run.latestApprovalStatus ? (
                      <span className={getStatusTone(run.latestApprovalStatus)}>{formatEnumLabel(run.latestApprovalStatus)}</span>
                    ) : null}
                    {run.latestExecutionStatus ? (
                      <span className={getStatusTone(run.latestExecutionStatus)}>{formatEnumLabel(run.latestExecutionStatus)}</span>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <EmptyState>Sem runs recentes suficientes para exibir.</EmptyState>
            )}
          </div>
        </article>
      </div>
    );
  }

  function renderSettingsView() {
    return (
      <article className="surface-card">
        <p className="eyebrow">Desktop settings</p>
        <div className="settings-grid">
          <label className="field">
            <span>API base</span>
            <input value={apiBase} onChange={(event) => setApiBase(event.target.value)} />
          </label>
          <div className="setting-toggle">
            <div>
              <p className="row-title">Notificacoes</p>
              <p className="row-copy">Preparado para alertas locais de onboarding, SLA, compliance e company chat.</p>
            </div>
            <div className="status-pill status-pill-dark">Ready</div>
          </div>
          <div className="setting-toggle">
            <div>
              <p className="row-title">Auto-update</p>
              <p className="row-copy">Base Tauri estruturada para evoluir update seguro sem transformar o app em wrapper.</p>
            </div>
            <div className="status-pill status-pill-dark">Prepared</div>
          </div>
        </div>
      </article>
    );
  }

  function renderChatView() {
    return (
      <article className="surface-card chat-stage">
        <p className="eyebrow">Company chat</p>
        <div className="chat-stage-layout">
          <div className="chat-thread-list">
            {chatWorkspace?.threads.length ? (
              chatWorkspace.threads.map((thread) => (
                <button
                  key={thread.id}
                  className={`thread-item ${activeThreadId === thread.id ? "active" : ""}`}
                  onClick={() => setActiveThreadId(thread.id)}
                >
                  <p className="row-title">{thread.title}</p>
                  <p className="row-copy">{thread.latestMessage ?? "Sem mensagens ainda"}</p>
                </button>
              ))
            ) : (
              <EmptyState>Nenhuma thread ainda. Comece uma conversa com o copiloto.</EmptyState>
            )}
          </div>
          <div className="chat-thread-panel">
            <div className="chat-thread">
              {activeThread?.messages.length ? (
                activeThread.messages.map((message) => {
                  const metadata = parseMessageMetadata(message.metadata);

                  return (
                    <div
                      key={message.id}
                      className={`chat-bubble ${
                        message.role === "ASSISTANT" ? "chat-bubble-ai" : message.role === "USER" ? "chat-bubble-user" : "chat-bubble-system"
                      }`}
                    >
                      <p>{message.content}</p>
                      {metadata.toolTraces.length ? (
                        <div className="trace-row">
                          {metadata.toolTraces.map((trace, index) => (
                            <span key={`${message.id}-${trace.tool}-${index}`} className="trace-chip">
                              {trace.tool}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {metadata.policyDraft ? (
                        <div className="proposal-stack">
                          <div className="proposal-card">
                            <strong>{metadata.policyDraft.summary}</strong>
                            <span>{formatEnumLabel(metadata.policyDraft.confidence)} - resposta ancorada em knowledge base</span>
                            <span>{metadata.policyDraft.response}</span>
                          </div>
                        </div>
                      ) : null}
                      {metadata.policyOperations ? (
                        <div className="proposal-stack">
                          <div className="proposal-card">
                            <strong>{metadata.policyOperations.summary}</strong>
                            <span>
                              {metadata.policyOperations.pendingAcknowledgements} pendentes - {metadata.policyOperations.overdueAcknowledgements} atrasados
                            </span>
                          </div>
                        </div>
                      ) : null}
                      {metadata.citations.length ? (
                        <div className="proposal-stack">
                          {metadata.citations.map((citation) => (
                            <div key={`${message.id}-${citation.id}`} className="proposal-card">
                              <strong>{citation.title}</strong>
                              <span>{citation.position !== null && citation.position !== undefined ? `Trecho ${citation.position + 1}` : "Documento interno"}</span>
                              <span>{citation.excerpt}</span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      {metadata.agentExecution ? (
                        <div className="proposal-stack">
                          <div className="proposal-card">
                            <strong>{metadata.agentExecution.summary}</strong>
                            <span>
                              {formatEnumLabel(metadata.agentExecution.status)} · {formatEnumLabel(metadata.agentExecution.riskLevel)}
                            </span>
                            {metadata.agentExecution.approvalStatus ? (
                              <span>{formatEnumLabel(metadata.agentExecution.approvalStatus)}</span>
                            ) : null}
                            {metadata.agentExecution.status === "WAITING_APPROVAL" &&
                            canReviewAgentApprovals &&
                            metadata.agentExecution.approvalRequestId ? (
                              <div className="quick-actions">
                                <button
                                  className="primary-button"
                                  onClick={() => void handleReviewAgentApproval(metadata.agentExecution!.approvalRequestId!, "APPROVE")}
                                >
                                  Aprovar
                                </button>
                                <button
                                  className="secondary-button"
                                  onClick={() => void handleReviewAgentApproval(metadata.agentExecution!.approvalRequestId!, "REJECT")}
                                >
                                  Rejeitar
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                      {metadata.actionProposals.length ? (
                        <div className="proposal-stack">
                          {metadata.actionProposals.map((proposal, index) => (
                            <button
                              key={`${message.id}-${proposal.label}-${index}`}
                              className="proposal-card"
                              onClick={() => handleApplyChatAction(proposal)}
                            >
                              <strong>{proposal.label}</strong>
                              <span>{proposal.description}</span>
                              <span>
                                {proposal.riskLevel ? formatEnumLabel(proposal.riskLevel) : "Baixo risco"}
                                {proposal.requiresApproval ? " · Requer aprovacao" : ""}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <EmptyState>Inicie uma conversa para ativar o copiloto corporativo.</EmptyState>
              )}
            </div>
            <div className="chat-prompt-row">
              {suggestedPrompts.map((prompt) => (
                <button key={prompt} className="prompt-chip" onClick={() => setChatInput(prompt)}>
                  {prompt}
                </button>
              ))}
            </div>
            <form
              className="chat-input-row"
              onSubmit={(event) => {
                event.preventDefault();
                void handleSendChatMessage();
              }}
            >
              <input
                className="chat-input"
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                placeholder="Pergunte sobre onboarding, solicitacoes, tarefas, documentos, politicas ou hiring"
              />
              <button className="primary-button" type="submit" disabled={loading}>
                {loading ? "..." : "Enviar"}
              </button>
            </form>
          </div>
        </div>
      </article>
    );
  }

  if (!token) {
    return (
      <div className="desktop-auth">
        <div className="auth-panel">
          <div className="auth-brand-row">
            <div className="auth-brand">
              <div className="brand-icon" aria-hidden="true">
                <BrandGlyph />
              </div>
              <div>
                <p className="brand-title">{brand.desktopName}</p>
                <p className="brand-subtitle">Strategic operations client</p>
              </div>
            </div>
            <div className="theme-toggle" role="tablist" aria-label="Selecionar tema">
              <button
                type="button"
                className={`theme-toggle-button ${theme === "light" ? "active" : ""}`}
                onClick={() => setTheme("light")}
              >
                Claro
              </button>
              <button
                type="button"
                className={`theme-toggle-button ${theme === "dark" ? "active" : ""}`}
                onClick={() => setTheme("dark")}
              >
                Escuro
              </button>
            </div>
          </div>

          <div className="auth-copy">
            <p className="eyebrow">{brand.desktopName}</p>
            <h1>Entre no ambiente operacional da sua organizacao.</h1>
            <p>
              O desktop do {brand.name} concentra people ops, service desk interno, tarefas, documentos e company chat
              em uma experiencia nativa, mais focada e mais rapida para o dia a dia.
            </p>
          </div>

          <form className="auth-form" onSubmit={handleLogin}>
            <label className="field">
              <span>API base</span>
              <input value={apiBase} onChange={(event) => setApiBase(event.target.value)} />
            </label>
            <label className="field">
              <span>Email</span>
              <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@empresa.com" />
            </label>
            <label className="field">
              <span>Senha</span>
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Sua senha" />
            </label>
            {error ? <p className="status-error">{error}</p> : null}
            <button className="primary-button large" type="submit" disabled={authLoading}>
              {authLoading ? "Conectando..." : `Entrar no ${brand.name}`}
            </button>
          </form>
        </div>

        <div className="auth-preview">
          <div className="preview-card">
            <p className="eyebrow">O que muda aqui</p>
            <ul>
              <li>Home executiva para operacao interna</li>
              <li>Inbox com alertas de people ops e service desk</li>
              <li>Fila de tarefas, solicitacoes e eventos em cliente nativo</li>
              <li>Company chat sempre acessivel para leitura e acoes assistidas</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="desktop-frame">
      {showPalette ? (
        <div className="palette-overlay" onClick={() => setShowPalette(false)}>
          <div className="palette-panel" onClick={(event) => event.stopPropagation()}>
            <p className="eyebrow">Command palette</p>
            <h2>Acoes rapidas para a operacao interna</h2>
            <div className="palette-grid">
              {quickActions.map((item) => (
                <button
                  key={item.label}
                  className="palette-item"
                  onClick={() => {
                    item.action();
                    setShowPalette(false);
                  }}
                >
                  <strong>{item.label}</strong>
                  <span>{item.description}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <aside className="desktop-sidebar">
        <div className="brand-block">
          <div className="brand-icon" aria-hidden="true">
            <BrandGlyph />
          </div>
          <div>
            <p className="brand-title">{brand.desktopName}</p>
            <p className="brand-subtitle">People and internal operations</p>
          </div>
        </div>

        <nav className="desktop-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeView === item.id ? "active" : ""}`}
              onClick={() => setActiveView(item.id)}
            >
              <span>{item.label}</span>
              {item.badge ? <span className="nav-badge">{item.badge}</span> : null}
            </button>
          ))}
        </nav>

        <div className="workspace-card">
          <p className="eyebrow">Workspace</p>
          <p className="workspace-name">{bootstrap?.user.organizationName || session?.user.organizationName || brand.name}</p>
          <p className="workspace-meta">{activeRole ? formatEnumLabel(activeRole) : "Internal operations team"}</p>
        </div>

        <div className="sidebar-utility-card">
          <p className="eyebrow">Desktop mode</p>
          <p className="row-title">Native operations surface</p>
          <p className="row-copy">Leitura rapida, quick actions, company chat e sincronizacao direta com a plataforma.</p>
        </div>

        <button className="secondary-button" onClick={handleLogout}>
          Sair
        </button>
      </aside>

      <main className="desktop-main">
        <header className="desktop-header">
          <div>
            <p className="eyebrow">{brand.desktopName}</p>
            <h1>{bootstrap?.user.organizationName || `${brand.name} Workspace`}</h1>
            <p className="header-copy">
              Cliente nativo para operar pessoas, service desk interno, compliance leve, agenda operacional e company chat.
            </p>
          </div>
          <div className="header-actions">
            <div className="theme-toggle" role="tablist" aria-label="Selecionar tema">
              <button
                type="button"
                className={`theme-toggle-button ${theme === "light" ? "active" : ""}`}
                onClick={() => setTheme("light")}
              >
                Claro
              </button>
              <button
                type="button"
                className={`theme-toggle-button ${theme === "dark" ? "active" : ""}`}
                onClick={() => setTheme("dark")}
              >
                Escuro
              </button>
            </div>
            <button className="secondary-button" onClick={() => setRefreshTick((current) => current + 1)}>
              Atualizar
            </button>
            <button className="secondary-button" onClick={() => setShowPalette(true)}>
              Ctrl/Cmd + K
            </button>
            <div className="status-pill">{loading ? "Syncing..." : "Superficie operacional nativa"}</div>
          </div>
        </header>

        {error ? <div className="alert-strip alert-strip-error">{error}</div> : null}

        <section className="desktop-content-grid">
          <div className="desktop-workspace">
            {activeView === "home" ? renderHomeView() : null}
            {activeView === "inbox" ? renderInboxView() : null}
            {activeView === "tasks" ? renderTasksView() : null}
            {activeView === "requests" ? renderRequestsView() : null}
            {activeView === "calendar" ? renderCalendarView() : null}
            {activeView === "approvals" ? renderApprovalsView() : null}
            {activeView === "settings" ? renderSettingsView() : null}
            {activeView === "chat" ? renderChatView() : null}
          </div>

          <aside className="desktop-side-rail">
            <div className="surface-card">
              <p className="eyebrow">Centro de alertas</p>
              <div className="stack-list compact">
                {notificationItems.length ? (
                  notificationItems.map((item) => (
                    <div key={`${item.type}-${item.title}`} className="list-row notification-row">
                      <div>
                        <p className="row-title">{item.title}</p>
                        <p className="row-copy">{item.description}</p>
                      </div>
                      <span className={getToneClass(item.severity === "high" ? "danger" : "warning")}>
                        {item.severity === "high" ? "Alta" : "Atencao"}
                      </span>
                    </div>
                  ))
                ) : (
                  <EmptyState>Sem alertas novos.</EmptyState>
                )}
              </div>
            </div>

            <div className="surface-card">
              <p className="eyebrow">Daily pulse</p>
              <div className="pulse-stack">
                <div className="pulse-row">
                  <span>Onboarding ativo</span>
                  <strong>{bootstrap?.home.metrics.onboardingActive ?? "--"}</strong>
                </div>
                <div className="pulse-row">
                  <span>Solicitacoes abertas</span>
                  <strong>{bootstrap?.home.metrics.openRequests ?? "--"}</strong>
                </div>
                <div className="pulse-row">
                  <span>Compliance pendente</span>
                  <strong>{bootstrap?.home.metrics.pendingCompliance ?? "--"}</strong>
                </div>
                <div className="pulse-row">
                  <span>SLAs em risco</span>
                  <strong>{bootstrap?.home.metrics.requestsAtRisk ?? "--"}</strong>
                </div>
              </div>
            </div>

            <div className="surface-card">
              <p className="eyebrow">Assistant context</p>
              {latestAssistantMetadata ? (
                <div className="assistant-context">
                  {latestAssistantMetadata.emailDraft ? (
                    <div className="context-card">
                      <p className="row-title">{latestAssistantMetadata.emailDraft.subject}</p>
                      <p className="row-copy">{latestAssistantMetadata.emailDraft.to ?? "Sem destinatario sugerido"}</p>
                    </div>
                  ) : null}
                  {latestAssistantMetadata.agentExecution ? (
                    <div className="context-card">
                      <p className="row-title">{latestAssistantMetadata.agentExecution.summary}</p>
                      <p className="row-copy">
                        {formatEnumLabel(latestAssistantMetadata.agentExecution.status)} ·{" "}
                        {formatEnumLabel(latestAssistantMetadata.agentExecution.riskLevel)}
                      </p>
                    </div>
                  ) : null}
                  {latestAssistantMetadata.policyDraft ? (
                    <div className="context-card">
                      <p className="row-title">Policy assistant</p>
                      <p className="row-copy">
                        {formatEnumLabel(latestAssistantMetadata.policyDraft.confidence)} · {latestAssistantMetadata.policyDraft.summary}
                      </p>
                    </div>
                  ) : null}
                  {latestAssistantMetadata.policyOperations ? (
                    <div className="context-card">
                      <p className="row-title">Status operacional</p>
                      <p className="row-copy">{latestAssistantMetadata.policyOperations.summary}</p>
                    </div>
                  ) : null}
                  {latestAssistantMetadata.toolTraces.map((trace, index) => (
                    <div key={`${trace.tool}-${index}`} className="context-card">
                      <p className="row-title">{trace.tool}</p>
                      <p className="row-copy">{trace.summary}</p>
                    </div>
                  ))}
                  {latestAssistantMetadata.policyOperations?.items.map((item) => (
                    <div key={item.id} className="context-card">
                      <p className="row-title">{item.title}</p>
                      <p className="row-copy">
                        {item.employeeName}
                        {item.documentTitle ? ` · ${item.documentTitle}` : ""}
                      </p>
                    </div>
                  ))}
                  {latestAssistantMetadata.citations.map((citation) => (
                    <div key={citation.id} className="context-card">
                      <p className="row-title">{citation.title}</p>
                      <p className="row-copy">{citation.excerpt}</p>
                    </div>
                  ))}
                  {latestAssistantMetadata.relatedEntities.map((entity) => (
                    <div key={entity.id} className="context-card">
                      <p className="row-title">{entity.label}</p>
                      <p className="row-copy">{entity.type}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState>O contexto lateral aparece conforme o company chat trabalha.</EmptyState>
              )}
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
