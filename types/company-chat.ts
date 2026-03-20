export type CompanyChatRelatedEntity = {
  type: string;
  id: string;
  label: string;
  href: string | null;
};

export type CompanyChatActionType =
  | "create_note"
  | "move_stage"
  | "save_shortlist"
  | "draft_email"
  | "schedule_interview"
  | "create_onboarding_plan"
  | "create_offboarding_plan"
  | "create_hr_request"
  | "update_hr_request"
  | "create_people_task"
  | "update_people_task";

export type CompanyChatActionProposal = {
  type: CompanyChatActionType;
  label: string;
  description: string;
  payload: Record<string, unknown>;
  riskLevel?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  requiresApproval?: boolean;
};

export type CompanyChatToolTrace = {
  tool: string;
  summary: string;
};

export type CompanyChatCitation = {
  id: string;
  documentId: string;
  chunkId?: string | null;
  title: string;
  excerpt: string;
  href: string | null;
  type?: string | null;
  position?: number | null;
};

export type CompanyChatEmailDraft = {
  subject: string;
  body: string;
  to?: string | null;
};

export type CompanyChatPolicyDraft = {
  response: string;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  summary: string;
};

export type CompanyChatPolicyOperations = {
  summary: string;
  pendingAcknowledgements: number;
  overdueAcknowledgements: number;
  pendingPolicyRequirements: number;
  items: Array<{
    id: string;
    title: string;
    employeeId?: string | null;
    employeeName: string;
    documentTitle?: string | null;
    status: "PENDING" | "OVERDUE" | "ACKNOWLEDGED";
    dueAt?: string | null;
    href: string | null;
  }>;
};

export type CompanyChatAgentExecution = {
  agentRunId: string;
  actionType: CompanyChatActionType;
  status: "WAITING_APPROVAL" | "EXECUTING" | "SUCCEEDED" | "FAILED" | "REJECTED";
  mode: "CHAT_ASSISTED" | "AUTOMATION" | "WATCHTOWER";
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  requiresApproval: boolean;
  approvalRequestId?: string | null;
  approvalStatus?: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED" | "CANCELED" | null;
  executionStatus?: "PENDING" | "SUCCEEDED" | "FAILED" | null;
  summary: string;
};

export type CompanyChatMessageMetadata = {
  suggestedPrompts: string[];
  relatedEntities: CompanyChatRelatedEntity[];
  actionProposals: CompanyChatActionProposal[];
  toolTraces: CompanyChatToolTrace[];
  citations: CompanyChatCitation[];
  emailDraft?: CompanyChatEmailDraft | null;
  policyDraft?: CompanyChatPolicyDraft | null;
  policyOperations?: CompanyChatPolicyOperations | null;
  agentExecution?: CompanyChatAgentExecution | null;
};
