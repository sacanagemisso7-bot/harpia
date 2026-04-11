import { HrRequestCategory, HrRequestStatus, PeopleTaskPriority, PeopleTaskStatus } from "@prisma/client";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

import {
  clearAiTemporaryUnavailable,
  getAiChatModel,
  getAiTemporaryUnavailableReason,
  isAiConfigured,
  isAiTemporarilyUnavailable,
  markAiTemporarilyUnavailable
} from "@/lib/ai/config";
import { getOpenAIClient } from "@/lib/ai/openai";
import { prisma } from "@/lib/prisma/client";
import type { CompanyChatActionProposal, CompanyChatMessageMetadata } from "@/types/company-chat";
import { enrichCompanyChatActionProposals } from "@/modules/ai-agent/service";
import {
  draftPolicyResponse,
  draftEmail,
  getAnalyticsSnapshot,
  getApplicationSummary,
  getCandidateScoreBreakdown,
  getComplianceSummary,
  getEmployeeProfile,
  getJobSummary,
  getPeopleDashboardSummary,
  getPipelineHealth,
  getPolicyOperationalSnapshot,
  searchApplications,
  searchCandidates,
  searchEmployees,
  searchHrRequests,
  searchJobs,
  searchKnowledge,
  searchPeopleTasks
} from "@/modules/company-chat/tools";

const relatedEntitySchema = z.object({
  type: z.string(),
  id: z.string(),
  label: z.string(),
  href: z.string().nullable()
});

const actionProposalSchema = z.object({
  type: z.enum([
    "create_note",
    "move_stage",
    "save_shortlist",
    "draft_email",
    "schedule_interview",
    "create_onboarding_plan",
    "create_offboarding_plan",
    "create_hr_request",
    "update_hr_request",
    "create_people_task",
    "update_people_task"
  ]),
  label: z.string(),
  description: z.string(),
  payload: z.record(z.any()),
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).nullable(),
  requiresApproval: z.boolean().nullable()
});

const toolTraceSchema = z.object({
  tool: z.string(),
  summary: z.string()
});

const emailDraftSchema = z.object({
  subject: z.string(),
  body: z.string(),
  to: z.string().nullable().optional()
});

const companyChatReplySchema = z.object({
  reply: z.string(),
  suggestedPrompts: z.array(z.string()).max(4),
  relatedEntities: z.array(relatedEntitySchema).max(8),
  actionProposals: z.array(actionProposalSchema).max(6),
  toolTraces: z.array(toolTraceSchema).max(12),
  emailDraft: emailDraftSchema.nullable().optional()
});

type CompanyChatReply = z.infer<typeof companyChatReplySchema> & {
  citations: CompanyChatMessageMetadata["citations"];
  policyDraft?: CompanyChatMessageMetadata["policyDraft"];
  policyOperations?: CompanyChatMessageMetadata["policyOperations"];
};

function isRateLimitError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const status = "status" in error ? Number((error as { status?: unknown }).status) : null;
  const message = error instanceof Error ? error.message : String(error);

  return status === 429 || message.includes("429") || /rate limit/i.test(message);
}

