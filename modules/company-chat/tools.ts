import { prisma } from "@/lib/prisma/client";
import { getDashboardMetrics } from "@/lib/dashboard/queries";
import { getAnalyticsSnapshot as getAnalyticsProductSnapshot } from "@/lib/analytics/queries";
import { searchKnowledgeDocuments, searchKnowledgeEvidence } from "@/modules/knowledge/queries";
import { getEmployeeProfile as getEmployeeProfileRecord } from "@/modules/employees/queries";
import { getComplianceSummary as getComplianceSummaryRecord, getPolicyOperationalSnapshot as getPolicyOperationalSnapshotRecord } from "@/modules/compliance/queries";
import { getPeopleDashboard } from "@/modules/people-ops/queries";

export async function searchCandidates(organizationId: string, query: string) {
  return prisma.candidate.findMany({
    where: {
      organizationId,
      OR: [
        { fullName: { contains: query, mode: "insensitive" } },
        { currentTitle: { contains: query, mode: "insensitive" } },
        { currentCompany: { contains: query, mode: "insensitive" } },
        { summary: { contains: query, mode: "insensitive" } }
      ]
    },
    take: 5,
    orderBy: [{ updatedAt: "desc" }]
  });
}

export async function searchJobs(organizationId: string, query: string) {
  return prisma.job.findMany({
    where: {
      organizationId,
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { department: { contains: query, mode: "insensitive" } },
        { summary: { contains: query, mode: "insensitive" } }
      ]
    },
    take: 5,
    include: {
      _count: {
        select: {
          applications: true
        }
      }
    },
    orderBy: [{ updatedAt: "desc" }]
  });
}

export async function searchApplications(organizationId: string, query: string) {
  return prisma.application.findMany({
    where: {
      organizationId,
      OR: [
        { candidate: { fullName: { contains: query, mode: "insensitive" } } },
        { job: { title: { contains: query, mode: "insensitive" } } },
        { executiveSummary: { contains: query, mode: "insensitive" } }
      ]
    },
    take: 6,
    include: {
      candidate: true,
      job: true,
      currentStage: true
    },
    orderBy: [{ score: "desc" }, { updatedAt: "desc" }]
  });
}

export async function searchEmployees(organizationId: string, query: string) {
  return prisma.employee.findMany({
    where: {
      organizationId,
      OR: [
        { fullName: { contains: query, mode: "insensitive" } },
        { title: { contains: query, mode: "insensitive" } },
        { department: { contains: query, mode: "insensitive" } },
        { workEmail: { contains: query, mode: "insensitive" } }
      ]
    },
    take: 5,
    orderBy: [{ updatedAt: "desc" }]
  });
}

export async function searchHrRequests(organizationId: string, query: string) {
  return prisma.hrRequest.findMany({
    where: {
      organizationId,
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
        { requesterEmployee: { fullName: { contains: query, mode: "insensitive" } } }
      ]
    },
    take: 5,
    include: {
      requesterEmployee: true,
      requesterUser: true,
      assigneeUser: true
    },
    orderBy: [{ updatedAt: "desc" }]
  });
}

export async function searchPeopleTasks(organizationId: string, query: string) {
  return prisma.peopleTask.findMany({
    where: {
      organizationId,
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
        { relatedEmployee: { fullName: { contains: query, mode: "insensitive" } } }
      ]
    },
    take: 5,
    include: {
      assigneeUser: true,
      relatedEmployee: true
    },
    orderBy: [{ updatedAt: "desc" }]
  });
}

export async function getCandidateProfile(organizationId: string, candidateId: string) {
  return prisma.candidate.findFirst({
    where: {
      id: candidateId,
      organizationId
    },
    include: {
      applications: {
        include: {
          job: true,
          currentStage: true
        },
        orderBy: [{ updatedAt: "desc" }]
      }
    }
  });
}

export async function getEmployeeProfile(organizationId: string, employeeId: string) {
  return getEmployeeProfileRecord(organizationId, employeeId);
}

export async function getApplicationSummary(organizationId: string, applicationId: string) {
  return prisma.application.findFirst({
    where: {
      id: applicationId,
      organizationId
    },
    include: {
      candidate: true,
      job: true,
      currentStage: true,
      notes: {
        orderBy: [{ createdAt: "desc" }],
        take: 3,
        include: {
          author: true
        }
      },
      interviews: {
        orderBy: [{ startsAt: "desc" }],
        take: 3,
        include: {
          feedbacks: true
        }
      }
    }
  });
}

export async function getCandidateScoreBreakdown(organizationId: string, candidateId: string) {
  const application = await prisma.application.findFirst({
    where: {
      organizationId,
      candidateId
    },
    include: {
      candidate: true,
      job: true
    },
    orderBy: [{ score: "desc" }, { updatedAt: "desc" }]
  });

  if (!application) {
    return null;
  }

  return {
    candidateName: application.candidate.fullName,
    jobTitle: application.job.title,
    score: application.score,
    justification: application.scoreJustification,
    strengths: Array.isArray(application.strengths) ? application.strengths : [],
    gaps: Array.isArray(application.gaps) ? application.gaps : []
  };
}

