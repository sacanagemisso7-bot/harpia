import { BackgroundJobStatus, BackgroundJobType } from "@prisma/client";

export type JobPayloadMap = {
  [BackgroundJobType.RESUME_PARSE]: {
    candidateId: string;
    resumeId: string;
  };
  [BackgroundJobType.APPLICATION_SCORE]: {
    applicationId: string;
  };
  [BackgroundJobType.EMAIL_DELIVERY]: {
    templateId: string;
    to: string;
    variables: Record<string, string>;
    applicationId?: string;
  };
  [BackgroundJobType.KNOWLEDGE_INGEST]: {
    documentId: string;
  };
  [BackgroundJobType.ANALYTICS_REBUILD]: {
    reason?: string;
  };
  [BackgroundJobType.ONBOARDING_PLAN_GENERATE]: {
    employeeId: string;
    templateId?: string;
    requestedById?: string;
  };
  [BackgroundJobType.OFFBOARDING_PLAN_GENERATE]: {
    employeeId: string;
    templateId?: string;
    requestedById?: string;
  };
  [BackgroundJobType.PEOPLE_REMINDER]: {
    employeeId?: string;
    taskId?: string;
    requestId?: string;
    channel?: "email" | "desktop" | "chat";
    reason?: string;
  };
  [BackgroundJobType.HR_REQUEST_SLA_ALERT]: {
    requestId: string;
    alertLevel: "AT_RISK" | "BREACHED";
  };
  [BackgroundJobType.COMPLIANCE_ALERT]: {
    requirementId: string;
    employeeId: string;
    reason?: string;
  };
  [BackgroundJobType.INTERNAL_SUMMARY_BUILD]: {
    scope?: "people_ops" | "service_desk" | "company";
    deliveryTarget?: string;
  };
  [BackgroundJobType.WATCHTOWER_SWEEP]: {
    scope?: "people_ops" | "company";
    triggeredBy?: "cron" | "manual" | "inline";
    bucketKey?: string;
  };
};

export type EnqueueBackgroundJobInput<T extends BackgroundJobType> = {
  organizationId: string;
  type: T;
  payload: JobPayloadMap[T];
  uniqueKey?: string;
  maxAttempts?: number;
  availableAt?: Date;
};

export type BackgroundJobProcessorResult = {
  status: BackgroundJobStatus;
  summary?: string;
  error?: string;
};