function summarizeContext(context: Awaited<ReturnType<typeof buildCompanyChatContext>>) {
  return {
    employees: context.employees.map((employee) => ({
      id: employee.id,
      name: employee.fullName,
      title: employee.title,
      department: employee.department,
      status: employee.status
    })),
    hrRequests: context.hrRequests.map((request) => ({
      id: request.id,
      title: request.title,
      status: request.status,
      category: request.category,
      assignee: request.assigneeUser?.name ?? null
    })),
    peopleTasks: context.peopleTasks.map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      employee: task.relatedEmployee?.fullName ?? null
    })),
    candidates: context.candidates.map((candidate) => ({
      id: candidate.id,
      name: candidate.fullName,
      title: candidate.currentTitle
    })),
    jobs: context.jobs.map((job) => ({
      id: job.id,
      title: job.title,
      department: job.department
    })),
    applications: context.applications.map((application) => ({
      id: application.id,
      candidateName: application.candidate.fullName,
      jobTitle: application.job.title,
      stage: application.currentStage?.name,
      score: application.score
    })),
    knowledge: context.knowledge.map((document) => ({
      id: document.id,
      title: document.title,
      type: document.type,
      summary: document.summary
    })),
    policyDraft: context.policyDraft
      ? {
          response: context.policyDraft.response,
          confidence: context.policyDraft.confidence,
          summary: context.policyDraft.summary,
          citations: context.policyDraft.citations.map((citation) => ({
            title: citation.title,
            excerpt: citation.excerpt,
            type: citation.type,
            position: citation.position
          }))
        }
      : null,
    policyOperations: {
      pendingAcknowledgements: context.policyOperations.pendingAcknowledgements,
      overdueAcknowledgements: context.policyOperations.overdueAcknowledgements,
      pendingPolicyRequirements: context.policyOperations.pendingPolicyRequirements,
      items: context.policyOperations.items.map((item) => ({
        employeeName: item.employeeName,
        title: item.title,
        documentTitle: item.documentTitle,
        status: item.status
      }))
    },
    peopleDashboard: context.peopleDashboard.metrics,
    compliance: context.compliance.metrics,
    pipelineHealth: context.pipelineHealth,
    scoreBreakdown: context.scoreBreakdown,
    employeeProfile:
      context.employeeProfile && "fullName" in context.employeeProfile
        ? {
            id: context.employeeProfile.id,
            name: context.employeeProfile.fullName,
            title: context.employeeProfile.title,
            department: context.employeeProfile.department
          }
        : null,
    jobSummary: context.jobSummary,
    emailDraft: context.emailDraft
  };
}

async function buildCompanyChatContext(organizationId: string, message: string) {
  const [employees, hrRequests, peopleTasks, candidates, jobs, applications, knowledge, policyDraft, pipelineHealth, analytics, peopleDashboard, compliance] =
    await Promise.all([
      searchEmployees(organizationId, message),
      searchHrRequests(organizationId, message),
      searchPeopleTasks(organizationId, message),
      searchCandidates(organizationId, message),
      searchJobs(organizationId, message),
      searchApplications(organizationId, message),
      searchKnowledge(organizationId, message),
      draftPolicyResponse(organizationId, message),
      getPipelineHealth(organizationId),
      getAnalyticsSnapshot(organizationId),
      getPeopleDashboardSummary(organizationId),
      getComplianceSummary(organizationId)
    ]);

  const policyOperations = await getPolicyOperationalSnapshot({
    organizationId,
    documentIds: policyDraft?.citations.map((citation) => citation.documentId) ?? [],
    employeeIds: employees.map((employee) => employee.id)
  });

  const scoreBreakdown = candidates[0] ? await getCandidateScoreBreakdown(organizationId, candidates[0].id) : null;
  const jobSummary = jobs[0] ? await getJobSummary(organizationId, jobs[0].id) : null;
  const employeeProfile = employees[0] ? await getEmployeeProfile(organizationId, employees[0].id) : null;
  const emailDraft = await draftEmail(organizationId, message);

  return {
    employees,
    employeeProfile,
    hrRequests,
    peopleTasks,
    candidates,
    jobs,
    applications,
    knowledge,
    policyDraft,
    policyOperations,
    pipelineHealth,
    analytics,
    peopleDashboard,
    compliance,
    scoreBreakdown,
    jobSummary,
    emailDraft
  };
}

function buildKnowledgeCitations(context: Awaited<ReturnType<typeof buildCompanyChatContext>>) {
  return (context.policyDraft?.citations ?? []).slice(0, 4).map((citation) => ({
    id: citation.id,
    documentId: citation.documentId,
    chunkId: citation.chunkId,
    title: citation.title,
    excerpt: citation.excerpt,
    href: citation.href,
    type: citation.type,
    position: citation.position
  }));
}

function buildPolicyDraftMetadata(context: Awaited<ReturnType<typeof buildCompanyChatContext>>) {
  if (!context.policyDraft) {
    return null;
  }

  return {
    response: context.policyDraft.response,
    confidence: context.policyDraft.confidence,
    summary: context.policyDraft.summary
  } satisfies NonNullable<CompanyChatMessageMetadata["policyDraft"]>;
}

