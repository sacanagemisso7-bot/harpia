import { NextResponse } from "next/server";
import { z } from "zod";

import { createAuditEvent } from "@/lib/audit/events";
import { requireDesktopApiUser } from "@/lib/auth/desktop-session";
import { getAgentApprovalReviewContext } from "@/modules/ai-agent/queries";
import { reviewAgentApproval } from "@/modules/ai-agent/service";
import { reviewCompanyChatApprovalForUser } from "@/modules/company-chat/runtime";
import { getDesktopAgentApprovals } from "@/modules/desktop/queries";

const desktopApprovalReviewSchema = z.object({
  approvalRequestId: z.string().min(1),
  decision: z.enum(["APPROVE", "REJECT"]),
  notes: z.string().optional()
});

export async function GET(request: Request) {
  const user = await requireDesktopApiUser(request, "review_agent_approvals");

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const data = await getDesktopAgentApprovals(user.organizationId);

  return NextResponse.json({
    ok: true,
    approvals: data.approvals.map((approval) => ({
      id: approval.id,
      title: approval.title,
      summary: approval.summary,
      riskLevel: approval.riskLevel,
      status: approval.status,
      createdAt: approval.createdAt.toISOString(),
      expiresAt: approval.expiresAt ? approval.expiresAt.toISOString() : null,
      requestedByName: approval.requestedByUser?.name ?? approval.agentRun.startedByUser?.name ?? null,
      requestedByEmail: approval.requestedByUser?.email ?? approval.agentRun.startedByUser?.email ?? null,
      threadId: approval.agentRun.chatThread?.id ?? null,
      threadTitle: approval.agentRun.chatThread?.title ?? null
    })),
    recentRuns: data.recentRuns.map((run) => ({
      id: run.id,
      goal: run.goal,
      summary: run.summary ?? null,
      status: run.status,
      riskLevel: run.riskLevel,
      requiresApproval: run.requiresApproval,
      createdAt: run.createdAt.toISOString(),
      startedByName: run.startedByUser?.name ?? null,
      latestApprovalStatus: run.approvals[0]?.status ?? null,
      latestExecutionStatus: run.executions[0]?.status ?? null,
      error: run.error ?? null
    }))
  });
}

export async function POST(request: Request) {
  const user = await requireDesktopApiUser(request, "review_agent_approvals");

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = desktopApprovalReviewSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid approval payload" }, { status: 400 });
  }

  const approval = await getAgentApprovalReviewContext(user.organizationId, parsed.data.approvalRequestId);

  if (!approval) {
    return NextResponse.json({ ok: false, error: "Approval request not found" }, { status: 404 });
  }

  const summary = approval.agentRun.chatThreadId
    ? await reviewCompanyChatApprovalForUser({
        organizationId: user.organizationId,
        approverUserId: user.id,
        approverRole: user.role,
        threadId: approval.agentRun.chatThreadId,
        approvalRequestId: parsed.data.approvalRequestId,
        decision: parsed.data.decision,
        notes: parsed.data.notes || undefined
      })
    : (
        await reviewAgentApproval({
          organizationId: user.organizationId,
          approverUserId: user.id,
          approverRole: user.role,
          approvalRequestId: parsed.data.approvalRequestId,
          decision: parsed.data.decision,
          notes: parsed.data.notes || undefined
        })
      ).summary;

  await createAuditEvent({
    organizationId: user.organizationId,
    actorId: user.id,
    action: "chat.agent_approval_reviewed",
    entityType: "agent_approval_request",
    entityId: parsed.data.approvalRequestId,
    summary,
    metadata: {
      surface: "desktop",
      decision: parsed.data.decision,
      threadId: approval.agentRun.chatThreadId ?? null
    }
  });

  return NextResponse.json({
    ok: true,
    summary
  });
}
