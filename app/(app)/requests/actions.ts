"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth/permissions";
import { addHrRequestComment, createHrRequest, updateHrRequestStatus } from "@/modules/hr-requests/service";
import { hrRequestCommentSchema, hrRequestFormSchema, hrRequestStatusSchema } from "@/modules/hr-requests/validators";

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