function buildPolicyOperationsMetadata(context: Awaited<ReturnType<typeof buildCompanyChatContext>>) {
  const snapshot = context.policyOperations;

  if (!snapshot) {
    return null;
  }

  const fragments: string[] = [];

  if (snapshot.pendingAcknowledgements > 0) {
    fragments.push(`${snapshot.pendingAcknowledgements} aceite(s) pendente(s)`);
  }

  if (snapshot.overdueAcknowledgements > 0) {
    fragments.push(`${snapshot.overdueAcknowledgements} em atraso`);
  }

  if (snapshot.pendingPolicyRequirements > 0) {
    fragments.push(`${snapshot.pendingPolicyRequirements} requisito(s) de compliance ligados a política`);
  }

  if (!fragments.length) {
    return {
      summary: "Nenhuma pendencia operacional relevante foi encontrada para essa política.",
      pendingAcknowledgements: 0,
      overdueAcknowledgements: 0,
      pendingPolicyRequirements: 0,
      items: []
    } satisfies NonNullable<CompanyChatMessageMetadata["policyOperations"]>;
  }

  return {
    summary: `Contexto operacional da política: ${fragments.join(", ")}.`,
    pendingAcknowledgements: snapshot.pendingAcknowledgements,
    overdueAcknowledgements: snapshot.overdueAcknowledgements,
    pendingPolicyRequirements: snapshot.pendingPolicyRequirements,
    items: snapshot.items.slice(0, 5).map((item) => ({
      id: item.id,
      title: item.title,
      employeeId: item.employeeId,
      employeeName: item.employeeName,
      documentTitle: item.documentTitle ?? null,
      status: item.status,
      dueAt: item.dueAt?.toISOString() ?? null,
      href: item.href
    }))
  } satisfies NonNullable<CompanyChatMessageMetadata["policyOperations"]>;
}

function inferRequestCategory(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("ferias")) {
    return HrRequestCategory.VACATION;
  }

  if (normalized.includes("benef")) {
    return HrRequestCategory.BENEFITS;
  }

  if (normalized.includes("document")) {
    return HrRequestCategory.DOCUMENTS;
  }

  if (normalized.includes("política")) {
    return HrRequestCategory.POLICY;
  }

  if (normalized.includes("carta") || normalized.includes("declar")) {
    return HrRequestCategory.LETTER;
  }

  if (normalized.includes("cadastro")) {
    return HrRequestCategory.PERSONAL_DATA;
  }

  return HrRequestCategory.GENERAL_SUPPORT;
}

function inferPriority(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("urgente") || normalized.includes("critico")) {
    return PeopleTaskPriority.URGENT;
  }

  if (normalized.includes("hoje") || normalized.includes("risco")) {
    return PeopleTaskPriority.HIGH;
  }

  return PeopleTaskPriority.MEDIUM;
}

