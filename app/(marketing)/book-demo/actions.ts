"use server";

import type { DemoRequestFormState } from "@/components/marketing/demo-request-form";
import { prisma } from "@/lib/prisma/client";
import { demoRequestSchema } from "@/lib/validations/demo-request";

export async function createDemoRequest(
  _previousState: DemoRequestFormState,
  formData: FormData
): Promise<DemoRequestFormState> {
  const parsed = demoRequestSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    company: formData.get("company"),
    role: formData.get("role") || undefined,
    teamSize: formData.get("teamSize") || undefined,
    message: formData.get("message") || undefined,
    sourcePage: formData.get("sourcePage") || undefined
  });

  if (!parsed.success) {
    return {
      error: parsed.error.errors[0]?.message ?? "Não foi possível enviar sua solicitação."
    };
  }

  await prisma.demoRequest.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      company: parsed.data.company,
      role: parsed.data.role || null,
      teamSize: parsed.data.teamSize || null,
      message: parsed.data.message || null,
      sourcePage: parsed.data.sourcePage || "marketing"
    }
  });

  return {
    success: "Pedido de demo enviado. Agora o time comercial pode te responder com contexto."
  };
}
