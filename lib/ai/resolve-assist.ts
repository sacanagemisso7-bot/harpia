import { HrRequestStatus, PeopleTaskStatus, type PeopleTaskPriority } from "@prisma/client";
import type { StageCopilotDecision } from "@/lib/ai/stage-copilot";

export type ResolveAssistDraft = {
  suggestedStatus: string;
  summary: string;
  suggestedAction: string;
  expectedImpact: string;
  confidence: "Alta" | "Média" | "Baixa";
  draftNote: string;
  sources: string[];
};

type HrRequestAssistInput = {
  title: string;
  description: string;
  category: string;
  priority: PeopleTaskPriority | string;
  status: HrRequestStatus;
  effectiveSlaStatus: string;
  requesterName?: string | null;
  assigneeName?: string | null;
  commentCount?: number;
};

type PeopleTaskAssistInput = {
  title: string;
  description?: string | null;
  priority: PeopleTaskPriority | string;
  status: PeopleTaskStatus;
  sourceType: string;
  isOverdue: boolean;
  relatedEmployeeName?: string | null;
  assigneeName?: string | null;
  commentCount?: number;
};

type ApplicationResolveAssistInput = {
  candidateName: string;
  jobTitle: string;
  score: number | null;
  currentStageId: string | null;
  currentStageName: string | null;
  stages: Array<{
    id: string;
    name: string;
    key?: string | null;
    isTerminal?: boolean;
    position?: number;
  }>;
  copilotDecision: StageCopilotDecision;
  interviewCount?: number;
};

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildConfidenceLabel(weight: number): ResolveAssistDraft["confidence"] {
  if (weight >= 3) {
    return "Alta";
  }

  if (weight >= 2) {
    return "Média";
  }

  return "Baixa";
}

export function buildHrRequestResolveAssist(input: HrRequestAssistInput): ResolveAssistDraft {
  const hasOwner = Boolean(input.assigneeName);
  const commentCount = input.commentCount ?? 0;
  const isUrgent = input.priority === "URGENT" || input.effectiveSlaStatus === "BREACHED";
  const isRisky = input.effectiveSlaStatus === "AT_RISK";

  let suggestedStatus: HrRequestStatus = HrRequestStatus.IN_PROGRESS;
  let suggestedAction = "Assumir o caso e registrar o próximo passo.";
  let expectedImpact = "Cria responsabilidade clara e reduz o tempo até a próxima resposta.";
  let summary = "A IA sugere transformar o caso em execução rastreável agora, evitando fila parada.";
  let confidenceScore = hasOwner ? 3 : 2;

  if (input.status === HrRequestStatus.IN_PROGRESS && hasOwner && !isUrgent) {
    suggestedStatus = HrRequestStatus.RESOLVED;
    suggestedAction = "Concluir o caso com um fechamento objetivo.";
    expectedImpact = "Encerra a demanda com histórico claro e reduz ruído na fila.";
    summary = "O caso já tem dono e contexto suficiente para seguir para fechamento controlado.";
    confidenceScore = 3;
  } else if (input.status === HrRequestStatus.WAITING_ON_REQUESTER) {
    suggestedStatus = HrRequestStatus.IN_PROGRESS;
    suggestedAction = "Retomar o caso e consolidar o próximo movimento.";
    expectedImpact = "Tira a solicitação do limbo e recupera o ritmo operacional.";
    summary = "A IA sugere puxar a conversa de volta para a operação antes que o caso envelheça.";
    confidenceScore = 2;
  } else if (input.status === HrRequestStatus.RESOLVED) {
    suggestedStatus = HrRequestStatus.RESOLVED;
    suggestedAction = "Manter o fechamento e reforçar o registro final.";
    expectedImpact = "Preserva consistência do histórico sem reabrir fluxo desnecessariamente.";
    summary = "O caso já está resolvido; a melhor ação é garantir um registro final limpo.";
    confidenceScore = 3;
  } else if (!hasOwner) {
    suggestedStatus = HrRequestStatus.IN_PROGRESS;
    suggestedAction = "Definir dono e iniciar tratamento imediato.";
    expectedImpact = "Evita perda de contexto e protege o SLA desde já.";
    summary = "Sem responsável definido, a IA prioriza criar dono explícito e iniciar o atendimento.";
    confidenceScore = 2;
  }

  if (isUrgent) {
    summary = "A IA detectou risco alto de SLA e recomenda encaminhamento imediato com registro visível.";
    expectedImpact = "Reduz a chance de escalonamento e melhora previsibilidade para o RH.";
    confidenceScore = Math.max(confidenceScore, 3);
  } else if (isRisky) {
    confidenceScore = Math.max(confidenceScore, 2);
  }

  const draftNote =
    suggestedStatus === HrRequestStatus.RESOLVED
      ? `Encaminhamento assistido pela IA: fechamento recomendado para "${input.title}" com base na categoria ${formatEnumLabel(input.category).toLowerCase()}, no contexto registrado e no histórico recente.${commentCount ? ` ${commentCount} comentário(s) já dão sustentação ao encerramento.` : ""}`
      : `Encaminhamento assistido pela IA: assumir "${input.title}" em ${formatEnumLabel(suggestedStatus).toLowerCase()} para dar continuidade imediata ao caso.${hasOwner ? ` Responsável atual: ${input.assigneeName}.` : " Recomenda-se definir um responsável neste passo."}`;

  const sources = [
    `Título e categoria: ${input.title} · ${formatEnumLabel(input.category)}`,
    `Estado operacional: ${formatEnumLabel(input.status)} · SLA ${formatEnumLabel(input.effectiveSlaStatus)}`,
    `Prioridade: ${formatEnumLabel(String(input.priority))}`,
    hasOwner ? `Responsável atual: ${input.assigneeName}` : "Sem responsável atual",
    input.requesterName ? `Solicitante: ${input.requesterName}` : "Solicitante interno",
    commentCount ? `${commentCount} comentário(s) no histórico` : "Sem comentários registrados"
  ];

  return {
    suggestedStatus,
    summary,
    suggestedAction,
    expectedImpact,
    confidence: buildConfidenceLabel(confidenceScore),
    draftNote,
    sources
  };
}

