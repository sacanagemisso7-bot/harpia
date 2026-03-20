"use server";

import { EmailTemplateType } from "@prisma/client";
import { revalidatePath } from "next/cache";

import type { RecalculateScoreState } from "@/components/applications/recalculate-score-form";
import type { StageTransitionState } from "@/components/applications/application-stage-form";
import type { ApplyToJobState } from "@/components/candidates/apply-to-job-form";
import type { SendTemplateEmailState } from "@/components/communications/send-template-email-form";
import type { NoteFormState } from "@/components/notes/note-form";
import { createAuditEvent } from "@/lib/audit/events";
import { requirePermission } from "@/lib/auth/permissions";
import { evaluateApplication } from "@/lib/applications/scoring";
import { getTemplateLabel } from "@/lib/email/templates";
import { isEmailConfigured } from "@/lib/email/transporter";
import { logError } from "@/lib/observability/logger";
import { prisma } from "@/lib/prisma/client";
import { hiringNoteSchema } from "@/lib/validations/note";
import { enqueueBackgroundJob } from "@/modules/background-jobs/service";

export async function createApplication(
  candidateId: string,
  _previousState: ApplyToJobState,
  formData: FormData
): Promise<ApplyToJobState> {
  const user = await requirePermission("manage_applications");
  const jobId = String(formData.get("jobId") ?? "");

  if (!jobId) {
    return {
      error: "Selecione uma vaga para criar a aplicacao."
    };
  }

  const [candidate, job, defaultStage] = await Promise.all([
    prisma.candidate.findFirst({
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
    }),
    prisma.job.findFirst({
      where: {
        id: jobId,
        organizationId: user.organizationId
      },
      include: {
        criteria: {
          orderBy: { order: "asc" }
        }
      }
    }),
    prisma.pipelineStage.findFirst({
      where: {
        organizationId: user.organizationId,
        isDefault: true
      }
    })
  ]);

  if (!candidate || !job || !defaultStage) {
    return {
      error: "Nao foi possivel criar a aplicacao com os dados atuais."
    };
  }

  const existing = await prisma.application.findUnique({
    where: {
      jobId_candidateId: {
        jobId,
        candidateId
      }
    }
  });

  if (existing) {
    return {
      error: "Este candidato ja esta vinculado a essa vaga."
    };
  }

  const assessment = await evaluateApplication(job, candidate);

  const application = await prisma.application.create({
    data: {
      organizationId: user.organizationId,
      jobId,
      candidateId,
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
          movedById: user.id,
          notes: "Aplicacao criada pelo workspace."
        }
      }
    }
  });

  await createAuditEvent({
    organizationId: user.organizationId,
    actorId: user.id,
    action: "application.created",
    entityType: "application",
    entityId: application.id,
    summary: `Aplicacao criada para ${candidate.fullName} na vaga ${job.title}.`,
    metadata: {
      candidateId,
      jobId,
      score: assessment.score
    }
  });

  revalidatePath("/dashboard");
  revalidatePath("/candidates");
  revalidatePath(`/candidates/${candidateId}`);
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/pipeline");
  revalidatePath(`/applications/${application.id}`);

  return {
    success: "Aplicacao criada e score inicial calculado."
  };
}

export async function recalculateApplicationScore(
  applicationId: string,
  _previousState: RecalculateScoreState,
  _formData: FormData
): Promise<RecalculateScoreState> {
  const user = await requirePermission("manage_applications");

  try {
    const application = await prisma.application.findFirst({
      where: {
        id: applicationId,
        organizationId: user.organizationId
      }
    });

    if (!application) {
      return {
        error: "Aplicacao nao encontrada."
      };
    }

    await enqueueBackgroundJob({
      organizationId: user.organizationId,
      type: "APPLICATION_SCORE",
      payload: {
        applicationId: application.id
      },
      uniqueKey: `application-score:${application.id}`
    });

    revalidatePath("/dashboard");
    revalidatePath("/pipeline");
    revalidatePath(`/jobs/${application.jobId}`);
    revalidatePath(`/candidates/${application.candidateId}`);
    revalidatePath(`/applications/${application.id}`);

    return {
      success: "Recalculo enviado para a fila de processamento."
    };
  } catch (error) {
    logError("Failed to enqueue application score recalculation", error, { applicationId }, "applications");

    return {
      error: "Nao foi possivel enfileirar o recalculo agora."
    };
  }
}

