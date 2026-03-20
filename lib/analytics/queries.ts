import { getRoleLabel } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma/client";

export async function getAnalyticsSnapshot(organizationId: string) {
  const productivityWindowStart = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30);

  const [applications, jobs, candidates, stages, auditEvents] = await Promise.all([
    prisma.application.findMany({
      where: { organizationId },
      include: {
        candidate: {
          select: {
            source: true
          }
        },
        job: {
          select: {
            title: true
          }
        },
        currentStage: {
          select: {
            name: true,
            isTerminal: true
          }
        },
        history: {
          orderBy: {
            createdAt: "asc"
          },
          select: {
            createdAt: true,
            fromStageId: true,
            toStage: {
              select: {
                position: true,
                name: true
              }
            }
          }
        }
      }
    }),
    prisma.job.findMany({
      where: { organizationId },
      include: {
        _count: {
          select: {
            applications: true
          }
        }
      }
    }),
    prisma.candidate.findMany({
      where: { organizationId },
      select: {
        source: true
      }
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
    prisma.auditEvent.findMany({
      where: {
        organizationId,
        createdAt: {
          gte: productivityWindowStart
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      }
    })
  ]);

  const sourceMap = new Map<string, { candidates: number; applications: number; totalScore: number; scored: number }>();

  for (const candidate of candidates) {
    sourceMap.set(candidate.source, {
      candidates: (sourceMap.get(candidate.source)?.candidates ?? 0) + 1,
      applications: sourceMap.get(candidate.source)?.applications ?? 0,
      totalScore: sourceMap.get(candidate.source)?.totalScore ?? 0,
      scored: sourceMap.get(candidate.source)?.scored ?? 0
    });
  }

  for (const application of applications) {
    const source = application.candidate.source;
    const entry = sourceMap.get(source) ?? { candidates: 0, applications: 0, totalScore: 0, scored: 0 };
    entry.applications += 1;
    if (typeof application.score === "number") {
      entry.totalScore += application.score;
      entry.scored += 1;
    }
    sourceMap.set(source, entry);
  }

  const sources = Array.from(sourceMap.entries()).map(([source, data]) => ({
    source,
    candidates: data.candidates,
    applications: data.applications,
    averageScore: data.scored ? Math.round(data.totalScore / data.scored) : 0
  }));

  const scoreBands = {
    excellent: applications.filter((application) => (application.score ?? 0) >= 85).length,
    strong: applications.filter((application) => (application.score ?? 0) >= 70 && (application.score ?? 0) < 85).length,
    moderate: applications.filter((application) => (application.score ?? 0) >= 50 && (application.score ?? 0) < 70).length,
    low: applications.filter((application) => (application.score ?? 0) < 50).length
  };

  const topJobs = jobs
    .map((job) => {
      const jobApplications = applications.filter((application) => application.job.title === job.title);
      const scores = jobApplications.map((application) => application.score).filter((score): score is number => typeof score === "number");
      return {
        id: job.id,
        title: job.title,
        applications: job._count.applications,
        averageScore: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0
      };
    })
    .sort((left, right) => right.applications - left.applications || right.averageScore - left.averageScore)
    .slice(0, 6);

  const applicationsWithReview = applications
    .map((application) => {
      const firstReviewEvent =
        application.history.find((entry) => !!entry.fromStageId) ??
        application.history.find((entry) => entry.toStage.position > 1);

      if (!firstReviewEvent) {
        return null;
      }

      return (firstReviewEvent.createdAt.getTime() - application.appliedAt.getTime()) / (1000 * 60 * 60);
    })
    .filter((value): value is number => typeof value === "number" && value >= 0);

  const stageTransitionDurations = applications.flatMap((application) => {
    const durations: number[] = [];

    for (let index = 1; index < application.history.length; index += 1) {
      const previous = application.history[index - 1];
      const current = application.history[index];
      durations.push((current.createdAt.getTime() - previous.createdAt.getTime()) / (1000 * 60 * 60));
    }

    return durations;
  });

  const stalledApplications = applications.filter((application) => {
    const lastMovement = application.history[application.history.length - 1]?.createdAt ?? application.appliedAt;
    const hoursSinceLastMovement = (Date.now() - lastMovement.getTime()) / (1000 * 60 * 60);
    return !application.currentStage?.isTerminal && hoursSinceLastMovement >= 24 * 7;
  }).length;

  const interviews = await prisma.interview.findMany({
    where: {
      organizationId
    },
    select: {
      createdAt: true,
      startsAt: true,
      status: true
    }
  });

  const interviewLeadTimes = interviews.map(
    (interview) => (interview.startsAt.getTime() - interview.createdAt.getTime()) / (1000 * 60 * 60)
  );

  const average = (values: number[]) =>
    values.length ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10 : 0;

  const productivityMap = new Map<
    string,
    {
      userId: string | null;
      name: string;
      roleLabel: string;
      applicationsCreated: number;
      stageMoves: number;
      interviewsScheduled: number;
      feedbackSubmitted: number;
      totalActivity: number;
    }
  >();

  for (const event of auditEvents) {
    if (!event.actor) {
      continue;
    }

    const key = event.actor.id;
    const entry = productivityMap.get(key) ?? {
      userId: event.actor.id,
      name: event.actor.name,
      roleLabel: getRoleLabel(event.actor.role),
      applicationsCreated: 0,
      stageMoves: 0,
      interviewsScheduled: 0,
      feedbackSubmitted: 0,
      totalActivity: 0
    };

    if (event.action === "application.created") {
      entry.applicationsCreated += 1;
    }

    if (event.action === "application.stage_moved") {
      entry.stageMoves += 1;
    }

    if (event.action === "interview.created") {
      entry.interviewsScheduled += 1;
    }

    if (event.action === "interview.feedback_saved") {
      entry.feedbackSubmitted += 1;
    }

    entry.totalActivity += 1;
    productivityMap.set(key, entry);
  }

  const productivity = Array.from(productivityMap.values())
    .sort(
      (left, right) =>
        right.totalActivity - left.totalActivity ||
        right.stageMoves - left.stageMoves ||
        right.interviewsScheduled - left.interviewsScheduled
    )
    .slice(0, 8);

  return {
    sources,
    scoreBands,
    topJobs,
    stages,
    productivity,
    sla: {
      averageTimeToFirstReviewHours: average(applicationsWithReview),
      averageStageTransitionHours: average(stageTransitionDurations),
      stalledApplications,
      averageInterviewLeadTimeHours: average(interviewLeadTimes),
      scheduledInterviewCount: interviews.filter((interview) => interview.status === "SCHEDULED").length
    }
  };
}