export function buildPeopleTaskResolveAssist(input: PeopleTaskAssistInput): ResolveAssistDraft {
  const hasOwner = Boolean(input.assigneeName);
  const commentCount = input.commentCount ?? 0;
  const isUrgent = input.priority === "URGENT" || input.isOverdue;

  let suggestedStatus: PeopleTaskStatus = PeopleTaskStatus.IN_PROGRESS;
  let suggestedAction = "Retomar a execução com dono e registro claro.";
  let expectedImpact = "Reduz ambiguidade e acelera o próximo passo operacional.";
  let summary = "A IA sugere tirar a tarefa do estado passivo e colocá-la em andamento agora.";
  let confidenceScore = hasOwner ? 3 : 2;

  if ((input.status === PeopleTaskStatus.IN_PROGRESS || input.isOverdue) && hasOwner) {
    suggestedStatus = PeopleTaskStatus.DONE;
    suggestedAction = "Concluir a entrega e registrar o desfecho.";
    expectedImpact = "Enxuga backlog ativo e melhora a leitura real da operação.";
    summary = "A tarefa já parece madura o bastante para fechamento controlado com contexto.";
    confidenceScore = 3;
  } else if (input.status === PeopleTaskStatus.BLOCKED) {
    suggestedStatus = PeopleTaskStatus.IN_PROGRESS;
    suggestedAction = "Desbloquear e reativar a tarefa.";
    expectedImpact = "Recoloca a execução em movimento sem perder o histórico do bloqueio.";
    summary = "A IA identificou bloqueio e recomenda reabrir a execução com clareza de próximo passo.";
    confidenceScore = 2;
  } else if (input.status === PeopleTaskStatus.DONE) {
    suggestedStatus = PeopleTaskStatus.DONE;
    suggestedAction = "Manter a tarefa concluída e reforçar o registro final.";
    expectedImpact = "Preserva um histórico limpo sem reacender trabalho concluído.";
    summary = "A tarefa já está concluída; o melhor uso aqui é consolidar o fechamento.";
    confidenceScore = 3;
  } else if (!hasOwner) {
    suggestedStatus = PeopleTaskStatus.IN_PROGRESS;
    suggestedAction = "Assumir a execução e dar dono visível para a tarefa.";
    expectedImpact = "Evita nova deriva e torna a cobrança mais objetiva.";
    summary = "Sem responsável definido, a IA recomenda começar pela atribuição e tração inicial.";
    confidenceScore = 2;
  }

  if (isUrgent) {
    summary = "A IA detectou urgência operacional e sugere ação imediata com registro curto e objetivo.";
    expectedImpact = "Reduz atraso percebido e protege a cadência da operação.";
    confidenceScore = Math.max(confidenceScore, 3);
  }

  const draftNote =
    suggestedStatus === PeopleTaskStatus.DONE
      ? `Encaminhamento assistido pela IA: fechamento recomendado para "${input.title}" com base no contexto atual e no estágio operacional da tarefa.${commentCount ? ` ${commentCount} comentário(s) já ajudam a sustentar esse encerramento.` : ""}`
      : `Encaminhamento assistido pela IA: mover "${input.title}" para ${formatEnumLabel(suggestedStatus).toLowerCase()} e registrar o próximo passo imediato.${hasOwner ? ` Responsável atual: ${input.assigneeName}.` : " Recomenda-se explicitar um responsável neste passo."}`;

  const sources = [
    `Título: ${input.title}`,
    `Estado operacional: ${formatEnumLabel(input.status)}${input.isOverdue ? " · vencida" : ""}`,
    `Prioridade: ${formatEnumLabel(String(input.priority))}`,
    `Origem: ${formatEnumLabel(input.sourceType)}`,
    hasOwner ? `Responsável atual: ${input.assigneeName}` : "Sem responsável atual",
    input.relatedEmployeeName ? `Colaborador relacionado: ${input.relatedEmployeeName}` : "Sem colaborador relacionado",
    commentCount ? `${commentCount} comentário(s) no histórico` : "Sem comentários registrados"
  ];

  return {
    suggestedStatus,
    summary,
    suggestedAction,
    expectedImpact,
    confidence: buildConfidenceLabel(confidenceScore),
    draftNote,
    sources
  };
}

