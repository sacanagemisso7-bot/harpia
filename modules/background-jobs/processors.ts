import { BackgroundJobStatus, BackgroundJobType, type BackgroundJob } from "@prisma/client";

import { processApplicationScoringJob } from "@/modules/recruiting/score-job";
import { processKnowledgeIngestionJob } from "@/modules/knowledge/ingestion-service";
import { processResumeParsingJob } from "@/modules/ai/resume-job";
import { processEmailDeliveryJob } from "@/modules/communications/email-job";
import type { BackgroundJobProcessorResult, JobPayloadMap } from "@/modules/background-jobs/types";
import {
  processComplianceAlertJob,
  processHrRequestSlaAlertJob,
  processInternalSummaryBuildJob,
  processPeopleReminderJob,
  processWatchtowerSweepJob
} from "@/modules/watchtower/service";

type Processor<T extends BackgroundJobType> = (
  job: BackgroundJob,
  payload: JobPayloadMap[T]
) => Promise<BackgroundJobProcessorResult>;

async function completePlaceholderJob(summary: string): Promise<BackgroundJobProcessorResult> {
  return {
    status: BackgroundJobStatus.SUCCEEDED,
    summary
  };
}

const processors: {
  [K in BackgroundJobType]: Processor<K>;
} = {
  [BackgroundJobType.RESUME_PARSE]: processResumeParsingJob,
  [BackgroundJobType.APPLICATION_SCORE]: processApplicationScoringJob,
  [BackgroundJobType.EMAIL_DELIVERY]: processEmailDeliveryJob,
  [BackgroundJobType.KNOWLEDGE_INGEST]: processKnowledgeIngestionJob,
  [BackgroundJobType.ANALYTICS_REBUILD]: async () => ({
    status: BackgroundJobStatus.SUCCEEDED,
    summary: "Analytics rebuild marked for future implementation."
  }),
  [BackgroundJobType.ONBOARDING_PLAN_GENERATE]: async () =>
    completePlaceholderJob("Onboarding plan generation registered for the people ops workflow."),
  [BackgroundJobType.OFFBOARDING_PLAN_GENERATE]: async () =>
    completePlaceholderJob("Offboarding plan generation registered for the people ops workflow."),
  [BackgroundJobType.PEOPLE_REMINDER]: processPeopleReminderJob,
  [BackgroundJobType.HR_REQUEST_SLA_ALERT]: processHrRequestSlaAlertJob,
  [BackgroundJobType.COMPLIANCE_ALERT]: processComplianceAlertJob,
  [BackgroundJobType.INTERNAL_SUMMARY_BUILD]: processInternalSummaryBuildJob,
  [BackgroundJobType.WATCHTOWER_SWEEP]: processWatchtowerSweepJob
};

export async function processBackgroundJob(job: BackgroundJob): Promise<BackgroundJobProcessorResult> {
  const processor = processors[job.type];

  if (!processor) {
    return {
      status: BackgroundJobStatus.FAILED,
      error: `No processor registered for ${job.type}.`
    };
  }

  return processor(job as never, job.payload as never);
}