async function buildActionProposals(organizationId: string, message: string, context: Awaited<ReturnType<typeof buildCompanyChatContext>>) {
  const proposals: CompanyChatReply["actionProposals"] = [];
  const addProposal = (
    proposal: Omit<CompanyChatReply["actionProposals"][number], "riskLevel" | "requiresApproval">
  ) => {
    proposals.push({
      ...proposal,
      riskLevel: null,
      requiresApproval: null
    });
  };
  const normalized = message.toLowerCase();
  const policyOperations = buildPolicyOperationsMetadata(context);
  const firstPolicyItem = policyOperations?.items[0] ?? null;
  const isPolicyConversation =
    normalized.includes("política") ||
    normalized.includes("policy") ||
    normalized.includes("aceite") ||
    normalized.includes("compliance");

  if ((normalized.includes("shortlist") || normalized.includes("top")) && context.applications.length >= 2) {
    const topApplications = context.applications.slice(0, 3);
    addProposal({
      type: "save_shortlist",
      label: "Salvar shortlist sugerida",
      description: "Cria uma shortlist com as melhores candidaturas encontradas para esta conversa.",
      payload: {
        jobId: topApplications[0]?.jobId,
        applicationIds: topApplications.map((application) => application.id),
        name: `Shortlist ${new Date().toLocaleDateString("pt-BR")}`
      }
    });
  }

  if ((normalized.includes("onboarding") || normalized.includes("admiss")) && context.employees[0]) {
    addProposal({
      type: "create_onboarding_plan",
      label: `Criar onboarding para ${context.employees[0].fullName}`,
      description: "Gera um plano operacional com checklist, tarefas e marcos iniciais.",
      payload: {
        employeeId: context.employees[0].id
      }
    });
  }

  if ((normalized.includes("offboarding") || normalized.includes("deslig")) && context.employees[0]) {
    addProposal({
      type: "create_offboarding_plan",
      label: `Criar offboarding para ${context.employees[0].fullName}`,
      description: "Inicia o fluxo de saída com responsabilidades e checkpoints.",
      payload: {
        employeeId: context.employees[0].id
      }
    });
  }

  if (
    normalized.includes("solicit") ||
    normalized.includes("chamado") ||
    normalized.includes("ferias") ||
    normalized.includes("benef")
  ) {
    addProposal({
      type: "create_hr_request",
      label: "Abrir solicitação interna",
      description: "Cria um item no service desk interno com categoria, prioridade e histórico inicial.",
      payload: {
        requesterEmployeeId: context.employees[0]?.id ?? null,
        title: message.slice(0, 90),
        description: message,
        category: inferRequestCategory(message),
        priority: inferPriority(message)
      }
    });
  }

  if (
    isPolicyConversation &&
    context.policyDraft &&
    (normalized.includes("duvida") ||
      normalized.includes("como") ||
      normalized.includes("explica") ||
      normalized.includes("esclare") ||
      normalized.includes("não entendi"))
  ) {
    addProposal({
      type: "create_hr_request",
      label: "Abrir solicitação de esclarecimento de política",
      description: "Transforma a duvida sobre a política em um chamado rastreavel no RH interno.",
      payload: {
        requesterEmployeeId: context.employees[0]?.id ?? null,
        title: `Esclarecimento sobre ${context.policyDraft.citations[0]?.title ?? "política interna"}`.slice(0, 90),
        description: `${message}\n\nBase interna localizada: ${context.policyDraft.summary}`,
        category: HrRequestCategory.POLICY,
        priority: inferPriority(message),
        dueAt:
          firstPolicyItem?.dueAt && firstPolicyItem.status === "OVERDUE"
            ? firstPolicyItem.dueAt
            : undefined
      }
    });
  }

  if ((normalized.includes("tarefa") || normalized.includes("pendencia") || normalized.includes("follow-up")) && (context.employees[0] || context.hrRequests[0])) {
    addProposal({
      type: "create_people_task",
      label: "Criar people task",
      description: "Transforma a necessidade descrita em uma tarefa operacional rastreavel.",
      payload: {
        title: message.slice(0, 90),
        description: message,
        relatedEmployeeId: context.employees[0]?.id ?? null,
        priority: inferPriority(message)
      }
    });
  }

  if (
    policyOperations &&
    firstPolicyItem &&
    (policyOperations.pendingAcknowledgements > 0 || policyOperations.pendingPolicyRequirements > 0) &&
    (isPolicyConversation ||
      normalized.includes("cobrar") ||
      normalized.includes("lembr") ||
      normalized.includes("pendente") ||
      normalized.includes("atras"))
  ) {
    addProposal({
      type: "create_people_task",
      label:
        firstPolicyItem.status === "OVERDUE"
          ? `Criar follow-up urgente para ${firstPolicyItem.employeeName}`
          : `Criar follow-up de aceite para ${firstPolicyItem.employeeName}`,
      description: "Abre uma tarefa operacional para acompanhar aceite de política ou pendencia de compliance relacionada.",
      payload: {
        title:
          firstPolicyItem.status === "OVERDUE"
            ? `Escalar aceite pendente: ${firstPolicyItem.employeeName}`
            : `Acompanhar aceite de política: ${firstPolicyItem.employeeName}`,
        description: `${firstPolicyItem.title}${firstPolicyItem.documentTitle ? ` · ${firstPolicyItem.documentTitle}` : ""}. ${policyOperations.summary}`,
        relatedEmployeeId: firstPolicyItem.employeeId ?? null,
        priority: firstPolicyItem.status === "OVERDUE" ? PeopleTaskPriority.HIGH : inferPriority(message),
        dueAt: firstPolicyItem.dueAt ?? undefined,
        sourceType: "policy_ack_follow_up",
        sourceId: firstPolicyItem.id
      }
    });
  }

  if ((normalized.includes("resolver solicit") || normalized.includes("fechar solicit")) && context.hrRequests[0]) {
    addProposal({
      type: "update_hr_request",
      label: `Resolver solicitação ${context.hrRequests[0].title}`,
      description: "Atualiza o status da solicitação para resolvida.",
      payload: {
        requestId: context.hrRequests[0].id,
        status: HrRequestStatus.RESOLVED
      }
    });
  }

  if ((normalized.includes("concluir tarefa") || normalized.includes("finalizar tarefa")) && context.peopleTasks[0]) {
    addProposal({
      type: "update_people_task",
      label: `Concluir tarefa ${context.peopleTasks[0].title}`,
      description: "Marca a tarefa operacional como concluida.",
      payload: {
        taskId: context.peopleTasks[0].id,
        status: PeopleTaskStatus.DONE
      }
    });
  }

  if (normalized.includes("mover") && context.applications[0]) {
    const stageKeyword =
      normalized.includes("entrevista")
        ? "interview"
        : normalized.includes("triagem")
          ? "screening"
          : normalized.includes("oferta")
            ? "offer"
            : normalized.includes("reprov")
              ? "rejected"
              : null;

    if (stageKeyword) {
      const stage = await prisma.pipelineStage.findFirst({
        where: {
          organizationId,
          key: stageKeyword
        }
      });

      if (stage) {
        addProposal({
          type: "move_stage",
          label: `Mover ${context.applications[0].candidate.fullName} para ${stage.name}`,
          description: "Aplica uma mudanca de etapa com confirmacao.",
          payload: {
            applicationId: context.applications[0].id,
            stageId: stage.id
          }
        });
      }
    }
  }

  if (normalized.includes("nota") && (context.applications[0] || context.candidates[0])) {
    addProposal({
      type: "create_note",
      label: "Salvar nota operacional",
      description: "Cria uma nota interna baseada no contexto desta conversa.",
      payload: {
        applicationId: context.applications[0]?.id,
        candidateId: context.candidates[0]?.id ?? context.applications[0]?.candidateId,
        content: message
      }
    });
  }

  if ((normalized.includes("email") || normalized.includes("mensagem")) && context.emailDraft) {
    addProposal({
      type: "draft_email",
      label: "Salvar rascunho de email",
      description: "Registra um rascunho estruturado para o fluxo atual.",
      payload: context.emailDraft
    });
  }

  if ((normalized.includes("agendar") || normalized.includes("entrevista")) && context.applications[0]) {
    addProposal({
      type: "schedule_interview",
      label: "Preparar agendamento de entrevista",
      description: "Cria uma entrevista de 45 minutos para a aplicação mais relevante desta conversa.",
      payload: {
        applicationId: context.applications[0].id,
        title: `Entrevista - ${context.applications[0].candidate.fullName}`,
        startsAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
        endsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 + 1000 * 60 * 45).toISOString()
      }
    });
  }

  return proposals.slice(0, 6);
}

