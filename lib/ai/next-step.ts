import { EmployeeStatus, HrRequestStatus, PeopleTaskStatus } from "@prisma/client";

export type NextStepTone = "default" | "attention" | "positive";

export type NextStepDraft<ActionKey extends string> = {
  actionKey: ActionKey;
  actionLabel: string;
  recommendedStep: string;
  reason: string;
  tone?: NextStepTone;
};

export type HrRequestNextStepAction = "respond" | "reassign" | "close" | "escalate";
export type PeopleTaskNextStepAction = "complete" | "defer" | "delegate" | "comment";
export type EmployeeNextStepAction = "follow_up" | "start_onboarding" | "open_request";
export type CandidateNextStepAction = "upload_resume" | "analyze_resume" | "apply_to_job" | "review_application" | "add_note";
export type ApplicationNextStepAction = "schedule_interview" | "advance_stage" | "reject" | "review_score" | "add_note";

export function buildHrRequestNextStep(input: {
  status: HrRequestStatus;
  effectiveSlaStatus: string;
  priority: string;
  assigneeName: string | null;
  commentCount: number;
}): NextStepDraft<HrRequestNextStepAction> {
  if (!input.assigneeName && input.status !== HrRequestStatus.RESOLVED && input.status !== HrRequestStatus.CANCELED) {
    return {
      actionKey: "reassign",
      actionLabel: "Reatribuir",
      recommendedStep: "Definir um responsável",
      reason: "Sem dono claro, a solicitação tende a ficar parada mesmo quando o SLA ainda parece seguro.",
      tone: "attention"
    };
  }

  if (input.effectiveSlaStatus === "BREACHED" || input.effectiveSlaStatus === "AT_RISK" || input.priority === "URGENT") {
    return {
      actionKey: "escalate",
      actionLabel: "Escalar",
      recommendedStep: "Escalar prioridade e dono",
      reason: "O caso já está pressionando SLA ou impacto; a próxima ação precisa reduzir ambiguidade rapidamente.",
      tone: "attention"
    };
  }

  if (input.status === HrRequestStatus.WAITING_ON_REQUESTER) {
    return {
      actionKey: "respond",
      actionLabel: "Responder",
      recommendedStep: "Responder ao solicitante",
      reason: "A fila só anda se a próxima dependência ficar explícita para quem abriu o pedido.",
      tone: "default"
    };
  }

  if (input.status === HrRequestStatus.IN_PROGRESS && input.commentCount > 0) {
    return {
      actionKey: "close",
      actionLabel: "Fechar",
      recommendedStep: "Fechar se já estiver resolvido",
      reason: "O caso tem dono e histórico; se a pendência foi atendida, fechar agora mantém a fila confiável.",
      tone: "positive"
    };
  }

  return {
    actionKey: "respond",
    actionLabel: "Responder",
    recommendedStep: "Registrar o próximo movimento",
    reason: "Um comentário curto deixa claro o que mudou e evita que o caso dependa de memória do time.",
    tone: "default"
  };
}

export function buildPeopleTaskNextStep(input: {
  status: PeopleTaskStatus;
  isOverdue: boolean;
  assigneeName: string | null;
  commentCount: number;
}): NextStepDraft<PeopleTaskNextStepAction> {
  if (input.status === PeopleTaskStatus.DONE) {
    return {
      actionKey: "comment",
      actionLabel: "Registrar aprendizado",
      recommendedStep: "Registrar contexto final",
      reason: "Uma nota curta deixa rastreável por que a tarefa foi concluída e reduz perguntas depois.",
      tone: "positive"
    };
  }

  if (!input.assigneeName) {
    return {
      actionKey: "delegate",
      actionLabel: "Delegar",
      recommendedStep: "Delegar para um responsável",
      reason: "Tarefa sem dono vira ruído operacional; definir ownership é o menor passo de maior impacto.",
      tone: "attention"
    };
  }

  if (input.status === PeopleTaskStatus.BLOCKED || input.isOverdue) {
    return {
      actionKey: "defer",
      actionLabel: "Adiar",
      recommendedStep: "Ajustar prazo ou desbloquear",
      reason: "A tarefa já perdeu fluidez; atualizar prazo e contexto protege a confiança do backlog.",
      tone: "attention"
    };
  }

  return {
    actionKey: "complete",
    actionLabel: "Concluir",
    recommendedStep: "Concluir se já estiver pronta",
    reason: input.commentCount
      ? "Já existe contexto registrado; se a execução terminou, a fila deve refletir isso agora."
      : "Se a tarefa foi executada, concluir evita backlog artificial e melhora a leitura do time.",
    tone: "positive"
  };
}