export async function getJobSummary(organizationId: string, query: string) {
  return prisma.job.findFirst({
    where: {
      organizationId,
      OR: [{ id: query }, { title: { contains: query, mode: "insensitive" } }]
    },
    include: {
      criteria: {
        orderBy: [{ order: "asc" }]
      },
      _count: {
        select: {
          applications: true
        }
      }
    }
  });
}

export async function getPipelineHealth(organizationId: string) {
  const [applications, stages] = await Promise.all([
    prisma.application.findMany({
      where: {
        organizationId
      },
      include: {
        currentStage: true,
        history: {
          orderBy: [{ createdAt: "desc" }],
          take: 1
        }
      }
    }),
    prisma.pipelineStage.findMany({
      where: {
        organizationId
      },
      include: {
        _count: {
          select: {
            currentFor: true
          }
        }
      },
      orderBy: [{ position: "asc" }]
    })
  ]);

  const stalledApplications = applications.filter((application) => {
    const lastEventAt = application.history[0]?.createdAt ?? application.appliedAt;
    return Date.now() - lastEventAt.getTime() > 1000 * 60 * 60 * 72;
  });

  return {
    stageCount: stages.length,
    applications: applications.length,
    stalledApplications: stalledApplications.length,
    stages: stages.map((stage) => ({
      id: stage.id,
      name: stage.name,
      count: stage._count.currentFor
    }))
  };
}

export async function getAnalyticsSnapshot(organizationId: string) {
  const [dashboard, analytics] = await Promise.all([getDashboardMetrics(organizationId), getAnalyticsProductSnapshot(organizationId)]);

  return {
    dashboard,
    analytics
  };
}

export async function getPeopleDashboardSummary(organizationId: string) {
  return getPeopleDashboard(organizationId);
}

export async function getComplianceSummary(organizationId: string) {
  return getComplianceSummaryRecord(organizationId);
}

export async function getPolicyOperationalSnapshot(input: {
  organizationId: string;
  documentIds?: string[];
  employeeIds?: string[];
}) {
  return getPolicyOperationalSnapshotRecord(input);
}

export async function searchKnowledge(organizationId: string, query: string) {
  return searchKnowledgeDocuments(organizationId, query, 5);
}

function inferPolicyDraftConfidence(citations: Awaited<ReturnType<typeof searchKnowledgeEvidence>>) {
  const strongestScore = citations[0]?.score ?? 0;

  if (strongestScore >= 24) {
    return "HIGH" as const;
  }

  if (strongestScore >= 14) {
    return "MEDIUM" as const;
  }

  return "LOW" as const;
}

function buildPolicyDraftSummary(citations: Awaited<ReturnType<typeof searchKnowledgeEvidence>>) {
  const documentTitles = Array.from(new Set(citations.map((citation) => citation.title))).slice(0, 3);

  if (!documentTitles.length) {
    return "Sem fonte interna pronta para resposta citada.";
  }

  return `Resposta ancorada em ${documentTitles.length} documento(s): ${documentTitles.join(", ")}.`;
}

export async function draftPolicyResponse(organizationId: string, query: string) {
  const citations = await searchKnowledgeEvidence(organizationId, query, 4);

  if (!citations.length) {
    return null;
  }

  const confidence = inferPolicyDraftConfidence(citations);
  const lead = citations[0];
  const supportingTitles = Array.from(new Set(citations.slice(1).map((citation) => citation.title))).slice(0, 2);
  const supportLine = supportingTitles.length ? ` Fontes complementares: ${supportingTitles.join(", ")}.` : "";

  return {
    response: `Pelo que esta registrado internamente, o ponto mais relevante aparece em "${lead.title}": ${lead.excerpt}${supportLine}`,
    confidence,
    summary: buildPolicyDraftSummary(citations),
    citations
  };
}

export async function draftEmail(organizationId: string, query: string) {
  const application = await prisma.application.findFirst({
    where: {
      organizationId,
      OR: [
        { candidate: { fullName: { contains: query, mode: "insensitive" } } },
        { job: { title: { contains: query, mode: "insensitive" } } }
      ]
    },
    include: {
      candidate: true,
      job: true,
      currentStage: true
    },
    orderBy: [{ updatedAt: "desc" }]
  });

  if (!application) {
    return null;
  }

  return normalizeDraftEmail({
    to: application.candidate.email,
    subject: `Próximos passos no processo para ${application.job.title}`,
    body: `Oi ${application.candidate.fullName},\n\nSeu perfil segue bem posicionado para a vaga ${application.job.title}. Queremos avancar você para a próxima etapa${application.currentStage?.name ? ` a partir de ${application.currentStage.name}` : ""}.\n\nPode me confirmar sua disponibilidade?\n\nTime Harpia`
  });
}

function normalizeDraftEmail<T extends { subject: string; body: string }>(draft: T): T {
  return {
    ...draft,
    body: normalizePortugueseDraft(draft.body),
    subject: normalizePortugueseDraft(draft.subject)
  };
}

function normalizePortugueseDraft(value: string) {
  return value
    .replaceAll("Pr\u00C3\u00B3ximos", "Pr\u00f3ximos")
    .replaceAll("voc\u00C3\u00AA", "voc\u00ea")
    .replaceAll("pr\u00C3\u00B3xima", "pr\u00f3xima")
    .replaceAll("avancar", "avan\u00e7ar");
}
