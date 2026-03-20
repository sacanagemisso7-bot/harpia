import { NextResponse } from "next/server";
import { z } from "zod";

import { createAuditEvent } from "@/lib/audit/events";
import { requireDesktopApiUser } from "@/lib/auth/desktop-session";
import { sendCompanyChatMessageForUser } from "@/modules/company-chat/runtime";

const desktopChatMessageSchema = z.object({
  message: z.string().min(2).max(4000),
  threadId: z.string().optional(),
  title: z.string().optional()
});

export async function POST(request: Request) {
  const user = await requireDesktopApiUser(request, "view_chat");

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = desktopChatMessageSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid chat payload" }, { status: 400 });
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
    summary: "Mensagem enviada no company chat via desktop.",
    metadata: {
      surface: "desktop",
      threadId: result.threadId
    }
  });

  return NextResponse.json({
    ok: true,
    threadId: result.threadId,
    assistantMessage: {
      id: result.assistantMessage.id,
      role: result.assistantMessage.role,
      content: result.assistantMessage.content,
      createdAt: result.assistantMessage.createdAt.toISOString(),
      metadata: result.assistantMessage.metadata
    }
  });
}
