export const COMPANY_CHAT_SUBMISSION_EVENT = "harpia:company-chat-submission";

export type CompanyChatSubmissionEventDetail = {
  phase: "start" | "finish";
  threadId?: string | null;
  message?: string;
};