function findRejectedStage(
  stages: ApplicationResolveAssistInput["stages"],
  currentStageId: string | null
) {
  return (
    stages.find((stage) => (stage.key ?? "").toLowerCase() === "rejected") ??
    stages.find((stage) => stage.isTerminal && stage.id !== currentStageId) ??
    stages.find((stage) => /rejeit|reprov/i.test(stage.name))
  );
}

function findNextStage(
  stages: ApplicationResolveAssistInput["stages"],
  currentStageId: string | null
) {
  const ordered = [...stages].sort((left, right) => (left.position ?? 0) - (right.position ?? 0));
  const currentIndex = ordered.findIndex((stage) => stage.id === currentStageId);

  if (currentIndex >= 0 && currentIndex < ordered.length - 1) {
    return ordered[currentIndex + 1];
  }

  return ordered.find((stage) => stage.id !== currentStageId && !stage.isTerminal) ?? ordered[0] ?? null;
}

export function buildApplicationResolveAssist(input: ApplicationResolveAssistInput): ResolveAssistDraft & {
  suggestedStageId: string;
  suggestedStageLabel: string;
} {
  const nextStage = findNextStage(input.stages, input.currentStageId);
  const rejectedStage = findRejectedStage(input.stages, input.currentStageId);

  let suggestedStage = nextStage ?? rejectedStage ?? input.stages[0];
  let summary = "A IA sugere transformar a leitura da candidatura em uma decisão operacional clara agora.";
  let suggestedAction = "Aplicar a próxima movimentação mais coerente no pipeline.";
  let expectedImpact = "Reduz indefinição e acelera o próximo passo do time de contratação.";
  let confidenceScore = input.score && input.score >= 80 ? 3 : input.score && input.score >= 60 ? 2 : 1;

  if (input.copilotDecision.recommendation === "HOLD") {
    suggestedStage =
      input.stages.find((stage) => stage.id === input.currentStageId) ??
      nextStage ??
      rejectedStage ??
      input.stages[0];
    summary = "A IA recomenda segurar a candidatura na etapa atual até fechar as evidências pendentes.";
    suggestedAction = "Manter a etapa e registrar as validações restantes.";
    expectedImpact = "Evita avanço apressado e deixa explícito o que ainda precisa ser confirmado.";
    confidenceScore = Math.max(confidenceScore, 2);
  }

  if (input.copilotDecision.recommendation === "REJECT") {
    suggestedStage =
      rejectedStage ??
      input.stages.find((stage) => stage.isTerminal) ??
      input.stages.find((stage) => stage.id === input.currentStageId) ??
      input.stages[0];
    summary = "A IA detectou sinais suficientes para encerrar a candidatura com clareza e rastreabilidade.";
    suggestedAction = "Levar a candidatura para a etapa terminal adequada.";
    expectedImpact = "Evita drift no pipeline e libera foco do time para os casos mais promissores.";
    confidenceScore = 3;
  }

  if (input.copilotDecision.recommendation === "ADVANCE") {
    suggestedStage =
      nextStage ??
      input.stages.find((stage) => stage.id === input.currentStageId) ??
      rejectedStage ??
      input.stages[0];
    summary = "A IA encontrou sinal suficiente para avançar a candidatura de forma controlada.";
    suggestedAction = "Mover para a próxima etapa recomendada e registrar a justificativa.";
    expectedImpact = "Acelera o pipeline sem perder o racional da decisão.";
    confidenceScore = Math.max(confidenceScore, 3);
  }

  const currentStageLabel = input.currentStageName ?? "sem etapa definida";
  const suggestedStageLabel = suggestedStage?.name ?? currentStageLabel;
  const draftNote = `Encaminhamento assistido pela IA: ${input.copilotDecision.summary} Movimentação sugerida de ${currentStageLabel} para ${suggestedStageLabel}.${input.copilotDecision.reasons[0] ? ` Principal base: ${input.copilotDecision.reasons[0]}.` : ""}`;

  const sources = [
    `Candidatura: ${input.candidateName} · ${input.jobTitle}`,
    `Etapa atual: ${currentStageLabel}`,
    `Score atual: ${input.score ?? "--"}`,
    `${input.interviewCount ?? 0} entrevista(s) vinculada(s)`,
    ...input.copilotDecision.reasons.slice(0, 3)
  ];

  return {
    suggestedStatus: suggestedStage?.id ?? "",
    suggestedStageId: suggestedStage?.id ?? "",
    suggestedStageLabel,
    summary,
    suggestedAction,
    expectedImpact,
    confidence: buildConfidenceLabel(confidenceScore),
    draftNote,
    sources
  };
}
