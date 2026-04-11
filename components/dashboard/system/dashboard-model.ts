import type { Route } from "next";

import type { AppPermission } from "@/lib/auth/permission-matrix";

export type DashboardData = {
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
    type: string;
    title: string;
    description: string;
    href: string;
    severity: "high" | "medium";
  }>;
  requests: Array<{
    id: string;
    title: string;
    status: string;
    effectiveSlaStatus: string;
    assigneeUser: { name: string } | null;
  }>;
  overdueTasks: Array<{
    id: string;
    title: string;
    status: string;
    isOverdue: boolean;
    relatedEmployee: { fullName: string; title: string } | null;
    assigneeUser: { name: string | null } | null;
  }>;
  onboarding: Array<{
    id: string;
    employee: { fullName: string; title: string };
    steps: Array<{ status: string }>;
  }>;
  offboarding: Array<{
    id: string;
    employee: { fullName: string; title: string };
    steps: Array<{ status: string }>;
  }>;
  compliance: Array<{
    id: string;
    title: string;
    employee: { fullName: string } | null;
    dueAt: Date | null;
  }>;
  events: Array<{
    id: string;
    title: string;
    startsAt: Date;
    relatedEmployee: { id: string; fullName: string; title: string } | null;
  }>;
  hiring: {
    jobCount: number;
    applicationCount: number;
    slaAlerts: number;
    intelligenceHighlights: Array<{
      id: string;
      candidateName: string;
      jobTitle: string;
      score: number;
      stageName: string;
      href: string;
    }>;
    decisionNetwork: Array<{
      id: string;
      candidateName: string;
      jobTitle: string;
      score: number;
      stageName: string;
      stagnantHours: number;
      href: string;
    }>;
  };
};

export type DashboardViewer = {
  name?: string | null;
  organizationName: string;
  role: string;
};

export type DashboardFocusItem = {
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  value: string;
  tone: "critical" | "attention" | "stable";
  href: Route;
  source: "priority" | "hiring" | "operations";
  insights: string[];
};

export type HarpiaClusterId = "candidates" | "analysis" | "decision";

export type HarpiaSidebarItem = {
  id: string;
  label: string;
  href: Route;
  icon: "home" | "chat" | "people" | "desk" | "jobs" | "settings";
  permission?: AppPermission;
};

export type HarpiaCluster = {
  id: HarpiaClusterId;
  label: string;
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
  note: string;
  route: Route;
};

export type HarpiaNode = {
  id: string;
  label: string;
  subtitle: string;
  score: number;
  staleHours: number;
  stage: string;
  href: string;
  cluster: HarpiaClusterId;
  emphasis: "neutral" | "highlighted";
  x: number;
  y: number;
  radius: number;
};

export type HarpiaEdge = {
  id: string;
  from: string;
  to: string;
  emphasis: "soft" | "highlighted";
};

export type HarpiaClusterSummary = HarpiaCluster & {
  count: number;
  highlighted: number;
  averageScore: number;
};

export type HarpiaGraphModel = {
  width: number;
  height: number;
  clusters: HarpiaClusterSummary[];
  nodes: HarpiaNode[];
  edges: HarpiaEdge[];
};

export const FIELD_WIDTH = 1040;
export const FIELD_HEIGHT = 700;

export const sidebarItems: HarpiaSidebarItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: "home" },
  { id: "chat", label: "Chat", href: "/chat", icon: "chat", permission: "view_chat" },
  { id: "employees", label: "Employees", href: "/employees", icon: "people", permission: "view_employees" },
  { id: "requests", label: "Desk", href: "/requests", icon: "desk", permission: "view_hr_requests" },
  { id: "jobs", label: "Hiring", href: "/hiring", icon: "jobs" },
  { id: "settings", label: "Settings", href: "/settings", icon: "settings", permission: "manage_workspace" }
];

const clusterBlueprints: HarpiaCluster[] = [
  {
    id: "candidates",
    label: "Candidatos",
    x: 222,
    y: 424,
    radiusX: 144,
    radiusY: 126,
    note: "Entrada de sinal",
    route: "/hiring"
  },
  {
    id: "analysis",
    label: "Análise",
    x: 524,
    y: 238,
    radiusX: 172,
    radiusY: 112,
    note: "Filtro em curso",
    route: "/people/command-center"
  },
  {
    id: "decision",
    label: "Decisão",
    x: 810,
    y: 398,
    radiusX: 152,
    radiusY: 130,
    note: "Janela de decisão",
    route: "/requests"
  }
];

function compact(value: string) {
  return value.length > 20 ? `${value.slice(0, 20)}...` : value;
}

