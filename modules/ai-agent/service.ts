import {
  AgentApprovalStatus,
  AgentExecutionStatus,
  AgentRiskLevel,
  AgentRunMode,
  AgentRunStatus,
  AgentStepStatus,
  Prisma
} from "@prisma/client";

import { hasPermission } from "@/lib/auth/permission-matrix";
import { prisma } from "@/lib/prisma/client";
import { enrichAgentActionProposal, getAgentActionDefinition } from "@/modules/ai-agent/registry";
import type { CompanyChatActionProposal, CompanyChatActionType } from "@/types/company-chat";

type AgentExecutionResult =
  | {
      kind: "approval_requested";
      summary: string;
      agentRunId: string;
      approvalRequestId: string;
      approvalStatus: AgentApprovalStatus;
      requiresApproval: true;
      riskLevel: AgentRiskLevel;
      actionType: CompanyChatActionType;
    }
  | {
      kind: "executed";
      summary: string;
      agentRunId: string;
      executionId: string;
      executionStatus: AgentExecutionStatus;
      requiresApproval: boolean;
      riskLevel: AgentRiskLevel;
      actionType: CompanyChatActionType;
    }
  | {
      kind: "rejected";
      summary: string;
      agentRunId: string;
      approvalRequestId: string;
      approvalStatus: "REJECTED";
      requiresApproval: true;
      riskLevel: AgentRiskLevel;
      actionType: CompanyChatActionType;
    };

type ApplyAgentActionInput = {
  organizationId: string;
  userId: string;
  userRole: string;
  threadId?: string;
  type: CompanyChatActionType;
  payload: Record<string, unknown>;
  goal?: string;
  mode?: AgentRunMode;
};

type ReviewAgentApprovalInput = {
  organizationId: string;
  approverUserId: string;
  approverRole: string;
  approvalRequestId: string;
  decision: "APPROVE" | "REJECT";
  notes?: string;
};

function asJsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

async function createAgentStep(input: {
  agentRunId: string;
  kind: string;
  title: string;
  status: AgentStepStatus;
  toolName?: string | null;
  input?: unknown;
  output?: unknown;
  error?: string | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
}) {
  return prisma.agentStep.create({
    data: {
      agentRunId: input.agentRunId,
      kind: input.kind,
      title: input.title,
      status: input.status,
      toolName: input.toolName ?? null,
      input: input.input === undefined ? undefined : asJsonValue(input.input),
      output: input.output === undefined ? undefined : asJsonValue(input.output),
      error: input.error ?? null,
      startedAt: input.startedAt ?? null,
      completedAt: input.completedAt ?? null
    }
  });
}

async function finalizeAgentRunFailure(input: {
  agentRunId: string;
  executionStepId?: string;
  executionId?: string;
  error: string;
}) {
  if (input.executionStepId) {
    await prisma.agentStep.update({
      where: {
        id: input.executionStepId
      },
      data: {
        status: AgentStepStatus.FAILED,
        error: input.error,
        completedAt: new Date()
      }
    });
  }

  if (input.executionId) {
    await prisma.agentActionExecution.update({
      where: {
        id: input.executionId
      },
      data: {
        status: AgentExecutionStatus.FAILED,
        error: input.error
      }
    });
  }

  await prisma.agentRun.update({
    where: {
      id: input.agentRunId
    },
    data: {
      status: AgentRunStatus.FAILED,
      error: input.error,
      completedAt: new Date()
    }
  });
}

