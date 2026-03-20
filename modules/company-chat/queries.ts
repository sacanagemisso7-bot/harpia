import { hasPermission } from "@/lib/auth/permission-matrix";
import { prisma } from "@/lib/prisma/client";

export async function getCompanyChatWorkspace(input: {
  organizationId: string;
  userId: string;
  userRole?: string;
  threadId?: string;
}) {
  const canReviewSharedThreads = input.userRole ? hasPermission(input.userRole, "review_agent_approvals") : false;
  const threads = await prisma.chatThread.findMany({
    where: {
      organizationId: input.organizationId,
      ownerId: input.userId
    },
    include: {
      messages: {
        orderBy: [{ createdAt: "desc" }],
        take: 1
      }
    },
    orderBy: [{ lastMessageAt: "desc" }]
  });

  const activeThreadId = input.threadId ?? threads[0]?.id;
  const activeThread = activeThreadId
    ? await prisma.chatThread.findFirst({
        where: {
          id: activeThreadId,
          organizationId: input.organizationId,
          ...(canReviewSharedThreads ? {} : { ownerId: input.userId })
        },
        include: {
          messages: {
            orderBy: [{ createdAt: "asc" }]
          }
        }
      })
    : null;

  const normalizedThreads =
    activeThread && !threads.some((thread) => thread.id === activeThread.id)
      ? [
          {
            ...activeThread,
            messages: activeThread.messages.slice(-1)
          },
          ...threads
        ]
      : threads;

  return {
    threads: normalizedThreads,
    activeThread
  };
}
