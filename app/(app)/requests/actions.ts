"use server";

import { PeopleTaskPriority } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { buildHrRequestResolveAssist } from "@/lib/ai/resolve-assist";
import { createAuditEvent } from "@/lib/audit/events";
import { requirePermission } from "@/lib/auth/permissions";
import { parseDateInputValue } from "@/lib/dates/parse-date-input";
import { prisma } from "@/lib/prisma/client";
import { applyAgentAction } from "@/modules/ai-agent/service";
import { addHrRequestComment, createHrRequest, getEffectiveSlaStatus, updateHrRequestStatus } from "@/modules/hr-requests/service";
import { hrRequestCommentSchema, hrRequestFormSchema, hrRequestStatusSchema } from "@/modules/hr-requests/validators";
import type { AiResolveActionState } from "@/types/ai-resolve";

function revalidateRequestSurface() {
  revalidatePath("/dashboard");
  revalidatePath("/people/command-center");
  revalidatePath("/requests");
}

export async function createHrRequestAction(formData: FormData) {
  const user = await requirePermission("view_hr_requests");
  const parsed = hrRequestFormSchema.safeParse({
    requesterEmployeeId: formData.get("requesterEmployeeId"),
    assigneeUserId: formData.get("assigneeUserId"),
    title: formData.get("title"),
    description: formData.get("description"),
    category: formData.get("category"),
    priority: formData.get("priority"),
    dueAt: formData.get("dueAt")
  });

  if (!parsed.success) {
    return;
  }

  await createHrRequest({
    organizationId: user.organizationId,
    actorId: user.id,
    data: parsed.data
  });

  revalidateRequestSurface();
}

export async function updateHrRequestStatusAction(formData: FormData) {
  const user = await requirePermission("manage_hr_requests");
  const parsed = hrRequestStatusSchema.safeParse({
    requestId: formData.get("requestId"),
    status: formData.get("status")
  });

  if (!parsed.success) {
    return;
  }

  await updateHrRequestStatus({
    organizationId: user.organizationId,
    actorId: user.id,
    requestId: parsed.data.requestId,
    status: parsed.data.status
  });

  revalidateRequestSurface();
}

export async function bulkUpdateHrRequestStatusAction(formData: FormData) {
  const user = await requirePermission("manage_hr_requests");
  const requestIds = formData
    .getAll("requestIds")
    .map((value) => String(value))
    .filter(Boolean);
  const status = formData.get("status");

  if (!requestIds.length || typeof status !== "string") {
    return;
  }

  const parsed = hrRequestStatusSchema.shape.status.safeParse(status);

  if (!parsed.success) {
    return;
  }

  for (const requestId of requestIds) {
    await updateHrRequestStatus({
      organizationId: user.organizationId,
      actorId: user.id,
      requestId,
      status: parsed.data
    });
  }

  revalidateRequestSurface();
}

export async function addHrRequestCommentAction(formData: FormData) {
  const user = await requirePermission("view_hr_requests");
  const parsed = hrRequestCommentSchema.safeParse({
    requestId: formData.get("requestId"),
    message: formData.get("message"),
    isInternal: false
  });

  if (!parsed.success) {
    return;
  }

  await addHrRequestComment({
    organizationId: user.organizationId,
    actorId: user.id,
    requestId: parsed.data.requestId,
    message: parsed.data.message
  });

  revalidateRequestSurface();
}

