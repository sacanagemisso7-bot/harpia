import { HrRequestStatus, PeopleTaskStatus } from "@prisma/client";

export type AiTriageLevel = "low" | "medium" | "high" | "critical";

export type AiTriageSignal = {
  urgency: AiTriageLevel;
  risk: AiTriageLevel;
  ownerArea: string;
  nextAction: string;
  canAutoResolve: boolean;
  reason: string;
  knowledgeHint: string;
  automationPrompt: string;
};

type HrRequestTriageInput = {
  title: string;
  description: string;
  category: string;
  priority: string;
  status: HrRequestStatus;
  effectiveSlaStatus: string;
  assigneeName?: string | null;
  requesterName?: string | null;
  commentCount: number;
};

type PeopleTaskTriageInput = {
  title: string;
  description?: string | null;
  priority: string;
  status: PeopleTaskStatus;
  sourceType: string;
  isOverdue: boolean;
  assigneeName?: string | null;
  relatedEmployeeName?: string | null;
  commentCount: number;
};

function normalize(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function maxLevel(...levels: AiTriageLevel[]): AiTriageLevel {
  const weight: Record<AiTriageLevel, number> = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4
  };

  return levels.reduce((highest, level) => (weight[level] > weight[highest] ? level : highest), "low");
}

function priorityToLevel(priority: string): AiTriageLevel {
  const normalized = normalize(priority);

  if (normalized.includes("urgent")) {
    return "critical";
  }

  if (normalized.includes("high") || normalized.includes("alta")) {
    return "high";
  }

  if (normalized.includes("medium") || normalized.includes("media")) {
    return "medium";
  }

  return "low";
}

function areaFromText(text: string, fallback: string) {
  const normalized = normalize(text);

  if (normalized.includes("benef") || normalized.includes("plano") || normalized.includes("seguro")) {
    return "Benefícios";
  }

  if (normalized.includes("ferias") || normalized.includes("ausencia") || normalized.includes("folga")) {
    return "People Ops";
  }

  if (normalized.includes("document") || normalized.includes("declar") || normalized.includes("carta")) {
    return "Administração";
  }

  if (normalized.includes("politica") || normalized.includes("compliance") || normalized.includes("lgpd")) {
    return "Compliance";
  }

  if (normalized.includes("onboarding") || normalized.includes("admiss")) {
    return "Onboarding";
  }

  return fallback;
}

function knowledgeHintFromText(text: string) {
  const normalized = normalize(text);

  if (normalized.includes("ferias") || normalized.includes("ausencia")) {
    return "Política de férias e ausências";
  }

  if (normalized.includes("benef")) {
    return "Política de benefícios";
  }

  if (normalized.includes("document") || normalized.includes("declar")) {
    return "Documentos de RH";
  }

  if (normalized.includes("compliance") || normalized.includes("politica")) {
    return "Política interna relacionada";
  }

  if (normalized.includes("onboarding")) {
    return "Checklist de onboarding";
  }

  return "Base de conhecimento relacionada";
}

export function buildHrRequestTriage(input: HrRequestTriageInput): AiTriageSignal {
  const text = `${input.title} ${input.description} ${input.category}`;
  const normalized = normalize(text);
  const priorityLevel = priorityToLevel(input.priority);
  const slaLevel =
    input.effectiveSlaStatus === "BREACHED" ? "critical" : input.effectiveSlaStatus === "AT_RISK" ? "high" : "low";
  const ownerLevel = input.assigneeName ? "low" : "high";
  const urgency = maxLevel(priorityLevel, slaLevel, ownerLevel);
  const risk = maxLevel(
    slaLevel,
    normalized.includes("lgpd") || normalized.includes("compliance") || normalized.includes("legal") ? "high" : "low",
    input.status === HrRequestStatus.WAITING_ON_REQUESTER && input.commentCount > 2 ? "medium" : "low"
  );
  const canAutoResolve =
    risk !== "critical" &&
    input.assigneeName !== null &&
    input.assigneeName !== undefined &&
    (normalized.includes("declaracao") ||
      normalized.includes("documento") ||
      normalized.includes("duvida") ||
      input.category === "GENERAL_SUPPORT");

  const nextAction =
    input.effectiveSlaStatus === "BREACHED"
      ? "Escalar agora"
      : !input.assigneeName
        ? "Definir responsável"
        : input.status === HrRequestStatus.WAITING_ON_REQUESTER
          ? "Cobrar retorno"
          : canAutoResolve
            ? "Resolver com IA"
            : "Responder solicitante";

  return {
    urgency,
    risk,
    ownerArea: areaFromText(text, "People Ops"),
    nextAction,
    canAutoResolve,
    reason:
      input.effectiveSlaStatus === "BREACHED"
        ? "SLA estourado e impacto operacional imediato."
        : !input.assigneeName
          ? "Sem dono claro, a fila tende a travar."
          : risk === "high"
            ? "Há sinais de política, compliance ou histórico sensível."
            : "Baixo risco e contexto suficiente para encaminhar rápido.",
    knowledgeHint: knowledgeHintFromText(text),
    automationPrompt: `Crie uma automação para solicitações parecidas com "${input.title}": classificar área, sugerir dono, preparar resposta e pedir aprovação quando houver risco.`
  };
}

export function buildPeopleTaskTriage(input: PeopleTaskTriageInput): AiTriageSignal {
  const text = `${input.title} ${input.description ?? ""} ${input.sourceType}`;
  const normalized = normalize(text);
  const priorityLevel = priorityToLevel(input.priority);
  const overdueLevel = input.isOverdue ? "critical" : "low";
  const blockedLevel = input.status === PeopleTaskStatus.BLOCKED ? "high" : "low";
  const ownerLevel = input.assigneeName ? "low" : "high";
  const urgency = maxLevel(priorityLevel, overdueLevel, blockedLevel, ownerLevel);
  const risk = maxLevel(
    overdueLevel,
    blockedLevel,
    normalized.includes("offboarding") || normalized.includes("compliance") || normalized.includes("acesso") ? "high" : "low"
  );
  const canAutoResolve =
    risk !== "critical" &&
    input.status !== PeopleTaskStatus.BLOCKED &&
    Boolean(input.assigneeName) &&
    (normalized.includes("follow") || normalized.includes("lembr") || normalized.includes("atualizar"));

  const nextAction = input.isOverdue
    ? "Repriorizar hoje"
    : input.status === PeopleTaskStatus.BLOCKED
      ? "Remover bloqueio"
      : !input.assigneeName
        ? "Delegar"
        : canAutoResolve
          ? "Resolver com IA"
          : "Avançar status";

  return {
    urgency,
    risk,
    ownerArea: areaFromText(text, "People Ops"),
    nextAction,
    canAutoResolve,
    reason:
      input.isOverdue
        ? "Prazo vencido e risco de efeito cascata."
        : input.status === PeopleTaskStatus.BLOCKED
          ? "Bloqueio precisa de intervenção antes de qualquer execução."
          : !input.assigneeName
            ? "Sem responsável, a tarefa perde previsibilidade."
            : "Contexto suficiente para execução assistida ou próximo status.",
    knowledgeHint: knowledgeHintFromText(text),
    automationPrompt: `Crie uma automação para tarefas parecidas com "${input.title}": detectar atraso, sugerir responsável e abrir follow-up automaticamente com auditoria.`
  };
}
