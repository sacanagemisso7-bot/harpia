import { prisma } from "@/lib/prisma/client";

export async function getRecruitingOpsInbox(organizationId: string) {
  const [applications, interviews, jobs, backgroundJobs, knowledgeDocuments] = await Promise.all([
    prisma.application.findMany({
      where: {
        organizationId
      },
      include: {
        candidate: true,
        job: true,
        currentStage: true,
        history: {
          orderBy: [{ createdAt: "desc" }],
          take: 1
        }
      }
    }),
    prisma.interview.findMany({
      where: {
        organizationId,
        status: "COMPLETED"
      },
      include: {
        application: {
          include: {
            candidate: true,
            job: true
          }
        },
        feedbacks: true
      }
    }),
    prisma.job.findMany({
      where: {
        organizationId
      },
      include: {
        applications: {
          select: {
            updatedAt: true
          },
          orderBy: [{ updatedAt: "desc" }],
          take: 1
        }
      }
    }),
    prisma.backgroundJob.findMany({
      where: {
        organizationId,
        status: {
          in: ["FAILED", "QUEUED"]
        }
      },
      orderBy: [{ createdAt: "desc" }],
      take: 10
    }),
    prisma.knowledgeDocument.findMany({
      where: {
        organizationId,
        status: {
          in: ["PROCESSING", "FAILED"]
        }
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 10
    })
  ]);

  const stalledApplications = applications
    .filter((application) => {
      const lastMovementAt = application.history[0]?.createdAt ?? application.appliedAt;
      return !application.currentStage?.isTerminal && Date.now() - lastMovementAt.getTime() > 1000 * 60 * 60 * 72;
    })
    .map((application) => ({
      type: "stalled_application",
      title: `${application.candidate.fullName} parado em ${application.currentStage?.name ?? "sem etapa"}`,
      description: `${application.job.title} sem movimentacao recente.`,
      href: `/applications/${application.id}`,
      severity: "high" as const
    }));

  const pendingFeedback = interviews
    .filter((interview) => interview.feedbacks.length === 0)
    .map((interview) => ({
      type: "pending_feedback",
      title: `Feedback pendente para ${interview.application.candidate.fullName}`,
      description: `Entrevista concluida para ${interview.application.job.title}.`,
      href: `/interviews/${interview.id}`,
      severity: "medium" as const
    }));

  const quietJobs = jobs
    .filter((job) => {
      const lastActivity = job.applications[0]?.updatedAt ?? job.updatedAt;
      return Date.now() - lastActivity.getTime() > 1000 * 60 * 60 * 24 * 7;
    })
    .map((job) => ({
      type: "quiet_job",
      title: `Vaga sem atividade recente: ${job.title}`,
      description: `${job.department} sem movimentacao relevante nos ultimos dias.`,
      href: `/jobs/${job.id}`,
      severity: "medium" as const
    }));

  const failedKnowledge = knowledgeDocuments.map((document) => ({
    type: "knowledge",
    title: `${document.title} - ${document.status}`,
    description: document.lastError || "Documento aguardando ingestao.",
    href: "/knowledge",
    severity: document.status === "FAILED" ? ("high" as const) : ("medium" as const)
  }));

  const queueAlerts = backgroundJobs.map((job) => ({
    type: "background_job",
    title: `Job ${job.type} em ${job.status}`,
    description: job.lastError || "Processamento pendente na fila.",
    href: "/knowledge",
    severity: job.status === "FAILED" ? ("high" as const) : ("medium" as const)
  }));

  return {
    items: [...stalledApplications, ...pendingFeedback, ...quietJobs, ...failedKnowledge, ...queueAlerts].slice(0, 20),
    metrics: {
      stalledApplications: stalledApplications.length,
      pendingFeedback: pendingFeedback.length,
      quietJobs: quietJobs.length,
      queueAlerts: queueAlerts.length + failedKnowledge.length
    }
  };
}