function classifyCluster(input: { score: number; stage: string; staleHours: number }): HarpiaClusterId {
  const stage = input.stage.toLowerCase();

  if (input.score >= 86 || stage.includes("entrevista") || stage.includes("offer")) {
    return "decision";
  }

  if (input.staleHours >= 72 || input.score >= 74 || stage.includes("review") || stage.includes("triagem")) {
    return "analysis";
  }

  return "candidates";
}

function fallbackSignals(data: DashboardData) {
  return [
    ...data.onboarding.slice(0, 2).map((entry, index) => ({
      id: `onboarding-${entry.id}`,
      label: compact(entry.employee.fullName),
      subtitle: entry.employee.title,
      score: 68 + index * 3,
      staleHours: 10 + index * 6,
      stage: "Onboarding",
      href: "/people/onboarding",
      cluster: "candidates" as const,
      emphasis: "neutral" as const
    })),
    ...data.compliance.slice(0, 2).map((entry, index) => ({
      id: `compliance-${entry.id}`,
      label: compact(entry.employee?.fullName ?? "Compliance"),
      subtitle: entry.title,
      score: 78 - index * 2,
      staleHours: 32 + index * 7,
      stage: "Compliance",
      href: "/people/compliance",
      cluster: "analysis" as const,
      emphasis: "highlighted" as const
    })),
    ...data.alerts.slice(0, 2).map((entry, index) => ({
      id: `alert-${index}`,
      label: compact(entry.title.replace(/^Tarefa vencida:\s*/i, "")),
      subtitle: "Risco operacional",
      score: entry.severity === "high" ? 90 : 82,
      staleHours: 48 + index * 8,
      stage: "Alert",
      href: entry.href,
      cluster: entry.severity === "high" ? ("decision" as const) : ("analysis" as const),
      emphasis: "highlighted" as const
    })),
    ...data.offboarding.slice(0, 2).map((entry, index) => ({
      id: `offboarding-${entry.id}`,
      label: compact(entry.employee.fullName),
      subtitle: entry.employee.title,
      score: 74 - index * 2,
      staleHours: 18 + index * 5,
      stage: "Offboarding",
      href: "/people/offboarding",
      cluster: "decision" as const,
      emphasis: "neutral" as const
    }))
  ];
}

function connect(edges: HarpiaEdge[], registry: Set<string>, from: HarpiaNode, to: HarpiaNode, emphasis: HarpiaEdge["emphasis"]) {
  const key = [from.id, to.id].sort().join("::");
  if (registry.has(key)) {
    return;
  }

  registry.add(key);
  edges.push({
    id: `${from.id}-${to.id}`,
    from: from.id,
    to: to.id,
    emphasis
  });
}

