"use server";

import { revalidatePath } from "next/cache";

import type { AgentApprovalReviewState } from "@/components/ai-agent/agent-approval-review-form";
import { createAuditEvent } from "@/lib/audit/events";
import { requirePermission } from "@/lib/auth/permissions";
import { getAgentApprovalReviewContext } from "@/modules/ai-agent/queries";
import { reviewAgentApproval } from "@/modules/ai-agent/service";
import { reviewCompanyChatApprovalForUser } from "@/modules/company-chat/runtime";

export async function reviewAgentApprovalAction(
  _previousState: AgentApprovalReviewState,
  formData: FormData
): Promise<AgentApprovalReviewState> {
  const user = await requirePermission("review_agent_approvals");
  const approvalRequestId = String(formData.get("approvalRequestId") ?? "");
  const decisionValue = String(formData.get("decision") ?? "");
  const notes = String(formData.get("notes") ?? "");

  if (!approvalRequestId || (decisionValue !== "APPROVE" && decisionValue !== "REJECT")) {
    return {
      error: "Solicitacao de aprovacao invalida."
    };
  }

  const approval = await getAgentApprovalReviewContext(user.organizationId, approvalRequestId);

  if (!approval) {
    return {
      error: "Solicitacao de aprovacao nao encontrada."
    };
  }

  const summary = approval.agentRun.chatThreadId
    ? await reviewCompanyChatApprovalForUser({
        organizationId: user.organizationId,
        approverUserId: user.id,
        approverRole: user.role,
        threadId: approval.agentRun.chatThreadId,
        approvalRequestId,
        decision: decisionValue,
        notes: notes || undefined
      })
    : (
        await reviewAgentApproval({
          organizationId: user.organizationId,
          approverUserId: user.id,
          approverRole: user.role,
          approvalRequestId,
          decision: decisionValue,
          notes: notes || undefined
        })
      ).summary;

  await createAuditEvent({
    organizationId: user.organizationId,
    actorId: user.id,
    action: "chat.agent_approval_reviewed",
    entityType: "agent_approval_request",
    entityId: approvalRequestId,
    summary,
    metadata: {
      decision: decisionValue,
      threadId: approval.agentRun.chatThreadId ?? null
    }
  });

  revalidatePath("/chat");
  revalidatePath("/dashboard");
  revalidatePath("/people/command-center");
  revalidatePath("/people/agent-approvals");

  return {
    success: summary
  };
}
