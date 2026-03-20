import { BackgroundJobStatus, type BackgroundJob, type BackgroundJobType } from "@prisma/client";

import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma/client";
import { logError } from "@/lib/observability/logger";
import { processBackgroundJob } from "@/modules/background-jobs/processors";
import type { EnqueueBackgroundJobInput } from "@/modules/background-jobs/types";

export async function enqueueBackgroundJob<T extends BackgroundJobType>(input: EnqueueBackgroundJobInput<T>) {
  const existing = input.uniqueKey
    ? await prisma.backgroundJob.findUnique({
        where: {
          uniqueKey: input.uniqueKey
        }
      })
    : null;

  if (existing) {
    return existing;
  }

  const job = await prisma.backgroundJob.create({
    data: {
      organizationId: input.organizationId,
      type: input.type,
      payload: input.payload,
      uniqueKey: input.uniqueKey,
      maxAttempts: input.maxAttempts ?? 3,
      availableAt: input.availableAt ?? new Date()
    }
  });

  if (env.BACKGROUND_JOBS_INLINE) {
    await processPendingBackgroundJobs({
      limit: 1,
      organizationId: input.organizationId
    });
  }

  return job;
}

export async function processPendingBackgroundJobs(input?: {
  limit?: number;
  organizationId?: string;
}) {
  const limit = input?.limit ?? 5;
  const processed: Array<{ id: string; status: BackgroundJobStatus }> = [];

  while (processed.length < limit) {
    const jobs: BackgroundJob[] = await prisma.backgroundJob.findMany({
      where: {
        status: BackgroundJobStatus.QUEUED,
        availableAt: {
          lte: new Date()
        },
        organizationId: input?.organizationId
      },
      orderBy: [{ createdAt: "asc" }],
      take: limit - processed.length
    });

    if (!jobs.length) {
      break;
    }

    for (const job of jobs as BackgroundJob[]) {
      const claimed = await prisma.backgroundJob.updateMany({
        where: {
          id: job.id,
          status: BackgroundJobStatus.QUEUED
        },
        data: {
          status: BackgroundJobStatus.PROCESSING,
          lockedAt: new Date(),
          attempts: job.attempts + 1
        }
      });

      if (!claimed.count) {
        continue;
      }

      try {
        const freshJob: BackgroundJob = await prisma.backgroundJob.findUniqueOrThrow({
          where: {
            id: job.id
          }
        });

        const result = await processBackgroundJob(freshJob);
        const finalStatus =
          result.status === BackgroundJobStatus.FAILED && freshJob.attempts < freshJob.maxAttempts
            ? BackgroundJobStatus.QUEUED
            : result.status;

        await prisma.backgroundJob.update({
          where: {
            id: freshJob.id
          },
          data: {
            status: finalStatus,
            lastError: result.error ?? null,
            resultSummary: result.summary ?? null,
            lockedAt: null,
            processedAt: finalStatus === BackgroundJobStatus.SUCCEEDED ? new Date() : null,
            availableAt:
              finalStatus === BackgroundJobStatus.QUEUED
                ? new Date(Date.now() + freshJob.attempts * 30 * 1000)
                : freshJob.availableAt
          }
        });

        processed.push({
          id: freshJob.id,
          status: finalStatus
        });
      } catch (error) {
        logError("Background job processing failed", error, { jobId: job.id, type: job.type }, "background-jobs");

        const failedJob = await prisma.backgroundJob.findUnique({
          where: {
            id: job.id
          }
        });

        const shouldRetry = failedJob ? failedJob.attempts < failedJob.maxAttempts : false;

        await prisma.backgroundJob.update({
          where: {
            id: job.id
          },
          data: {
            status: shouldRetry ? BackgroundJobStatus.QUEUED : BackgroundJobStatus.FAILED,
            lastError: error instanceof Error ? error.message : "Unknown background job error",
            lockedAt: null,
            availableAt: shouldRetry ? new Date(Date.now() + 60 * 1000) : new Date()
          }
        });
      }

      if (processed.length >= limit) {
        break;
      }
    }
  }

  return processed;
}
