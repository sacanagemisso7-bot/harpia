"use server";

import { revalidatePath } from "next/cache";

import { requireCurrentUser } from "@/lib/auth/current-user";
import { requirePermission } from "@/lib/auth/permissions";
import { hasPermission } from "@/lib/auth/permission-matrix";
import { parseDateInputValue } from "@/lib/dates/parse-date-input";
import { prisma } from "@/lib/prisma/client";
import { acknowledgePolicy, assignPolicyToEmployees } from "@/modules/compliance/service";

function revalidatePolicySurfaces(employeeId?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/people/command-center");
  revalidatePath("/people/compliance");
  revalidatePath("/me/policies");
  revalidatePath("/chat");

  if (employeeId) {
    revalidatePath(`/employees/${employeeId}`);
  }
}

export async function acknowledgePolicyAction(formData: FormData) {
  const user = await requireCurrentUser();
  const acknowledgementId = String(formData.get("acknowledgementId") ?? "");

  if (!acknowledgementId) {
    return;
  }

  const acknowledgement = await prisma.policyAcknowledgement.findFirst({
    where: {
      id: acknowledgementId,
      organizationId: user.organizationId
    },
    include: {
      employee: {
        select: {
          id: true,
          linkedUserId: true
        }
      }
    }
  });

  if (!acknowledgement) {
    return;
  }

  const canManageCompliance = hasPermission(user.role, "manage_compliance");
  const isSelfAcknowledgement = acknowledgement.employee.linkedUserId === user.id;

  if (!canManageCompliance && !isSelfAcknowledgement) {
    return;
  }

  await acknowledgePolicy({
    organizationId: user.organizationId,
    actorId: user.id,
    acknowledgementId
  });

  revalidatePolicySurfaces(acknowledgement.employee.id);
}

export async function assignPolicyAction(formData: FormData) {
  const user = await requirePermission("manage_compliance");
  const documentId = String(formData.get("documentId") ?? "");
  const employeeIds = formData
    .getAll("employeeIds")
    .map((value) => String(value))
    .filter(Boolean);
  const dueAtRaw = String(formData.get("dueAt") ?? "").trim();

  if (!documentId || !employeeIds.length) {
    return;
  }

  await assignPolicyToEmployees({
    organizationId: user.organizationId,
    actorId: user.id,
    documentId,
    employeeIds,
    dueAt: parseDateInputValue(dueAtRaw) ?? null
  });

  revalidatePath("/knowledge");
  revalidatePolicySurfaces();
}
