"use server";

import { AutomationTrigger, InterviewRecommendation, InterviewStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

import type { InterviewFeedbackState } from "@/components/interviews/interview-feedback-form";
import type { InterviewFormState } from "@/components/interviews/interview-form";
import type { InterviewRescheduleState } from "@/components/interviews/interview-reschedule-form";
import { createAuditEvent } from "@/lib/audit/events";
import { applyJobAutomationRule } from "@/lib/automation/job-rules";
import { requirePermission } from "@/lib/auth/permissions";
import { removeInterviewFromGoogleCalendar, syncInterviewToGoogleCalendar } from "@/lib/calendar/google-sync";
import { buildInterviewIcs } from "@/lib/calendar/ics";
import { env } from "@/lib/env";
import { getEmailTransporter, isEmailConfigured } from "@/lib/email/transporter";
import { logError } from "@/lib/observability/logger";
import { prisma } from "@/lib/prisma/client";
import { interviewFeedbackSchema } from "@/lib/validations/interview-feedback";
import { interviewFormSchema } from "@/lib/validations/interview";

function buildCalendarSyncPayload(input: {
  title: string;
  startsAt: Date;
  endsAt: Date;
  location?: string | null;
  meetingUrl?: string | null;
  notes?: string | null;
  candidateName: string;
  candidateEmail?: string | null;
  jobTitle: string;
}) {
  return {
    summary: `${input.title} - ${input.jobTitle}`,
    description: [
      `Candidato: ${input.candidateName}`,
      input.notes ? `Notas: ${input.notes}` : null,
      input.meetingUrl ? `Link: ${input.meetingUrl}` : null
    ]
      .filter((value): value is string => Boolean(value))
      .join("\n"),
    location: input.location || input.meetingUrl || undefined,
    start: input.startsAt,
    end: input.endsAt,
    attendees: input.candidateEmail
      ? [
          {
            email: input.candidateEmail,
            displayName: input.candidateName
          }
        ]
      : undefined
  };
}

export async function createInterview(
  applicationId: string,
  _previousState: InterviewFormState,
  formData: FormData
): Promise<InterviewFormState> {
  const user = await requirePermission("manage_interviews");

  const parsed = interviewFormSchema.safeParse({
    title: formData.get("title"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    location: formData.get("location"),
    meetingUrl: formData.get("meetingUrl"),
    notes: formData.get("notes"),
    status: formData.get("status")
  });

  if (!parsed.success) {
    return {
      error: parsed.error.errors[0]?.message ?? "Nao foi possivel validar a entrevista."
    };
  }

  const application = await prisma.application.findFirst({
    where: {
      id: applicationId,
      organizationId: user.organizationId
    },
    include: {
      candidate: true,
      job: true
    }
  });

  if (!application) {
    return {
      error: "Aplicacao nao encontrada."
    };
  }

  const externalSync = await syncInterviewToGoogleCalendar(
    buildCalendarSyncPayload({
      title: parsed.data.title,
      startsAt: new Date(parsed.data.startsAt),
      endsAt: new Date(parsed.data.endsAt),
      location: parsed.data.location || null,
      meetingUrl: parsed.data.meetingUrl || null,
      notes: parsed.data.notes || null,
      candidateName: application.candidate.fullName,
      candidateEmail: application.candidate.email,
      jobTitle: application.job.title
    })
  );

  const interview = await prisma.interview.create({
    data: {
      organizationId: user.organizationId,
      applicationId,
      scheduledById: user.id,
      title: parsed.data.title,
      startsAt: new Date(parsed.data.startsAt),
      endsAt: new Date(parsed.data.endsAt),
      location: parsed.data.location || null,
      meetingUrl: parsed.data.meetingUrl || null,
      notes: parsed.data.notes || null,
      status: parsed.data.status,
      externalCalendarProvider: externalSync?.provider,
      externalCalendarEventId: externalSync?.eventId
    }
  });

  await createAuditEvent({
    organizationId: user.organizationId,
    actorId: user.id,
    action: "interview.created",
    entityType: "interview",
    entityId: interview.id,
    summary: `Entrevista "${parsed.data.title}" agendada para a aplicacao.`,
    metadata: {
      interviewId: interview.id,
      applicationId,
      startsAt: parsed.data.startsAt,
      endsAt: parsed.data.endsAt
    }
  });

  revalidatePath(`/applications/${applicationId}`);
  revalidatePath("/interviews");

  await applyJobAutomationRule({
    applicationId,
    organizationId: user.organizationId,
    actorId: user.id,
    trigger: AutomationTrigger.INTERVIEW_CREATED,
    note: "Aplicacao movida automaticamente apos agendamento de entrevista."
  });

  return {
    success: "Entrevista agendada."
  };
}

export async function updateInterviewStatus(interviewId: string, status: InterviewStatus) {
  const user = await requirePermission("manage_interviews");

  const interview = await prisma.interview.findFirst({
    where: {
      id: interviewId,
      organizationId: user.organizationId
    }
  });

  if (!interview) {
    return;
  }

  if (status === InterviewStatus.CANCELLED && interview.externalCalendarProvider === "google_calendar") {
    await removeInterviewFromGoogleCalendar(interview.externalCalendarEventId);
  }

  await prisma.interview.update({
    where: {
      id: interview.id
    },
    data: {
      status,
      ...(status === InterviewStatus.CANCELLED
        ? {
            externalCalendarEventId: null,
            externalCalendarProvider: null
          }
        : {})
    }
  });

  await createAuditEvent({
    organizationId: user.organizationId,
    actorId: user.id,
    action: "interview.status_updated",
    entityType: "interview",
    entityId: interview.id,
    summary: `Status da entrevista alterado para ${status}.`,
    metadata: {
      interviewId: interview.id,
      applicationId: interview.applicationId,
      status
    }
  });

  revalidatePath(`/interviews/${interview.id}`);
  revalidatePath("/interviews");
  revalidatePath(`/applications/${interview.applicationId}`);

  if (status === InterviewStatus.COMPLETED) {
    await applyJobAutomationRule({
      applicationId: interview.applicationId,
      organizationId: user.organizationId,
      actorId: user.id,
      trigger: AutomationTrigger.INTERVIEW_COMPLETED,
      note: "Aplicacao movida automaticamente apos conclusao da entrevista."
    });
  }
}

export async function saveInterviewFeedback(
  interviewId: string,
  _previousState: InterviewFeedbackState,
  formData: FormData
): Promise<InterviewFeedbackState> {
  const user = await requirePermission("submit_interview_feedback");

  const parsed = interviewFeedbackSchema.safeParse({
    overallScore: formData.get("overallScore"),
    communicationScore: formData.get("communicationScore"),
    roleFitScore: formData.get("roleFitScore"),
    technicalScore: formData.get("technicalScore"),
    recommendation: formData.get("recommendation"),
    strengths: formData.get("strengths"),
    concerns: formData.get("concerns"),
    notes: formData.get("notes")
  });

  if (!parsed.success) {
    return {
      error: parsed.error.errors[0]?.message ?? "Nao foi possivel validar o feedback."
    };
  }

  const interview = await prisma.interview.findFirst({
    where: {
      id: interviewId,
      organizationId: user.organizationId
    }
  });

  if (!interview) {
    return {
      error: "Entrevista nao encontrada."
    };
  }

  await prisma.interviewFeedback.upsert({
    where: {
      interviewId_authorId: {
        interviewId,
        authorId: user.id
      }
    },
    update: {
      overallScore: parsed.data.overallScore,
      communicationScore: parsed.data.communicationScore,
      roleFitScore: parsed.data.roleFitScore,
      technicalScore: parsed.data.technicalScore,
      recommendation: parsed.data.recommendation,
      strengths: parsed.data.strengths,
      concerns: parsed.data.concerns || null,
      notes: parsed.data.notes || null,
      scorecardRatings: parsed.data.scorecardRatings
    },
    create: {
      organizationId: user.organizationId,
      interviewId,
      authorId: user.id,
      overallScore: parsed.data.overallScore,
      communicationScore: parsed.data.communicationScore,
      roleFitScore: parsed.data.roleFitScore,
      technicalScore: parsed.data.technicalScore,
      recommendation: parsed.data.recommendation,
      strengths: parsed.data.strengths,
      concerns: parsed.data.concerns || null,
      notes: parsed.data.notes || null,
      scorecardRatings: parsed.data.scorecardRatings
    }
  });

  await createAuditEvent({
    organizationId: user.organizationId,
    actorId: user.id,
    action: "interview.feedback_saved",
    entityType: "interview_feedback",
    entityId: interviewId,
    summary: "Feedback estruturado salvo para entrevista.",
    metadata: {
      interviewId,
      recommendation: parsed.data.recommendation,
      overallScore: parsed.data.overallScore
    }
  });

  revalidatePath(`/interviews/${interviewId}`);
  revalidatePath(`/applications/${interview.applicationId}`);

  if (
    parsed.data.recommendation === InterviewRecommendation.YES ||
    parsed.data.recommendation === InterviewRecommendation.STRONG_YES
  ) {
    await applyJobAutomationRule({
      applicationId: interview.applicationId,
      organizationId: user.organizationId,
      actorId: user.id,
      trigger: AutomationTrigger.FEEDBACK_RECOMMENDED,
      note: "Aplicacao movida automaticamente apos feedback positivo."
    });
  }

  if (
    parsed.data.recommendation === InterviewRecommendation.NO ||
    parsed.data.recommendation === InterviewRecommendation.STRONG_NO
  ) {
    await applyJobAutomationRule({
      applicationId: interview.applicationId,
      organizationId: user.organizationId,
      actorId: user.id,
      trigger: AutomationTrigger.FEEDBACK_REJECTED,
      note: "Aplicacao movida automaticamente apos feedback negativo."
    });
  }

  return {
    success: "Feedback salvo."
  };
}

export async function sendInterviewInvite(interviewId: string) {
  const user = await requirePermission("manage_interviews");

  if (!isEmailConfigured()) {
    throw new Error("SMTP nao configurado.");
  }

  const interview = await prisma.interview.findFirst({
    where: {
      id: interviewId,
      organizationId: user.organizationId
    },
    include: {
      application: {
        include: {
          candidate: true,
          job: true
        }
      },
      scheduledBy: true
    }
  });

  if (!interview?.application.candidate.email) {
    throw new Error("Candidato sem email para envio.");
  }

  const calendarFile = buildInterviewIcs({
    uid: interview.id,
    title: `${interview.title} - ${interview.application.job.title}`,
    startsAt: interview.startsAt,
    endsAt: interview.endsAt,
    description: interview.notes,
    location: interview.location,
    url: interview.meetingUrl,
    organizerName: interview.scheduledBy.name,
    organizerEmail: interview.scheduledBy.email
  });

  await getEmailTransporter().sendMail({
    from: env.EMAIL_FROM,
    to: interview.application.candidate.email,
    subject: `Entrevista agendada para ${interview.application.job.title}`,
    html: `<p>Oi ${interview.application.candidate.fullName},</p><p>Sua entrevista para <strong>${interview.application.job.title}</strong> foi agendada.</p><p><strong>Quando:</strong> ${new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "full",
      timeStyle: "short"
    }).format(interview.startsAt)} ate ${new Intl.DateTimeFormat("pt-BR", { timeStyle: "short" }).format(interview.endsAt)}</p><p><strong>Local:</strong> ${interview.location || interview.meetingUrl || "A confirmar"}</p><p>${interview.notes || ""}</p><p>O arquivo de calendario segue em anexo.</p>`,
    text: `Oi ${interview.application.candidate.fullName},\n\nSua entrevista para ${interview.application.job.title} foi agendada.\nQuando: ${new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "full",
      timeStyle: "short"
    }).format(interview.startsAt)} ate ${new Intl.DateTimeFormat("pt-BR", { timeStyle: "short" }).format(interview.endsAt)}\nLocal: ${interview.location || interview.meetingUrl || "A confirmar"}\n\n${interview.notes || ""}\n\nO arquivo de calendario segue em anexo.`,
    attachments: [
      {
        filename: `interview-${interview.id}.ics`,
        content: calendarFile,
        contentType: "text/calendar; charset=utf-8"
      }
    ]
  });

  await createAuditEvent({
    organizationId: user.organizationId,
    actorId: user.id,
    action: "interview.invite_sent",
    entityType: "interview",
    entityId: interview.id,
    summary: "Convite de entrevista enviado ao candidato.",
    metadata: {
      interviewId: interview.id,
      candidateEmail: interview.application.candidate.email
    }
  });

  revalidatePath(`/interviews/${interviewId}`);
}

export async function rescheduleInterview(
  interviewId: string,
  _previousState: InterviewRescheduleState,
  formData: FormData
): Promise<InterviewRescheduleState> {
  const user = await requirePermission("manage_interviews");

  const parsed = interviewFormSchema.safeParse({
    title: formData.get("title"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    location: formData.get("location"),
    meetingUrl: formData.get("meetingUrl"),
    notes: formData.get("notes"),
    status: formData.get("status")
  });

  if (!parsed.success) {
    return {
      error: parsed.error.errors[0]?.message ?? "Nao foi possivel validar o reagendamento."
    };
  }

  const sendNotification = formData.get("sendNotification") === "true";

  const interview = await prisma.interview.findFirst({
    where: {
      id: interviewId,
      organizationId: user.organizationId
    },
    include: {
      application: {
        include: {
          candidate: true,
          job: true
        }
      },
      scheduledBy: true
    }
  });

  if (!interview) {
    return {
      error: "Entrevista nao encontrada."
    };
  }

  const previousSchedule = {
    startsAt: interview.startsAt.toISOString(),
    endsAt: interview.endsAt.toISOString(),
    location: interview.location,
    meetingUrl: interview.meetingUrl
  };

  const updatedStartsAt = new Date(parsed.data.startsAt);
  const updatedEndsAt = new Date(parsed.data.endsAt);
  const externalSync = await syncInterviewToGoogleCalendar(
    buildCalendarSyncPayload({
      title: parsed.data.title,
      startsAt: updatedStartsAt,
      endsAt: updatedEndsAt,
      location: parsed.data.location || null,
      meetingUrl: parsed.data.meetingUrl || null,
      notes: parsed.data.notes || null,
      candidateName: interview.application.candidate.fullName,
      candidateEmail: interview.application.candidate.email,
      jobTitle: interview.application.job.title
    }),
    interview.externalCalendarProvider === "google_calendar" ? interview.externalCalendarEventId : null
  );

  await prisma.interview.update({
    where: {
      id: interview.id
    },
    data: {
      title: parsed.data.title,
      startsAt: updatedStartsAt,
      endsAt: updatedEndsAt,
      location: parsed.data.location || null,
      meetingUrl: parsed.data.meetingUrl || null,
      notes: parsed.data.notes || null,
      status: InterviewStatus.SCHEDULED,
      externalCalendarProvider: externalSync?.provider ?? interview.externalCalendarProvider,
      externalCalendarEventId: externalSync?.eventId ?? interview.externalCalendarEventId
    }
  });

  if (sendNotification && interview.application.candidate.email && isEmailConfigured()) {
    try {
      const calendarFile = buildInterviewIcs({
        uid: interview.id,
        title: `${parsed.data.title} - ${interview.application.job.title}`,
        startsAt: new Date(parsed.data.startsAt),
        endsAt: new Date(parsed.data.endsAt),
        description: parsed.data.notes || null,
        location: parsed.data.location || null,
        url: parsed.data.meetingUrl || null,
        organizerName: interview.scheduledBy.name,
        organizerEmail: interview.scheduledBy.email
      });

      await getEmailTransporter().sendMail({
        from: env.EMAIL_FROM,
        to: interview.application.candidate.email,
        subject: `Atualizacao da entrevista para ${interview.application.job.title}`,
        html: `<p>Oi ${interview.application.candidate.fullName},</p><p>Atualizamos o agendamento da sua entrevista para a vaga <strong>${interview.application.job.title}</strong>.</p><p><strong>Novo horario:</strong> ${new Intl.DateTimeFormat("pt-BR", {
          dateStyle: "full",
          timeStyle: "short"
        }).format(new Date(parsed.data.startsAt))} ate ${new Intl.DateTimeFormat("pt-BR", { timeStyle: "short" }).format(new Date(parsed.data.endsAt))}</p><p><strong>Local:</strong> ${parsed.data.location || parsed.data.meetingUrl || "A confirmar"}</p><p>Segue tambem o arquivo de calendario atualizado em anexo.</p>`,
        text: `Oi ${interview.application.candidate.fullName},\n\nAtualizamos o agendamento da sua entrevista para ${interview.application.job.title}.\nNovo horario: ${new Intl.DateTimeFormat("pt-BR", {
          dateStyle: "full",
          timeStyle: "short"
        }).format(new Date(parsed.data.startsAt))} ate ${new Intl.DateTimeFormat("pt-BR", { timeStyle: "short" }).format(new Date(parsed.data.endsAt))}\nLocal: ${parsed.data.location || parsed.data.meetingUrl || "A confirmar"}\n\nSegue o arquivo de calendario atualizado em anexo.`,
        attachments: [
          {
            filename: `interview-${interview.id}.ics`,
            content: calendarFile,
            contentType: "text/calendar; charset=utf-8"
          }
        ]
      });
    } catch (error) {
      logError(
        "Failed to send rescheduled interview notification",
        error,
        { interviewId: interview.id },
        "interviews"
      );
    }
  }

  await createAuditEvent({
    organizationId: user.organizationId,
    actorId: user.id,
    action: "interview.rescheduled",
    entityType: "interview",
    entityId: interview.id,
    summary: "Entrevista reagendada.",
    metadata: {
      interviewId: interview.id,
      applicationId: interview.applicationId,
      previousSchedule,
      nextSchedule: {
        startsAt: parsed.data.startsAt,
        endsAt: parsed.data.endsAt,
        location: parsed.data.location || null,
        meetingUrl: parsed.data.meetingUrl || null
      },
      notificationSent: sendNotification && !!interview.application.candidate.email && isEmailConfigured()
    }
  });

  revalidatePath(`/interviews/${interview.id}`);
  revalidatePath("/interviews");
  revalidatePath(`/applications/${interview.applicationId}`);

  return {
    success: sendNotification
      ? "Entrevista reagendada e atualizacao processada."
      : "Entrevista reagendada."
  };
}
