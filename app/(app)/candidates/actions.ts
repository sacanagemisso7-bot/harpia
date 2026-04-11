"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { AnalyzeResumeState } from "@/components/candidates/analyze-resume-form";
import type { ResumeUploadState } from "@/components/candidates/resume-upload-form";
import type { NoteFormState } from "@/components/notes/note-form";
import { createAuditEvent } from "@/lib/audit/events";
import { requirePermission } from "@/lib/auth/permissions";
import { checkBillingLimit } from "@/lib/billing/usage";
import { logError } from "@/lib/observability/logger";
import { prisma } from "@/lib/prisma/client";
import { extractResumeText } from "@/lib/resumes/extract";
import { storeResumeFile } from "@/lib/resumes/storage";
import { candidateFormSchema, resumeUploadSchema } from "@/lib/validations/candidate";
import { hiringNoteSchema } from "@/lib/validations/note";
import { enqueueBackgroundJob } from "@/modules/background-jobs/service";

function normalizeOptionalString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length ? trimmedValue : undefined;
}

function parseCandidateFormData(formData: FormData) {
  return candidateFormSchema.parse({
    fullName: formData.get("fullName"),
    email: normalizeOptionalString(formData.get("email")),
    phone: normalizeOptionalString(formData.get("phone")),
    linkedinUrl: normalizeOptionalString(formData.get("linkedinUrl")),
    portfolioUrl: normalizeOptionalString(formData.get("portfolioUrl")),
    location: normalizeOptionalString(formData.get("location")),
    summary: normalizeOptionalString(formData.get("summary")),
    yearsExperience: normalizeOptionalString(formData.get("yearsExperience")),
    highestEducation: normalizeOptionalString(formData.get("highestEducation")),
    currentTitle: normalizeOptionalString(formData.get("currentTitle")),
    currentCompany: normalizeOptionalString(formData.get("currentCompany")),
    source: formData.get("source")
  });
}

export async function createCandidate(formData: FormData) {
  const user = await requirePermission("manage_candidates");
  const payload = parseCandidateFormData(formData);
  const organization = await prisma.organization.findUnique({
    where: {
      id: user.organizationId
    },
    select: {
      billingPlan: true
    }
  });

  if (!organization) {
    redirect("/settings/billing?billing=organization-not-found");
  }

  const candidateLimit = await checkBillingLimit(user.organizationId, organization.billingPlan, "monthlyCandidates");

  if (!candidateLimit.allowed) {
    redirect("/settings/billing?billing=candidate-limit");
  }

  const candidate = await prisma.candidate.create({
    data: {
      organizationId: user.organizationId,
      fullName: payload.fullName,
      email: payload.email || null,
      phone: payload.phone || null,
      linkedinUrl: payload.linkedinUrl || null,
      portfolioUrl: payload.portfolioUrl || null,
      location: payload.location || null,
      summary: payload.summary || null,
      yearsExperience: payload.yearsExperience ?? null,
      highestEducation: payload.highestEducation || null,
      currentTitle: payload.currentTitle || null,
      currentCompany: payload.currentCompany || null,
      source: payload.source
    }
  });

  await createAuditEvent({
    organizationId: user.organizationId,
    actorId: user.id,
    action: "candidate.created",
    entityType: "candidate",
    entityId: candidate.id,
    summary: `Candidato ${candidate.fullName} criado manualmente.`,
    metadata: {
      candidateId: candidate.id,
      source: candidate.source
    }
  });

  revalidatePath("/dashboard");
  revalidatePath("/candidates");

  redirect(`/candidates/${candidate.id}`);
}

