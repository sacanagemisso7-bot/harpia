import { BackgroundJobStatus, type BackgroundJob } from "@prisma/client";

import { evaluateApplication } from "@/lib/applications/scoring";
import { prisma } from "@/lib/prisma/client";

export async function processApplicationScoringJob(job: BackgroundJob) {
  const payload = job.payload as {
    applicationId: string;
  };

  const application = await prisma.application.findFirst({
    where: {
      id: payload.applicationId,
      organizationId: job.organizationId
    },
    include: {
      candidate: true,
      job: {
        include: {
          criteria: {
            orderBy: {
              order: "asc"
            }
          }
        }
      }
    }
  });

  if (!application) {
    return {
      status: BackgroundJobStatus.FAILED,
      error: "Application not found for scoring."
    };
  }

  const assessment = await evaluateApplication(application.job, application.candidate);

  await prisma.application.update({
    where: {
      id: application.id
    },
    data: {
      score: assessment.score,
      scoreJustification: assessment.scoreJustification,
      executiveSummary: assessment.executiveSummary,
      strengths: assessment.strengths,
      gaps: assessment.gaps,
      detectedSkills: assessment.detectedSkills,
      detectedExperience: assessment.detectedExperience,
      suggestedQuestions: assessment.suggestedQuestions
    }
  });

  return {
    status: BackgroundJobStatus.SUCCEEDED,
    summary: `Application scored with ${assessment.score} fit score.`
  };
}
