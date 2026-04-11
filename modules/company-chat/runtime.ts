import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma/client";
import { applyAgentAction, getAgentExecutionMetadata, reviewAgentApproval } from "@/modules/ai-agent/service";
import { buildCompanyChatReply, buildThreadTitle } from "@/modules/company-chat/service";

function asJson(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function sendCompanyChatMessageForUser(input: {
  organizationId: string;
  userId: string;
  message: string;
  threadId?: string;
  title?: string;
}) {
  let threadId = input.threadId;

  if (!threadId) {
    const thread = await prisma.chatThread.create({
      data: {
        organizationId: input.organizationId,
        ownerId: input.userId,
        title: input.title || (await buildThreadTitle(input.message))
      }
    });
    threadId = thread.id;
  }

  const thread = await prisma.chatThread.findFirst({
    where: {
      id: threadId,
      organizationId: input.organizationId,
      ownerId: input.userId
    }
  });

  if (!thread) {
    throw new Error("Chat thread not found.");
  }

  await prisma.chatMessage.create({
    data: {
      organizationId: input.organizationId,
      threadId: thread.id,
      authorId: input.userId,
      role: "USER",
      content: input.message
    }
  });

  const assistantReply = await buildCompanyChatReply(input.organizationId, input.message);
  const assistantMetadata = asJson({
    suggestedPrompts: assistantReply.suggestedPrompts,
    relatedEntities: assistantReply.relatedEntities,
    actionProposals: assistantReply.actionProposals,
    toolTraces: assistantReply.toolTraces,
    citations: assistantReply.citations,
    emailDraft: assistantReply.emailDraft ?? null,
    policyDraft: assistantReply.policyDraft ?? null,
    policyOperations: assistantReply.policyOperations ?? null
  });

  const assistantMessage = await prisma.chatMessage.create({
    data: {
      organizationId: input.organizationId,
      threadId: thread.id,
      role: "ASSISTANT",
      content: assistantReply.reply,
      metadata: assistantMetadata
    }
  });

  await prisma.chatThread.update({
    where: {
      id: thread.id
    },
    data: {
      lastMessageAt: new Date(),
      title: thread.title || (await buildThreadTitle(input.message))
    }
  });

  return {
    threadId: thread.id,
    assistantMessage
  };
}

export async function applyCompanyChatActionForUser(input: {
  organizationId: string;
  userId: string;
  userRole: string;
  threadId: string;
  type:
    | "create_note"
    | "move_stage"
    | "save_shortlist"
    | "draft_email"
    | "schedule_interview"
    | "create_onboarding_plan"
    | "create_offboarding_plan"
    | "create_hr_request"
    | "update_hr_request"
    | "create_people_task"
    | "update_people_task";
  payload: Record<string, unknown>;
}) {
  const thread = await prisma.chatThread.findFirst({
    where: {
      id: input.threadId,
      organizationId: input.organizationId,
      ownerId: input.userId
    }
  });

  if (!thread) {
    throw new Error("Chat thread not found.");
  }

  const result = await applyAgentAction({
    organizationId: input.organizationId,
    userId: input.userId,
    userRole: input.userRole,
    threadId: thread.id,
    type: input.type,
    payload: input.payload,
    goal: `Executar ${input.type} a partir do company chat.`
  });

  await prisma.chatMessage.create({
    data: {
      organizationId: input.organizationId,
      threadId: thread.id,
      role: "SYSTEM",
      authorId: input.userId,
      content: result.summary,
      metadata: asJson({
        actionType: input.type,
        agentExecution: getAgentExecutionMetadata(result)
      })
    }
  });

  return result.summary;
}

export async function reviewCompanyChatApprovalForUser(input: {
  organizationId: string;
  approverUserId: string;
  approverRole: string;
  threadId: string;
  approvalRequestId: string;
  decision: "APPROVE" | "REJECT";
  notes?: string;
}) {
  const thread = await prisma.chatThread.findFirst({
    where: {
      id: input.threadId,
      organizationId: input.organizationId
    }
  });

  if (!thread) {
    throw new Error("Chat thread not found.");
  }

  const result = await reviewAgentApproval({
    organizationId: input.organizationId,
    approverUserId: input.approverUserId,
    approverRole: input.approverRole,
    approvalRequestId: input.approvalRequestId,
    decision: input.decision,
    notes: input.notes
  });

  await prisma.chatMessage.create({
    data: {
      organizationId: input.organizationId,
      threadId: thread.id,
      role: "SYSTEM",
      authorId: input.approverUserId,
      content: result.summary,
      metadata: asJson({
        actionType: result.actionType,
        agentExecution: getAgentExecutionMetadata(result)
      })
    }
  });

  return result.summary;
}
