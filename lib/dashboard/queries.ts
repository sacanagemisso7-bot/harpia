import { prisma } from "@/lib/prisma/client";

export async function getDashboardMetrics(organizationId: string) {
  const [jobCount, candidateCount, applicationAggregate, stages, recentJobs, applications, completedInterviews] = await Promise.all([
    prisma.job.count({
      where: { organizationId }
    }),
    prisma.candidate.count({
      where: { organizationId }
    }),
    prisma.application.aggregate({
      where: { organizationId },
      _avg: { score: true },
      _count: { _all: true }
    }),
    prisma.pipelineStage.findMany({
      where: { organizationId },
      orderBy: { position: "asc" },
      include: {
        _count: {
          select: {
            currentFor: true
          }
        }
      }
    }),
    prisma.job.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 4,
      include: {
        _count: {
          select: {
            applications: true
          }
        }
      }
    }),
    prisma.application.findMany({
      where: { organizationId },
      include: {
        candidate: true,
        job: true,
        currentStage: true,
        history: {
          orderBy: { createdAt: "desc" },
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
        feedbacks: {
          select: {
            id: true
          }
        }
      }
    })
  ]);

  const stalledAlerts = applications
    .map((application) => {
      const lastMovement = application.history[0]?.createdAt ?? application.appliedAt;
      const hoursOpen = Math.round((Date.now() - lastMovement.getTime()) / (1000 * 60 * 60));

      return {
        type: "stalled_application" as const,
        severity: hoursOpen >= 24 * 7 ? "high" : "medium",
        title: `${application.candidate.fullName} parada em ${application.currentStage?.name || "Sem etapa"}`,
        description: `${hoursOpen}h sem movimentacao na vaga ${application.job.title}.`,
        href: `/applications/${application.id}`,
        isTerminal: application.currentStage?.isTerminal ?? false
      };
    })
    .filter((alert) => !alert.isTerminal && alert.severity === "high")
    .slice(0, 4);

  const intelligenceHighlights = applications
    .filter((application) => {
      const lastMovement = application.history[0]?.createdAt ?? application.appliedAt;
      const stalledHours = (Date.now() - lastMovement.getTime()) / (1000 * 60 * 60);
      return (application.score ?? 0) >= 80 && stalledHours >= 48 && !application.currentStage?.isTerminal;
    })
    .sort((left, right) => (right.score ?? 0) - (left.score ?? 0))
    .slice(0, 4)
    .map((application) => ({
      id: application.id,
      candidateName: application.candidate.fullName,
      jobTitle: application.job.title,
      score: application.score ?? 0,
      stageName: application.currentStage?.name ?? "Sem etapa",
      href: `/applications/${application.id}`
    }));

  const missingFeedbackAlerts = completedInterviews
    .filter((interview) => interview.feedbacks.length === 0)
    .map((interview) => {
      const hoursSinceCompletion = Math.round((Date.now() - interview.endsAt.getTime()) / (1000 * 60 * 60));

      return {
        type: "missing_feedback" as const,
        severity: hoursSinceCompletion >= 24 ? "high" : "medium",
        title: `Feedback pendente para ${interview.application.candidate.fullName}`,
        description: `${hoursSinceCompletion}h desde o fim da entrevista de ${interview.application.job.title}.`,
        href: `/interviews/${interview.id}`
      };
    })
    .slice(0, 4);

  const slaAlerts = [...stalledAlerts, ...missingFeedbackAlerts].slice(0, 6);

  return {
    jobCount,
    candidateCount,
    averageScore: applicationAggregate._avg.score ?? 0,
    applicationCount: applicationAggregate._count._all,
    stages,
    recentJobs,
    slaAlerts,
    intelligenceHighlights
  };
}