async function executeAgentRun(input: {
  agentRunId: string;
  organizationId: string;
  userId: string;
  type: CompanyChatActionType;
  payload: Record<string, unknown>;
}) {
  const definition = getAgentActionDefinition(input.type);

  const executionStep = await createAgentStep({
    agentRunId: input.agentRunId,
    kind: "execute",
    title: `Executar ${definition.label}`,
    status: AgentStepStatus.IN_PROGRESS,
    toolName: input.type,
    input: input.payload,
    startedAt: new Date()
  });

  const execution = await prisma.agentActionExecution.create({
    data: {
      organizationId: input.organizationId,
      agentRunId: input.agentRunId,
      executedByUserId: input.userId,
      actionType: input.type,
      status: AgentExecutionStatus.PENDING,
      inputPayload: asJsonValue(input.payload)
    }
  });

  try {
    const result = await definition.execute({
      organizationId: input.organizationId,
      userId: input.userId,
      payload: input.payload
    });

    await prisma.agentStep.update({
      where: {
        id: executionStep.id
      },
      data: {
        status: AgentStepStatus.COMPLETED,
        output: asJsonValue(result),
        completedAt: new Date()
      }
    });

    await prisma.agentActionExecution.update({
      where: {
        id: execution.id
      },
      data: {
        status: AgentExecutionStatus.SUCCEEDED,
        targetType: result.targetType ?? null,
        targetId: result.targetId ?? null,
        resultPayload: result.resultPayload ?? Prisma.JsonNull
      }
    });

    await prisma.agentRun.update({
      where: {
        id: input.agentRunId
      },
      data: {
        status: AgentRunStatus.SUCCEEDED,
        summary: result.summary,
        completedAt: new Date(),
        error: null
      }
    });

    return {
      summary: result.summary,
      executionId: execution.id,
      executionStatus: AgentExecutionStatus.SUCCEEDED
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao executar a ação do agente.";

    await finalizeAgentRunFailure({
      agentRunId: input.agentRunId,
      executionStepId: executionStep.id,
      executionId: execution.id,
      error: message
    });

    throw error;
  }
}

export async function applyAgentAction(input: ApplyAgentActionInput): Promise<AgentExecutionResult> {
  const definition = getAgentActionDefinition(input.type);

  if (definition.requiredPermission && !hasPermission(input.userRole, definition.requiredPermission)) {
    throw new Error("Seu papel atual não tem permissao para essa ação do agente.");
  }

  const preview = await definition.buildPreview({
    organizationId: input.organizationId,
    userId: input.userId,
    payload: input.payload
  });

  const agentRun = await prisma.agentRun.create({
    data: {
      organizationId: input.organizationId,
      startedByUserId: input.userId,
      chatThreadId: input.threadId ?? null,
      mode: input.mode ?? AgentRunMode.CHAT_ASSISTED,
      goal: input.goal ?? preview,
      actionType: input.type,
      actionPayload: asJsonValue(input.payload),
      status: definition.requiresApproval ? AgentRunStatus.WAITING_APPROVAL : AgentRunStatus.EXECUTING,
      riskLevel: definition.riskLevel,
      requiresApproval: definition.requiresApproval,
      summary: preview
    }
  });

  await createAgentStep({
    agentRunId: agentRun.id,
    kind: "plan",
    title: `Planejar ${definition.label}`,
    status: AgentStepStatus.COMPLETED,
    input: input.payload,
    output: {
      preview
    },
    completedAt: new Date()
  });

  await createAgentStep({
    agentRunId: agentRun.id,
    kind: "validate",
    title: `Validar ${definition.label}`,
    status: AgentStepStatus.COMPLETED,
    output: {
      requiredPermission: definition.requiredPermission ?? null,
      riskLevel: definition.riskLevel,
      requiresApproval: definition.requiresApproval
    },
    completedAt: new Date()
  });

  if (definition.requiresApproval) {
    await createAgentStep({
      agentRunId: agentRun.id,
      kind: "approval",
      title: `Aguardar aprovação para ${definition.label}`,
      status: AgentStepStatus.WAITING_APPROVAL
    });

    const approval = await prisma.agentApprovalRequest.create({
      data: {
        organizationId: input.organizationId,
        agentRunId: agentRun.id,
        requestedByUserId: input.userId,
        title: `Aprovar: ${definition.label}`,
        summary: preview,
        riskLevel: definition.riskLevel,
        payload: asJsonValue(input.payload),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3)
      }
    });

    return {
      kind: "approval_requested",
      summary: `Aprovação solicitada: ${preview}`,
      agentRunId: agentRun.id,
      approvalRequestId: approval.id,
      approvalStatus: approval.status,
      requiresApproval: true,
      riskLevel: definition.riskLevel,
      actionType: input.type
    };
  }

  const executionResult = await executeAgentRun({
    agentRunId: agentRun.id,
    organizationId: input.organizationId,
    userId: input.userId,
    type: input.type,
    payload: input.payload
  });

  return {
    kind: "executed",
    summary: executionResult.summary,
    agentRunId: agentRun.id,
    executionId: executionResult.executionId,
    executionStatus: executionResult.executionStatus,
    requiresApproval: false,
    riskLevel: definition.riskLevel,
    actionType: input.type
  };
}