export async function uploadResume(
  candidateId: string,
  _previousState: ResumeUploadState,
  formData: FormData
): Promise<ResumeUploadState> {
  const user = await requirePermission("manage_candidates");

  const candidate = await prisma.candidate.findFirst({
    where: {
      id: candidateId,
      organizationId: user.organizationId
    }
  });

  if (!candidate) {
    return {
      error: "Candidato não encontrado para esta organização."
    };
  }

  const file = formData.get("resume");

  if (!(file instanceof File)) {
    return {
      error: "Selecione um arquivo PDF para continuar."
    };
  }

  const parsedFile = resumeUploadSchema.safeParse({
    candidateId,
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size
  });

  if (!parsedFile.success) {
    return {
      error: parsedFile.error.errors[0]?.message ?? "Não foi possível validar o currículo."
    };
  }

  const arrayBuffer = await file.arrayBuffer();
  const fileBuffer = Buffer.from(arrayBuffer);

  const storedFile = await storeResumeFile({
    organizationId: user.organizationId,
    candidateId,
    fileName: file.name,
    fileBuffer,
    mimeType: file.type
  });

  let extractedText: string | null = null;

  try {
    extractedText = await extractResumeText(fileBuffer);
  } catch (error) {
    logError("Failed to parse resume PDF", error, { candidateId, fileName: file.name }, "candidates");
  }

  const resume = await prisma.resume.create({
    data: {
      candidateId,
      storageKey: storedFile.storageKey,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      extractedText,
      parsedAt: extractedText ? new Date() : null
    }
  });

  await createAuditEvent({
    organizationId: user.organizationId,
    actorId: user.id,
    action: "candidate.resume_uploaded",
    entityType: "resume",
    entityId: resume.id,
    summary: `Currículo ${file.name} enviado para ${candidate.fullName}.`,
    metadata: {
      candidateId,
      resumeId: resume.id,
      extractedText: !!extractedText
    }
  });

  revalidatePath("/dashboard");
  revalidatePath("/candidates");
  revalidatePath(`/candidates/${candidateId}`);

  return {};
}

export async function analyzeCandidateResume(
  candidateId: string,
  _previousState: AnalyzeResumeState,
  _formData: FormData
): Promise<AnalyzeResumeState> {
  const user = await requirePermission("manage_candidates");
  const organization = await prisma.organization.findUnique({
    where: {
      id: user.organizationId
    },
    select: {
      billingPlan: true
    }
  });

  if (!organization) {
    return {
      error: "Organização não encontrada."
    };
  }

  const aiLimit = await checkBillingLimit(user.organizationId, organization.billingPlan, "monthlyAiAnalyses");

  if (!aiLimit.allowed) {
    return {
      error: aiLimit.message
    };
  }

  if (!process.env.OPENAI_API_KEY) {
    return {
      error: "Configure OPENAI_API_KEY para habilitar a análise com IA."
    };
  }

  const candidate = await prisma.candidate.findFirst({
    where: {
      id: candidateId,
      organizationId: user.organizationId
    },
    include: {
      resumes: {
        orderBy: { uploadedAt: "desc" },
        take: 1
      }
    }
  });

  if (!candidate) {
    return {
      error: "Candidato não encontrado para esta organização."
    };
  }

  const latestResume = candidate.resumes[0];

  if (!latestResume?.extractedText) {
    return {
      error: "Esse candidato ainda não possui texto de currículo extraído para análise."
    };
  }

  try {
    await enqueueBackgroundJob({
      organizationId: user.organizationId,
      type: "RESUME_PARSE",
      payload: {
        candidateId: candidate.id,
        resumeId: latestResume.id
      },
      uniqueKey: `resume-parse:${latestResume.id}`
    });

    await createAuditEvent({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "candidate.resume_ai_queued",
      entityType: "candidate",
      entityId: candidate.id,
      summary: `Análise com IA enfileirada para ${candidate.fullName}.`,
      metadata: {
        candidateId: candidate.id,
        resumeId: latestResume.id
      }
    });

    revalidatePath("/dashboard");
    revalidatePath("/candidates");
    revalidatePath(`/candidates/${candidateId}`);

    return {
      success: "Análise enviada para processamento. O perfil será atualizado em instantes."
    };
  } catch (error) {
    logError("Failed to enqueue resume AI analysis", error, { candidateId }, "candidates");

    return {
      error: "Não foi possível iniciar a análise com IA neste momento."
    };
  }
}

export async function createCandidateNote(
  candidateId: string,
  _previousState: NoteFormState,
  formData: FormData
): Promise<NoteFormState> {
  const user = await requirePermission("create_hiring_notes");
  const parsed = hiringNoteSchema.safeParse({
    content: formData.get("content")
  });

  if (!parsed.success) {
    return {
      error: parsed.error.errors[0]?.message ?? "Não foi possível validar a nota."
    };
  }

  const candidate = await prisma.candidate.findFirst({
    where: {
      id: candidateId,
      organizationId: user.organizationId
    }
  });

  if (!candidate) {
    return {
      error: "Candidato não encontrado."
    };
  }

  await prisma.hiringNote.create({
    data: {
      organizationId: user.organizationId,
      authorId: user.id,
      candidateId,
      content: parsed.data.content
    }
  });

  revalidatePath(`/candidates/${candidateId}`);

  return {
    success: "Nota adicionada ao perfil."
  };
}