function buildToolTraces(context: Awaited<ReturnType<typeof buildCompanyChatContext>>) {
  const knowledgeCitations = buildKnowledgeCitations(context);
  const policyOperations = buildPolicyOperationsMetadata(context);
  const traces: CompanyChatMessageMetadata["toolTraces"] = [
    { tool: "search_employees", summary: `${context.employees.length} colaboradores localizados` },
    { tool: "search_hr_requests", summary: `${context.hrRequests.length} solicitações relacionadas encontradas` },
    { tool: "search_people_tasks", summary: `${context.peopleTasks.length} tarefas operacionais correlatas` },
    { tool: "get_people_dashboard", summary: `${context.peopleDashboard.alerts.length} alertas no command center` },
    { tool: "get_compliance_summary", summary: `${context.compliance.metrics.pending} itens pendentes em compliance leve` },
    {
      tool: "search_knowledge",
      summary: `${context.knowledge.length} documentos encontrados e ${knowledgeCitations.length} trecho(s) prontos para citacao`
    },
    {
      tool: "get_policy_operations",
      summary: policyOperations
        ? `${policyOperations.pendingAcknowledgements} aceite(s) pendentes e ${policyOperations.overdueAcknowledgements} em atraso`
        : "Sem pendencias operacionais de política relevantes"
    },
    { tool: "search_candidates", summary: `${context.candidates.length} candidatos relevantes encontrados` },
    { tool: "search_jobs", summary: `${context.jobs.length} vagas relacionadas encontradas` },
    { tool: "search_applications", summary: `${context.applications.length} candidaturas avaliadas` }
  ];

  if (context.employeeProfile) {
    traces.push({
      tool: "get_employee_profile",
      summary: `Perfil operacional pronto para ${context.employeeProfile.fullName}`
    });
  }

  if (context.scoreBreakdown) {
    traces.push({
      tool: "get_candidate_score_breakdown",
      summary: `Score breakdown pronto para ${context.scoreBreakdown.candidateName}`
    });
  }

  if (context.jobSummary) {
    traces.push({
      tool: "get_job_summary",
      summary: `Resumo detalhado da vaga ${context.jobSummary.title}`
    });
  }

  if (context.emailDraft) {
    traces.push({
      tool: "draft_email",
      summary: "Rascunho de email operacional preparado"
    });
  }

  if (context.policyDraft) {
    traces.push({
      tool: "draft_policy_response",
      summary: `${context.policyDraft.citations.length} fonte(s) internas usadas para resposta ancorada`
    });
  }

  return traces.slice(0, 12);
}

