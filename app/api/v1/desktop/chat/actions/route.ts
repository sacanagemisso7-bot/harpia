import { NextResponse } from "next/server";
import { z } from "zod";

import { createAuditEvent } from "@/lib/audit/events";
import { requireDesktopApiUser } from "@/lib/auth/desktop-session";
import { applyCompanyChatActionForUser } from "@/modules/company-chat/runtime";

const desktopChatActionSchema = z.object({
  threadId: z.string().min(1),
  actionType: z.enum([
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
  payload: z.record(z.any())
});

export async function POST(request: Request) {
  const user = await requireDesktopApiUser(request, "view_chat");

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = desktopChatActionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid action payload" }, { status: 400 });
  }

  const summary = await applyCompanyChatActionForUser({
    organizationId: user.organizationId,
    userId: user.id,
    userRole: user.role,
    threadId: parsed.data.threadId,
    type: parsed.data.actionType,
    payload: parsed.data.payload
  });

  await createAuditEvent({
    organizationId: user.organizationId,
    actorId: user.id,
    action: "chat.action_applied",
    entityType: "chat_thread",
    entityId: parsed.data.threadId,
    summary,
    metadata: {
      surface: "desktop",
      actionType: parsed.data.actionType
    }
  });

  return NextResponse.json({
    ok: true,
    summary
  });
}
