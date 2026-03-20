"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma/client";
import { emailTemplateFormSchema } from "@/lib/validations/communication";

export async function updateEmailTemplate(formData: FormData) {
  const user = await requirePermission("manage_communications");

  const payload = emailTemplateFormSchema.parse({
    type: formData.get("type"),
    name: formData.get("name"),
    subject: formData.get("subject"),
    bodyHtml: formData.get("bodyHtml"),
    bodyText: formData.get("bodyText")
  });

  await prisma.emailTemplate.upsert({
    where: {
      organizationId_type: {
        organizationId: user.organizationId,
        type: payload.type
      }
    },
    update: payload,
    create: {
      organizationId: user.organizationId,
      ...payload
    }
  });

  revalidatePath("/communications");
}