export async function updateHrRequestDetailsAction(formData: FormData) {
  const user = await requirePermission("manage_hr_requests");
  const requestId = String(formData.get("requestId") ?? "");
  const assigneeUserId = String(formData.get("assigneeUserId") ?? "").trim();
  const priority = String(formData.get("priority") ?? "");
  const dueAt = parseDateInputValue(formData.get("dueAt")) ?? null;

  if (!requestId || !Object.values(PeopleTaskPriority).includes(priority as PeopleTaskPriority)) {
    return;
  }

  const request = await prisma.hrRequest.findFirst({
    where: {
      id: requestId,
      organizationId: user.organizationId
    },
    select: {
      id: true,
      title: true,
      status: true,
      assigneeUserId: true,
      priority: true,
      dueAt: true
    }
  });

  if (!request) {
    return;
  }

  const updated = await prisma.hrRequest.update({
    where: { id: request.id },
    data: {
      assigneeUserId: assigneeUserId || null,
      priority: priority as PeopleTaskPriority,
      dueAt,
      slaStatus: getEffectiveSlaStatus({
        dueAt,
        status: request.status
      })
    }
  });

  await createAuditEvent({
    organizationId: user.organizationId,
    actorId: user.id,
    action: "hr_request.details_updated",
    entityType: "hr_request",
    entityId: updated.id,
    summary: `Contexto da solicitação ${updated.title} atualizado.`,
    metadata: {
      assigneeUserId: updated.assigneeUserId,
      priority: updated.priority,
      dueAt: updated.dueAt?.toISOString() ?? null
    }
  });

  revalidateRequestSurface();
}

export async function resolveHrRequestWithAiAction(
  _previousState: AiResolveActionState,
  formData: FormData
): Promise<AiResolveActionState> {
  const user = await requirePermission("manage_hr_requests");
  const requestId = String(formData.get("requestId") ?? "");
  const mode = formData.get("mode") === "approval" ? "approval" : "apply";

  if (!requestId) {
    return {
      error: "Solicitação inválida.",
      mode
    };
  }

  const request = await prisma.hrRequest.findFirst({
    where: {
      id: requestId,
      organizationId: user.organizationId
    },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      priority: true,
      status: true,
      slaStatus: true,
      assigneeUser: {
        select: {
          name: true
        }
      },
      requesterEmployee: {
        select: {
          fullName: true
        }
      },
      requesterUser: {
        select: {
          name: true
        }
      },
      comments: {
        select: {
          id: true
        }
      }
    }
  });

  if (!request) {
    return {
      error: "Solicitação não encontrada.",
      mode
    };
  }

  const assist = buildHrRequestResolveAssist({
    title: request.title,
    description: request.description,
    category: request.category,
    priority: request.priority,
    status: request.status,
    effectiveSlaStatus: request.slaStatus,
    requesterName: request.requesterEmployee?.fullName ?? request.requesterUser?.name ?? null,
    assigneeName: request.assigneeUser?.name ?? null,
    commentCount: request.comments.length
  });

  const parsedStatus = hrRequestStatusSchema.shape.status.safeParse(String(formData.get("status") ?? assist.suggestedStatus));

  if (!parsedStatus.success) {
    return {
      error: "Status sugerido inválido.",
      mode
    };
  }

  const requestedStatus = parsedStatus.data;
  const note = String(formData.get("note") ?? "").trim() || assist.draftNote;

  try {
    if (mode === "approval") {
      const result = await applyAgentAction({
        organizationId: user.organizationId,
        userId: user.id,
        userRole: user.role,
        type: "resolve_hr_request",
        payload: {
          requestId: request.id,
          status: requestedStatus,
          note
        },
        goal: `Resolver a solicitação ${request.title} com apoio da IA.`
      });

      await createAuditEvent({
        organizationId: user.organizationId,
        actorId: user.id,
        action: "hr_request.ai_resolution_requested",
        entityType: "hr_request",
        entityId: request.id,
        summary: result.summary,
        metadata: {
          mode,
          status: requestedStatus
        }
      });

      revalidateRequestSurface();

      return {
        success: result.summary,
        mode
      };
    }

    const updated = await updateHrRequestStatus({
      organizationId: user.organizationId,
      actorId: user.id,
      requestId: request.id,
      status: requestedStatus
    });

    await addHrRequestComment({
      organizationId: user.organizationId,
      actorId: user.id,
      requestId: request.id,
      message: note,
      isInternal: true
    });

    await createAuditEvent({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "hr_request.ai_resolution_applied",
      entityType: "hr_request",
      entityId: request.id,
      summary: `Encaminhamento assistido aplicado em ${updated.title}.`,
      metadata: {
        status: updated.status
      }
    });

    revalidateRequestSurface();

    return {
      success: `Encaminhamento aplicado em ${updated.title}.`,
      mode
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Não foi possível concluir a ação assistida agora.",
      mode
    };
  }
}