function buildFallbackReply(
  _message: string,
  context: Awaited<ReturnType<typeof buildCompanyChatContext>>,
  proposals: CompanyChatReply["actionProposals"],
  fallbackNotice?: string
): CompanyChatReply {
  const sections: string[] = [];
  const toolTraces = buildToolTraces(context);
  const citations = buildKnowledgeCitations(context);
  const policyDraft = buildPolicyDraftMetadata(context);
  const policyOperations = buildPolicyOperationsMetadata(context);

  if (fallbackNotice) {
    sections.push(fallbackNotice);
  }

  if (context.policyDraft) {
    sections.push(
      `${context.policyDraft.response}\n\nConfian?a desta leitura: ${context.policyDraft.confidence.toLowerCase()}. ${context.policyDraft.summary}`
    );
  }

  if (policyOperations && (policyOperations.pendingAcknowledgements > 0 || policyOperations.pendingPolicyRequirements > 0)) {
    sections.push(policyOperations.summary);
  }

  sections.push(
    `Hoje a operação interna mostra ${context.peopleDashboard.metrics.openRequests} solicitações abertas, ${context.peopleDashboard.metrics.overdueTasks} tarefas vencidas, ${context.peopleDashboard.metrics.onboardingActive} onboardings ativos e ${context.compliance.metrics.pending} itens de compliance pendentes.`
  );

  if (context.employees.length) {
    sections.push(`Tambem localizei ${context.employees.length} colaboradores relacionados, com destaque para ${context.employees[0].fullName}.`);
  }

  if (context.hrRequests.length) {
    sections.push(`Encontrei ${context.hrRequests.length} solicitações internas conectadas ao assunto, incluindo "${context.hrRequests[0].title}".`);
  }

  if (context.peopleTasks.length) {
    sections.push(`Ha ${context.peopleTasks.length} tarefas operacionais correlatas, o que ajuda a transformar a conversa em execucao rastreavel.`);
  }

  if (context.knowledge.length) {
    sections.push(`A knowledge base tambem tem material util, como "${context.knowledge[0].title}".`);
  }

  if (context.applications.length) {
    sections.push(
      `No módulo de hiring, a melhor aplicação relacionada agora parece ser ${context.applications[0].candidate.fullName} para ${context.applications[0].job.title}, com score ${context.applications[0].score ?? "--"}.`
    );
  }

  const relatedEntities = [
    ...context.employees.slice(0, 2).map((employee) => ({
      type: "employee",
      id: employee.id,
      label: `${employee.fullName} - ${employee.title}`,
      href: `/employees/${employee.id}`
    })),
    ...context.hrRequests.slice(0, 2).map((request) => ({
      type: "hr_request",
      id: request.id,
      label: request.title,
      href: "/requests"
    })),
    ...context.peopleTasks.slice(0, 2).map((task) => ({
      type: "people_task",
      id: task.id,
      label: task.title,
      href: "/people/tasks"
    })),
    ...context.knowledge.slice(0, 2).map((document) => ({
      type: "knowledge_document",
      id: document.id,
      label: document.title,
      href: "/knowledge"
    }))
  ].slice(0, 8);

  return {
    reply: sections.join("\n\n"),
    suggestedPrompts: [
      "Resuma o backlog do RH desta semana.",
      "Quais colaboradore precisam de onboarding agora?",
      "Onde o SLA interno esta em risco?",
      "Que políticas temos sobre esse tema?"
    ],
    relatedEntities,
    actionProposals: proposals,
    toolTraces,
    citations,
    emailDraft: context.emailDraft,
    policyDraft,
    policyOperations
  };
}

