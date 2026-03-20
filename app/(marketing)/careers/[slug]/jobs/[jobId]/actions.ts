"use server";

import { CandidateSource } from "@prisma/client";

import type { PublicApplyState } from "@/components/careers/public-application-form";
import { evaluateApplication } from "@/lib/applications/scoring";
import { checkBillingLimit } from "@/lib/billing/usage";
import { getCareersJob } from "@/lib/careers/queries";
import { prisma } from "@/lib/prisma/client";
import { extractResumeText } from "@/lib/resumes/extract";
import { storeResumeFile } from "@/lib/resumes/storage";
import { resumeUploadSchema } from "@/lib/validations/candidate";

function normalizeOptionalString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length ? trimmedValue : undefined;
}

export async function submitPublicApplication(
  slug: string,
  jobId: string,
  _previousState: PublicApplyState,
  formData: FormData
): Promise<PublicApplyState> {
  const job = await getCareersJob(slug, jobId);

  if (!job) {
    return {
      error: "Vaga nao encontrada ou encerrada."
    };
  }

  const email = normalizeOptionalString(formData.get("email"));
  const fullName = normalizeOptionalString(formData.get("fullName"));

  if (!email || !fullName) {
    return {
      error: "Nome e email sao obrigatorios."
    };
  }

  const defaultStage = await prisma.pipelineStage.findFirst({
    where: {
      organizationId: job.organizationId,
      isDefault: true
    }
  });

  if (!defaultStage) {
    return {
      error: "A organizacao ainda nao configurou o pipeline padrao."
    };
  }

  let candidate = await prisma.candidate.findFirst({
    where: {
      organizationId: job.organizationId,
      email
    },
    include: {
      resumes: {
        orderBy: { uploadedAt: "desc" },
        take: 1
      }
    }
  });

  if (!candidate) {
    const organization = await prisma.organization.findUnique({
      where: {
        id: job.organizationId
      },
      select: {
        billingPlan: true
      }
    });

    if (!organization) {
      return {
        error: "Organizacao indisponivel para receber candidaturas agora."
      };
    }

    const candidateLimit = await checkBillingLimit(job.organizationId, organization.billingPlan, "monthlyCandidates");

    if (!candidateLimit.allowed) {
      return {
        error: "Essa empresa atingiu o limite de candidatos do plano atual. Tente novamente mais tarde."
      };
    }

    candidate = await prisma.candidate.create({
      data: {
        organizationId: job.organizationId,
        fullName,
        email,
        phone: normalizeOptionalString(formData.get("phone")) || null,
        linkedinUrl: normalizeOptionalString(formData.get("linkedinUrl")) || null,
        location: normalizeOptionalString(formData.get("location")) || null,
        summary: normalizeOptionalString(formData.get("summary")) || null,
        currentTitle: normalizeOptionalString(formData.get("currentTitle")) || null,
        currentCompany: normalizeOptionalString(formData.get("currentCompany")) || null,
        source: CandidateSource.CAREERS_PAGE
      },
      include: {
        resumes: {
          orderBy: { uploadedAt: "desc" },
          take: 1
        }
      }
    });
  }

  const resume = formData.get("resume");

  if (resume instanceof File && resume.size > 0) {
    const parsedResume = resumeUploadSchema.safeParse({
      candidateId: candidate.id,
      fileName: resume.name,
      mimeType: resume.type,
      sizeBytes: resume.size
    });

    if (!parsedResume.success) {
      return {
        error: parsedResume.error.errors[0]?.message ?? "O curriculo nao pode ser processado."
      };
    }

    const fileBuffer = Buffer.from(await resume.arrayBuffer());
    const storedFile = await storeResumeFile({
      organizationId: job.organizationId,
      candidateId: candidate.id,
      fileName: resume.name,
      fileBuffer,
      mimeType: resume.type
    });

    let extractedText: string | null = null;

    try {
      extractedText = await extractResumeText(fileBuffer);
    } catch (error) {
      console.error("Failed to parse public resume PDF", error);
    }

    await prisma.resume.create({
      data: {
        candidateId: candidate.id,
        storageKey: storedFile.storageKey,
        fileName: resume.name,
        mimeType: resume.type,
        sizeBytes: resume.size,
        extractedText,
        parsedAt: extractedText ? new Date() : null
      }
    });

    candidate = await prisma.candidate.findUniqueOrThrow({
      where: { id: candidate.id },
      include: {
        resumes: {
          orderBy: { uploadedAt: "desc" },
          take: 1
        }
      }
    });
  }

  const existingApplication = await prisma.application.findUnique({
    where: {
      jobId_candidateId: {
        jobId: job.id,
        candidateId: candidate.id
      }
    }
  });

  if (existingApplication) {
    return {
      success: "Sua candidatura ja estava registrada para esta vaga."
    };
  }

  const assessment = await evaluateApplication(job, candidate);

  await prisma.application.create({
    data: {
      organizationId: job.organizationId,
      jobId: job.id,
      candidateId: candidate.id,
      currentStageId: defaultStage.id,
      score: assessment.score,
      scoreJustification: assessment.scoreJustification,
      executiveSummary: assessment.executiveSummary,
      strengths: assessment.strengths,
      gaps: assessment.gaps,
      detectedSkills: assessment.detectedSkills,
      detectedExperience: assessment.detectedExperience,
      suggestedQuestions: assessment.suggestedQuestions,
      history: {
        create: {
          toStageId: defaultStage.id,
          notes: "Candidatura recebida pela careers page."
        }
      }
    }
  });

  return {
    success: "Candidatura enviada com sucesso."
  };
}