export function buildGraphModel(data: DashboardData): HarpiaGraphModel {
  const rawSignals = [
    ...data.hiring.decisionNetwork.map((entry) => ({
      id: entry.id,
      label: compact(entry.candidateName),
      subtitle: entry.jobTitle,
      score: entry.score,
      staleHours: entry.stagnantHours,
      stage: entry.stageName,
      href: entry.href,
      cluster: classifyCluster({ score: entry.score, staleHours: entry.stagnantHours, stage: entry.stageName }),
      emphasis: entry.score >= 84 || entry.stagnantHours >= 72 ? ("highlighted" as const) : ("neutral" as const)
    })),
    ...data.hiring.intelligenceHighlights.map((entry, index) => ({
      id: `${entry.id}-highlight-${index}`,
      label: compact(entry.candidateName),
      subtitle: entry.jobTitle,
      score: entry.score,
      staleHours: 56,
      stage: entry.stageName,
      href: entry.href,
      cluster: classifyCluster({ score: entry.score, staleHours: 56, stage: entry.stageName }),
      emphasis: "highlighted" as const
    })),
    ...fallbackSignals(data)
  ].reduce<
    Array<{
      id: string;
      label: string;
      subtitle: string;
      score: number;
      staleHours: number;
      stage: string;
      href: string;
      cluster: HarpiaClusterId;
      emphasis: "neutral" | "highlighted";
    }>
  >((accumulator, signal) => {
    if (accumulator.some((entry) => entry.label === signal.label && entry.subtitle === signal.subtitle)) {
      return accumulator;
    }

    accumulator.push(signal);
    return accumulator;
  }, []);

  const nodes: HarpiaNode[] = [];

  clusterBlueprints.forEach((cluster) => {
    const clusterSignals = rawSignals
      .filter((signal) => signal.cluster === cluster.id)
      .sort((left, right) => {
        const emphasisDelta = Number(right.emphasis === "highlighted") - Number(left.emphasis === "highlighted");
        if (emphasisDelta !== 0) {
          return emphasisDelta;
        }

        return right.score - left.score || left.staleHours - right.staleHours;
      })
      .slice(0, 4);

    const startAngle =
      cluster.id === "candidates" ? Math.PI * 0.74 : cluster.id === "analysis" ? Math.PI * 1.08 : -Math.PI * 0.18;
    const sweep = cluster.id === "analysis" ? Math.PI * 0.9 : Math.PI * 0.82;

    clusterSignals.forEach((signal, index) => {
      const spread = Math.max(clusterSignals.length - 1, 1);
      const ratio = clusterSignals.length === 1 ? 0.5 : index / spread;
      const angle = startAngle + sweep * ratio;
      const wobbleX = (index % 2 === 0 ? -1 : 1) * (10 + (index % 3) * 6);
      const wobbleY = ((index + 1) % 2 === 0 ? -1 : 1) * (12 + (index % 4) * 4);
      const radiusFactor = 0.72 + (index % 3) * 0.08;

      nodes.push({
        ...signal,
        x: cluster.x + Math.cos(angle) * cluster.radiusX * radiusFactor + wobbleX,
        y: cluster.y + Math.sin(angle) * cluster.radiusY * radiusFactor + wobbleY,
        radius: 8 + Math.max(0, Math.min(10, signal.score / 11))
      });
    });
  });

  const edges: HarpiaEdge[] = [];
  const registry = new Set<string>();

  clusterBlueprints.forEach((cluster) => {
    const clusterNodes = nodes
      .filter((node) => node.cluster === cluster.id)
      .sort((left, right) => right.score - left.score || left.staleHours - right.staleHours);

    const anchor = clusterNodes[0];
    if (anchor) {
      clusterNodes.slice(1).forEach((node, index) => {
        connect(edges, registry, anchor, node, index < 2 || node.emphasis === "highlighted" ? "highlighted" : "soft");
      });
    }

    clusterNodes.forEach((node, index) => {
      const next = clusterNodes[index + 1];
      if (next) {
        connect(
          edges,
          registry,
          node,
          next,
          node.emphasis === "highlighted" || next.emphasis === "highlighted" ? "highlighted" : "soft"
        );
      }
    });
  });

  const lead = {
    candidates: nodes.filter((node) => node.cluster === "candidates").sort((a, b) => b.score - a.score).slice(0, 2),
    analysis: nodes.filter((node) => node.cluster === "analysis").sort((a, b) => b.score - a.score).slice(0, 2),
    decision: nodes.filter((node) => node.cluster === "decision").sort((a, b) => b.score - a.score).slice(0, 2)
  };

  if (lead.candidates[0] && lead.analysis[0]) {
    connect(edges, registry, lead.candidates[0], lead.analysis[0], "highlighted");
  }

  if (lead.analysis[0] && lead.decision[0]) {
    connect(edges, registry, lead.analysis[0], lead.decision[0], "highlighted");
  }

  if (lead.candidates[1] && lead.analysis[1]) {
    connect(edges, registry, lead.candidates[1], lead.analysis[1], "soft");
  }

  if (lead.analysis[1] && lead.decision[1]) {
    connect(edges, registry, lead.analysis[1], lead.decision[1], "soft");
  }

  const clusters = clusterBlueprints.map((cluster) => {
    const clusterNodes = nodes.filter((node) => node.cluster === cluster.id);

    return {
      ...cluster,
      count: clusterNodes.length,
      highlighted: clusterNodes.filter((node) => node.emphasis === "highlighted").length,
      averageScore: clusterNodes.length
        ? Math.round(clusterNodes.reduce((total, node) => total + node.score, 0) / clusterNodes.length)
        : 0
    };
  });

  return {
    width: FIELD_WIDTH,
    height: FIELD_HEIGHT,
    clusters,
    nodes,
    edges
  };
}

export function buildContextInsights(node: HarpiaNode, data: DashboardData) {
  return [
    node.score >= 84 ? "Sinal forte para avancar." : node.score >= 72 ? "Leitura pede validacao." : "Entrada ainda aberta.",
    node.staleHours >= 72 ? `Sem movimento ha ${node.staleHours}h.` : `Fluxo ativo nas ultimas ${node.staleHours}h.`,
    node.cluster === "decision"
      ? `${data.metrics.requestsAtRisk} fluxos pedem ação imediata.`
      : node.cluster === "analysis"
        ? `${data.metrics.pendingCompliance + data.metrics.overdueTasks} pontos seguem em filtro.`
        : `${data.hiring.applicationCount} aplicações ativas no campo.`
  ];
}