async function generateAiReply(
  message: string,
  context: Awaited<ReturnType<typeof buildCompanyChatContext>>,
  proposals: CompanyChatReply["actionProposals"]
) {
  const client = getOpenAIClient();
  const completion = await client.beta.chat.completions.parse({
    model: getAiChatModel(),
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "You are Harpia, an internal company operations copilot. Answer in Brazilian Portuguese. Prioritize employees, people operations, internal requests, tasks, knowledge, compliance, and operational risks. Hiring exists as a supporting module, not the main lens. When policy or knowledge evidence is provided, treat it as the source of truth, cite uncertainty clearly, and never invent a rule that is not grounded in the provided internal documents."
      },
      {
        role: "user",
        content: JSON.stringify({
          userMessage: message,
          organizationContext: summarizeContext(context),
          actionProposals: proposals
        })
      }
    ],
    response_format: zodResponseFormat(companyChatReplySchema, "company_chat_reply")
  });

  return completion.choices[0]?.message.parsed;
}

function normalizeReplyProposals(proposals: CompanyChatActionProposal[]): CompanyChatReply["actionProposals"] {
  return enrichCompanyChatActionProposals(proposals)
    .map((proposal) => ({
      ...proposal,
      riskLevel: proposal.riskLevel ?? null,
      requiresApproval: proposal.requiresApproval ?? null
    }))
    .slice(0, 6);
}

export async function buildCompanyChatReply(organizationId: string, message: string) {
  const context = await buildCompanyChatContext(organizationId, message);
  const proposals = normalizeReplyProposals(await buildActionProposals(organizationId, message, context));
  const toolTraces = buildToolTraces(context);
  const citations = buildKnowledgeCitations(context);
  const sharedArtifacts = {
    citations,
    emailDraft: context.emailDraft,
    policyDraft: buildPolicyDraftMetadata(context),
    policyOperations: buildPolicyOperationsMetadata(context)
  };

  const temporaryUnavailableReason = getAiTemporaryUnavailableReason();

  if (!isAiConfigured()) {
    return buildFallbackReply(message, context, proposals);
  }

  if (isAiTemporarilyUnavailable()) {
    return buildFallbackReply(
      message,
      context,
      proposals,
      temporaryUnavailableReason ?? "A IA externa esta temporariamente indisponivel. Segui com a resposta operacional interna."
    );
  }

  try {
    const reply = await generateAiReply(message, context, proposals);

    if (reply) {
      clearAiTemporaryUnavailable();
      reply.actionProposals = normalizeReplyProposals(reply.actionProposals);
      return {
        ...reply,
        toolTraces,
        ...sharedArtifacts
      };
    }
  } catch (error) {
    if (isRateLimitError(error)) {
      markAiTemporarilyUnavailable(
        "A IA externa atingiu o limite agora. O Harpia continuara respondendo com o contexto operacional interno por alguns minutos."
      );
      console.warn("company-chat.ai-rate-limited");
    } else {
      console.error("company-chat.ai-failed", error);
    }
  }

  const fallbackNotice = getAiTemporaryUnavailableReason() ?? temporaryUnavailableReason ?? undefined;

  return {
    ...buildFallbackReply(
      message,
      context,
      proposals,
      fallbackNotice
    ),
    actionProposals: proposals,
    toolTraces,
    ...sharedArtifacts
  };
}

export async function buildThreadTitle(message: string) {
  return message.split(/[.!?\n]/)[0]?.slice(0, 48) || "Nova conversa";
}

export async function getRelatedContextCards(organizationId: string, threadId: string) {
  const thread = await prisma.chatThread.findFirst({
    where: {
      id: threadId,
      organizationId
    }
  });

  if (!thread) {
    return null;
  }

  if (thread.scope === "APPLICATION" && thread.contextEntityId) {
    return getApplicationSummary(organizationId, thread.contextEntityId);
  }

  if (thread.scope === "EMPLOYEE" && thread.contextEntityId) {
    return getEmployeeProfile(organizationId, thread.contextEntityId);
  }

  return null;
}
