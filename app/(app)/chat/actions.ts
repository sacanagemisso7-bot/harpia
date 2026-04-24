"use server";

import { revalidatePath } from "next/cache";

import type { CompanyChatComposerState } from "@/components/chat/company-chat-composer";
import type { CompanyChatActionState } from "@/components/chat/company-chat-proposal-form";
import { createAuditEvent } from "@/lib/audit/events";
import { requirePermission } from "@/lib/auth/permissions";
import { companyChatMessageSchema } from "@/lib/validations/company-chat";
import {
  applyCompanyChatActionForUser,
  reviewCompanyChatApprovalForUser,
  sendCompanyChatMessageForUser
} from "@/modules/company-chat/runtime";
import type { CompanyChatActionType } from "@/types/company-chat";

export async function sendCompanyChatMessage(
  _previousState: CompanyChatComposerState,
  formData: FormData
): Promise<CompanyChatComposerState> {
  const submissionId = crypto.randomUUID();

  try {
    const user = await requirePermission("view_chat");
    const parsed = companyChatMessageSchema.safeParse({
      message: formData.get("message"),
      threadId: formData.get("threadId") || undefined,
      title: formData.get("title") || undefined
    });

    if (!parsed.success) {
      return {
        error: parsed.error.errors[0]?.message ?? "N\u00e3o foi poss\u00edvel validar a mensagem.",
        submissionId
      };
    }

    const result = await sendCompanyChatMessageForUser({
      organizationId: user.organizationId,
      userId: user.id,
      message: parsed.data.message,
      threadId: parsed.data.threadId,
      title: parsed.data.title
    });

    await createAuditEvent({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "chat.message_sent",
      entityType: "chat_thread",
      entityId: result.threadId,
      summary: "Mensagem enviada no company chat.",
      metadata: {
        threadId: result.threadId
      }
    });

    revalidatePath("/chat");

    return {
      success: "Mensagem enviada.",
      threadId: result.threadId,
      submissionId
    };
  } catch (error) {
    console.error("chat.send-message-failed", error);
    return {
      error: "N\u00e3o foi poss\u00edvel concluir a resposta agora. Tente novamente em instantes.",
      submissionId
    };
  }
}

export async function applyCompanyChatAction(
  _previousState: CompanyChatActionState,
  formData: FormData
): Promise<CompanyChatActionState> {
  const user = await requirePermission("view_chat");
  const threadId = String(formData.get("threadId") ?? "");
  const actionType = String(formData.get("actionType") ?? "") as CompanyChatActionType;
  const payloadRaw = String(formData.get("payload") ?? "{}");

  if (!threadId || !actionType) {
    return {
      error: "A\u00e7\u00e3o do chat inv\u00e1lida."
    };
  }

  let payload: Record<string, unknown>;

  try {
    payload = JSON.parse(payloadRaw) as Record<string, unknown>;
  } catch {
    return {
      error: "N\u00e3o foi poss\u00edvel interpretar a a\u00e7\u00e3o proposta."
    };
  }

  try {
    const summary = await applyCompanyChatActionForUser({
      organizationId: user.organizationId,
      userId: user.id,
      userRole: user.role,
      threadId,
      type: actionType,
      payload
    });

    await createAuditEvent({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "chat.action_applied",
      entityType: "chat_thread",
      entityId: threadId,
      summary,
      metadata: {
        actionType
      }
    });

    revalidatePath("/chat");

    return {
      success: summary
    };
  } catch (error) {
    console.error("chat.apply-action-failed", error);
    return {
      error: "N\u00e3o foi poss\u00edvel aplicar essa a\u00e7\u00e3o agora. Tente novamente em instantes."
    };
  }
}

export async function reviewCompanyChatApproval(
  _previousState: CompanyChatActionState,
  formData: FormData
): Promise<CompanyChatActionState> {
  const user = await requirePermission("review_agent_approvals");
  const threadId = String(formData.get("threadId") ?? "");
  const approvalRequestId = String(formData.get("approvalRequestId") ?? "");
  const decisionValue = String(formData.get("decision") ?? "");
  const notes = String(formData.get("notes") ?? "");

  if (!threadId || !approvalRequestId || (decisionValue !== "APPROVE" && decisionValue !== "REJECT")) {
    return {
      error: "Solicita\u00e7\u00e3o de aprova\u00e7\u00e3o inv\u00e1lida."
    };
  }

  try {
    const summary = await reviewCompanyChatApprovalForUser({
      organizationId: user.organizationId,
      approverUserId: user.id,
      approverRole: user.role,
      threadId,
      approvalRequestId,
      decision: decisionValue,
      notes: notes || undefined
    });

    await createAuditEvent({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "chat.agent_approval_reviewed",
      entityType: "agent_approval_request",
      entityId: approvalRequestId,
      summary,
      metadata: {
        decision: decisionValue,
        threadId
      }
    });

    revalidatePath("/chat");
    revalidatePath("/people/agent-approvals");

    return {
      success: summary
    };
  } catch (error) {
    console.error("chat.review-approval-failed", error);
    return {
      error: "N\u00e3o foi poss\u00edvel registrar essa revis\u00e3o agora. Tente novamente em instantes."
    };
  }
}
