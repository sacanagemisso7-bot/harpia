import { NextResponse } from "next/server";

import { requireDesktopApiUser } from "@/lib/auth/desktop-session";
import { getCompanyChatWorkspace } from "@/modules/company-chat/queries";

export async function GET(request: Request) {
  const user = await requireDesktopApiUser(request, "view_chat");

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const threadId = searchParams.get("threadId") ?? undefined;
  const workspace = await getCompanyChatWorkspace({
    organizationId: user.organizationId,
    userId: user.id,
    userRole: user.role,
    threadId
  });

  return NextResponse.json({
    ok: true,
    workspace: {
      threads: workspace.threads.map((thread) => ({
        id: thread.id,
        title: thread.title,
        scope: thread.scope,
        lastMessageAt: thread.lastMessageAt.toISOString(),
        latestMessage: thread.messages[0]?.content ?? null
      })),
      activeThread: workspace.activeThread
        ? {
            id: workspace.activeThread.id,
            title: workspace.activeThread.title,
            scope: workspace.activeThread.scope,
            messages: workspace.activeThread.messages.map((message) => ({
              id: message.id,
              role: message.role,
              content: message.content,
              createdAt: message.createdAt.toISOString(),
              metadata: message.metadata
            }))
          }
        : null
    }
  });
}