export async function moveApplicationStage(
  applicationId: string,
  _previousState: StageTransitionState,
  formData: FormData
): Promise<StageTransitionState> {
  const user = await requirePermission("manage_applications");
  const stageId = String(formData.get("stageId") ?? "");

  if (!stageId) {
    return {
      error: "Selecione uma etapa valida."
    };
  }

  const [application, stage] = await Promise.all([
    prisma.application.findFirst({
      where: {
        id: applicationId,
        organizationId: user.organizationId
      }
    }),
    prisma.pipelineStage.findFirst({
      where: {
        id: stageId,
        organizationId: user.organizationId
      }
    })
  ]);

  if (!application || !stage) {
    return {
      error: "Nao foi possivel mover esta aplicacao."
    };
  }

  if (application.currentStageId === stage.id) {
    return {
      success: "A aplicacao ja estava nessa etapa."
    };
  }

  await prisma.application.update({
    where: { id: application.id },
    data: {
      currentStageId: stage.id,
      history: {
        create: {
          fromStageId: application.currentStageId,
          toStageId: stage.id,
          movedById: user.id,
          notes: "Movimentacao atualizada pelo workspace."
        }
      }
    }
  });

  await createAuditEvent({
    organizationId: user.organizationId,
    actorId: user.id,
    action: "application.stage_moved",
    entityType: "application",
    entityId: application.id,
    summary: `Aplicacao movida para a etapa ${stage.name}.`,
    metadata: {
      applicationId: application.id,
      fromStageId: application.currentStageId,
      toStageId: stage.id
    }
  });

  revalidatePath("/dashboard");
  revalidatePath("/pipeline");
  revalidatePath(`/jobs/${application.jobId}`);
  revalidatePath(`/candidates/${application.candidateId}`);
  revalidatePath(`/applications/${application.id}`);

  return {
    success: "Etapa atualizada."
  };
}

export async function sendApplicationEmail(
  applicationId: string,
  _previousState: SendTemplateEmailState,
  formData: FormData
): Promise<SendTemplateEmailState> {
  const user = await requirePermission("manage_communications");
  const templateType = String(formData.get("templateType") ?? "") as EmailTemplateType;

  if (!Object.values(EmailTemplateType).includes(templateType)) {
    return {
      error: "Template invalido."
    };
  }

  if (!isEmailConfigured()) {
    return {
      error: "Configure SMTP_HOST, SMTP_USER, SMTP_PASSWORD e EMAIL_FROM para enviar emails."
    };
  }

  const application = await prisma.application.findFirst({
    where: {
      id: applicationId,
      organizationId: user.organizationId
    },
    include: {
      candidate: true,
      job: true,
      currentStage: true,
      organization: true
    }
  });

  if (!application) {
    return {
      error: "Aplicacao nao encontrada."
    };
  }

  if (!application.candidate.email) {
    return {
      error: "Esse candidato nao possui email cadastrado."
    };
  }

  const template = await prisma.emailTemplate.findUnique({
    where: {
      organizationId_type: {
        organizationId: user.organizationId,
        type: templateType
      }
    }
  });

  if (!template) {
    return {
      error: "Template nao encontrado para esta organizacao."
    };
  }

  try {
    await enqueueBackgroundJob({
      organizationId: user.organizationId,
      type: "EMAIL_DELIVERY",
      payload: {
        templateId: template.id,
        to: application.candidate.email,
        variables: {
          candidate_name: application.candidate.fullName,
          job_title: application.job.title,
          company_name: application.organization.name,
          stage_name: application.currentStage?.name ?? ""
        },
        applicationId: application.id
      }
    });

    await createAuditEvent({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "application.email_queued",
      entityType: "application",
      entityId: application.id,
      summary: `Email ${templateType} enfileirado para ${application.candidate.email}.`,
      metadata: {
        applicationId: application.id,
        templateType,
        candidateEmail: application.candidate.email
      }
    });

    return {
      success: `${getTemplateLabel(templateType)} enviado para a fila de envio.`
    };
  } catch (error) {
    logError("Failed to enqueue templated email", error, { applicationId, templateType }, "applications");

    return {
      error: "Nao foi possivel enviar o email agora."
    };
  }
}

export async function createApplicationNote(
  applicationId: string,
  _previousState: NoteFormState,
  formData: FormData
): Promise<NoteFormState> {
  const user = await requirePermission("create_hiring_notes");
  const parsed = hiringNoteSchema.safeParse({
    content: formData.get("content")
  });

  if (!parsed.success) {
    return {
      error: parsed.error.errors[0]?.message ?? "Nao foi possivel validar a nota."
    };
  }

  const application = await prisma.application.findFirst({
    where: {
      id: applicationId,
      organizationId: user.organizationId
    }
  });

  if (!application) {
    return {
      error: "Aplicacao nao encontrada."
    };
  }

  await prisma.hiringNote.create({
    data: {
      organizationId: user.organizationId,
      authorId: user.id,
      applicationId,
      candidateId: application.candidateId,
      content: parsed.data.content
    }
  });

  revalidatePath(`/applications/${applicationId}`);
  revalidatePath(`/candidates/${application.candidateId}`);

  return {
    success: "Nota adicionada a aplicacao."
  };
}