export function buildEmployeeNextStep(input: {
  status: EmployeeStatus;
  hasActiveOnboardingRun: boolean;
  checkInCount: number;
  openComplianceCount: number;
  openRequestCount: number;
  openTaskCount: number;
}): NextStepDraft<EmployeeNextStepAction> {
  if (input.status === EmployeeStatus.ONBOARDING && !input.hasActiveOnboardingRun) {
    return {
      actionKey: "start_onboarding",
      actionLabel: "Iniciar onboarding",
      recommendedStep: "Iniciar onboarding",
      reason: "O colaborador está em onboarding, mas ainda não há fluxo ativo garantindo dono, prazo e checklist.",
      tone: "attention"
    };
  }

  if (input.openComplianceCount > 0 && input.openRequestCount === 0) {
    return {
      actionKey: "open_request",
      actionLabel: "Abrir request",
      recommendedStep: "Abrir uma solicitação de regularização",
      reason: "Há pendências de compliance sem uma solicitação centralizada para acompanhar responsabilidade e prazo.",
      tone: "attention"
    };
  }

  if (input.checkInCount === 0 || input.openTaskCount > 2) {
    return {
      actionKey: "follow_up",
      actionLabel: "Registrar follow-up",
      recommendedStep: "Registrar follow-up",
      reason: "O perfil precisa de contexto humano para explicar risco, carga ou próximos combinados sem depender de conversa solta.",
      tone: "default"
    };
  }

  return {
    actionKey: "follow_up",
    actionLabel: "Registrar follow-up",
    recommendedStep: "Manter acompanhamento leve",
    reason: "Um registro periódico mantém histórico confiável para gestores, RH e operações futuras.",
    tone: "default"
  };
}

export function buildCandidateNextStep(input: {
  resumeCount: number;
  hasParsedProfile: boolean;
  applicationCount: number;
  availableJobCount: number;
}): NextStepDraft<CandidateNextStepAction> {
  if (input.resumeCount === 0) {
    return {
      actionKey: "upload_resume",
      actionLabel: "Enviar currículo",
      recommendedStep: "Adicionar currículo",
      reason: "Sem currículo, a IA não consegue estruturar skills, riscos e perguntas úteis para o time.",
      tone: "attention"
    };
  }

  if (!input.hasParsedProfile) {
    return {
      actionKey: "analyze_resume",
      actionLabel: "Analisar com IA",
      recommendedStep: "Rodar leitura de IA",
      reason: "O perfil já tem material, mas ainda não virou sinal estruturado para decisão de hiring.",
      tone: "attention"
    };
  }

  if (input.applicationCount > 0) {
    return {
      actionKey: "review_application",
      actionLabel: "Ver candidatura",
      recommendedStep: "Revisar candidatura ativa",
      reason: "A decisão acontece na aplicação; revisar etapa, score e histórico reduz troca de contexto.",
      tone: "default"
    };
  }

  if (input.availableJobCount > 0) {
    return {
      actionKey: "apply_to_job",
      actionLabel: "Aplicar em vaga",
      recommendedStep: "Vincular a uma vaga aberta",
      reason: "O candidato está pronto para triagem, mas ainda não foi conectado a uma oportunidade real.",
      tone: "positive"
    };
  }

  return {
    actionKey: "add_note",
    actionLabel: "Registrar nota",
    recommendedStep: "Registrar contexto do perfil",
    reason: "Sem vaga disponível agora, uma nota objetiva preserva o motivo de manter este talento no radar.",
    tone: "default"
  };
}

export function buildApplicationNextStep(input: {
  recommendation: string;
  interviewCount: number;
  suggestedStageLabel: string;
  currentStageLabel: string;
}): NextStepDraft<ApplicationNextStepAction> {
  if (input.recommendation === "REJECT") {
    return {
      actionKey: "reject",
      actionLabel: "Mover etapa",
      recommendedStep: "Mover para rejeição",
      reason: "A leitura atual aponta baixo encaixe; fechar a decisão evita pipeline inflado e follow-ups indevidos.",
      tone: "attention"
    };
  }

  if (input.recommendation === "ADVANCE" && input.interviewCount === 0) {
    return {
      actionKey: "schedule_interview",
      actionLabel: "Agendar entrevista",
      recommendedStep: "Agendar a próxima conversa",
      reason: "O score sugere avanço, mas ainda falta evidência humana para validar sinais críticos.",
      tone: "positive"
    };
  }

  if (input.recommendation === "ADVANCE" && input.suggestedStageLabel !== input.currentStageLabel) {
    return {
      actionKey: "advance_stage",
      actionLabel: "Avançar etapa",
      recommendedStep: `Avançar para ${input.suggestedStageLabel}`,
      reason: "A candidatura já tem sinal suficiente para sair da etapa atual sem esperar nova triagem manual.",
      tone: "positive"
    };
  }

  return {
    actionKey: "review_score",
    actionLabel: "Revisar score",
    recommendedStep: "Revisar score e próximos sinais",
    reason: "Quando a decisão ainda não é clara, recalcular ou revisar score evita avanço precipitado.",
    tone: "default"
  };
}