export async function reviewAgentApproval(input: ReviewAgentApprovalInput): Promise<AgentExecutionResult> {
  if (!hasPermission(input.approverRole, "review_agent_approvals")) {
    throw new Error("Seu papel atual não pode revisar ações do agente.");
  }

  const approval = await prisma.agentApprovalRequest.findFirst({
    where: {
      id: input.approvalRequestId,
      organizationId: input.organizationId
    },
    include: {
      agentRun: true
    }
  });

  if (!approval) {
    throw new Error("Solicitação de aprovação não encontrada.");
  }

  if (approval.status !== AgentApprovalStatus.PENDING) {
    throw new Error("Essa solicitação de aprovação ja foi resolvida.");
  }

  const runActionType = approval.agentRun.actionType as CompanyChatActionType | null;

  if (!runActionType) {
    throw new Error("A execucao do agente não possui tipo de ação valido.");
  }

  const definition = getAgentActionDefinition(runActionType);
  const approvalStep = await prisma.agentStep.findFirst({
    where: {
      agentRunId: approval.agentRunId,
      kind: "approval"
    },
    orderBy: [{ createdAt: "desc" }]
  });

  if (input.decision === "REJECT") {
    await prisma.agentApprovalRequest.update({
      where: {
        id: approval.id
      },
      data: {
        status: AgentApprovalStatus.REJECTED,
        approverUserId: input.approverUserId,
        approvedAt: new Date(),
        notes: input.notes ?? null
      }
    });

    if (approvalStep) {
      await prisma.agentStep.update({
        where: {
          id: approvalStep.id
        },
        data: {
          status: AgentStepStatus.SKIPPED,
          output: asJsonValue({
            decision: "REJECTED",
            notes: input.notes ?? null
          }),
          completedAt: new Date()
        }
      });
    }

    await prisma.agentRun.update({
      where: {
        id: approval.agentRunId
      },
      data: {
        status: AgentRunStatus.REJECTED,
        summary: `Ação rejeitada em aprovação: ${approval.summary}`,
        error: input.notes ?? "Ação rejeitada em aprovação.",
        completedAt: new Date()
      }
    });

    return {
      kind: "rejected",
      summary: `Aprovação rejeitada para: ${approval.summary}`,
      agentRunId: approval.agentRunId,
      approvalRequestId: approval.id,
      approvalStatus: AgentApprovalStatus.REJECTED,
      requiresApproval: true,
      riskLevel: definition.riskLevel,
      actionType: runActionType
    };
  }

  await prisma.agentApprovalRequest.update({
    where: {
      id: approval.id
    },
    data: {
      status: AgentApprovalStatus.APPROVED,
      approverUserId: input.approverUserId,
      approvedAt: new Date(),
      notes: input.notes ?? null
    }
  });

  if (approvalStep) {
    await prisma.agentStep.update({
      where: {
        id: approvalStep.id
      },
      data: {
        status: AgentStepStatus.COMPLETED,
        output: asJsonValue({
          decision: "APPROVED",
          notes: input.notes ?? null
        }),
        completedAt: new Date()
      }
    });
  }

  await prisma.agentRun.update({
    where: {
      id: approval.agentRunId
    },
    data: {
      status: AgentRunStatus.EXECUTING,
      error: null
    }
  });

  const executionResult = await executeAgentRun({
    agentRunId: approval.agentRunId,
    organizationId: input.organizationId,
    userId: approval.agentRun.startedByUserId ?? input.approverUserId,
    type: runActionType,
    payload: (approval.payload as Record<string, unknown> | null) ?? (approval.agentRun.actionPayload as Record<string, unknown> | null) ?? {}
  });

  return {
    kind: "executed",
    summary: executionResult.summary,
    agentRunId: approval.agentRunId,
    executionId: executionResult.executionId,
    executionStatus: executionResult.executionStatus,
    requiresApproval: true,
    riskLevel: definition.riskLevel,
    actionType: runActionType
  };
}

export function getAgentExecutionMetadata(result: AgentExecutionResult) {
  return {
    agentRunId: result.agentRunId,
    actionType: result.actionType,
    status:
      result.kind === "approval_requested"
        ? AgentRunStatus.WAITING_APPROVAL
        : result.kind === "rejected"
          ? AgentRunStatus.REJECTED
          : AgentRunStatus.SUCCEEDED,
    mode: AgentRunMode.CHAT_ASSISTED,
    riskLevel: result.riskLevel,
    requiresApproval: result.requiresApproval,
    approvalRequestId: "approvalRequestId" in result ? result.approvalRequestId : null,
    approvalStatus:
      result.kind === "approval_requested"
        ? result.approvalStatus
        : result.kind === "rejected"
          ? result.approvalStatus
          : result.requiresApproval
            ? AgentApprovalStatus.APPROVED
            : null,
    executionStatus: result.kind === "executed" ? result.executionStatus : null,
    summary: result.summary
  };
}

export function enrichCompanyChatActionProposals(proposals: CompanyChatActionProposal[]) {
  return proposals.map((proposal) => enrichAgentActionProposal(proposal));
}
