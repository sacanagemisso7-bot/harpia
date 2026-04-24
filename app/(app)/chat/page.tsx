import Link from "next/link";
import { Bot, ChevronDown, MessageSquareText, Plus } from "lucide-react";

import { applyCompanyChatAction, sendCompanyChatMessage } from "@/app/(app)/chat/actions";
import { reviewAgentApprovalAction } from "@/app/(app)/people/agent-approvals/actions";
import { AgentApprovalReviewForm } from "@/components/ai-agent/agent-approval-review-form";
import { CompanyChatComposer } from "@/components/chat/company-chat-composer";
import { CompanyChatPromptStrip } from "@/components/chat/company-chat-prompt-strip";
import { CompanyChatProposalForm } from "@/components/chat/company-chat-proposal-form";
import { CompanyChatShell } from "@/components/chat/company-chat-shell";
import { Badge } from "@/components/ui/badge";
import { hasPermission } from "@/lib/auth/permission-matrix";
import { requirePermission } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";
import { getCompanyChatWorkspace } from "@/modules/company-chat/queries";
import type { CompanyChatActionProposal, CompanyChatAgentExecution, CompanyChatCitation } from "@/types/company-chat";

import styles from "./company-chat-page.module.css";
import { CompanyChatLiveConversation } from "./company-chat-live-conversation";

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatThreadScope(value: string) {
  return formatEnumLabel(value);
}

function formatMessageTime(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(value);
}

function formatMessageCount(value: number) {
  return `${value} ${value === 1 ? "mensagem" : "mensagens"}`;
}

function parseMessageMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") {
    return {
      suggestedPrompts: [] as string[],
      actionProposals: [] as CompanyChatActionProposal[],
      citations: [] as CompanyChatCitation[],
      agentExecution: null as CompanyChatAgentExecution | null
    };
  }

  const data = metadata as Record<string, unknown>;

  return {
    suggestedPrompts: Array.isArray(data.suggestedPrompts)
      ? data.suggestedPrompts.filter((item): item is string => typeof item === "string")
      : [],
    actionProposals: Array.isArray(data.actionProposals)
      ? data.actionProposals.filter(
          (item): item is CompanyChatActionProposal =>
            !!item &&
            typeof item === "object" &&
            typeof (item as { type?: unknown }).type === "string" &&
            typeof (item as { label?: unknown }).label === "string"
        )
      : [],
    citations: Array.isArray(data.citations)
      ? data.citations.filter(
          (item): item is CompanyChatCitation =>
            !!item &&
            typeof item === "object" &&
            typeof (item as { id?: unknown }).id === "string" &&
            typeof (item as { documentId?: unknown }).documentId === "string" &&
            typeof (item as { title?: unknown }).title === "string" &&
            typeof (item as { excerpt?: unknown }).excerpt === "string"
        )
      : [],
    agentExecution:
      data.agentExecution &&
      typeof data.agentExecution === "object" &&
      typeof (data.agentExecution as { agentRunId?: unknown }).agentRunId === "string" &&
      typeof (data.agentExecution as { actionType?: unknown }).actionType === "string"
        ? ({
            agentRunId: String((data.agentExecution as { agentRunId: unknown }).agentRunId),
            actionType: (data.agentExecution as { actionType: CompanyChatAgentExecution["actionType"] }).actionType,
            status: (data.agentExecution as { status: CompanyChatAgentExecution["status"] }).status,
            mode: (data.agentExecution as { mode: CompanyChatAgentExecution["mode"] }).mode,
            riskLevel: (data.agentExecution as { riskLevel: CompanyChatAgentExecution["riskLevel"] }).riskLevel,
            requiresApproval: Boolean((data.agentExecution as { requiresApproval?: unknown }).requiresApproval),
            approvalRequestId:
              typeof (data.agentExecution as { approvalRequestId?: unknown }).approvalRequestId === "string"
                ? String((data.agentExecution as { approvalRequestId?: unknown }).approvalRequestId)
                : null,
            approvalStatus:
              typeof (data.agentExecution as { approvalStatus?: unknown }).approvalStatus === "string"
                ? ((data.agentExecution as { approvalStatus?: CompanyChatAgentExecution["approvalStatus"] }).approvalStatus ?? null)
                : null,
            executionStatus:
              typeof (data.agentExecution as { executionStatus?: unknown }).executionStatus === "string"
                ? ((data.agentExecution as { executionStatus?: CompanyChatAgentExecution["executionStatus"] }).executionStatus ?? null)
                : null,
            summary: String((data.agentExecution as { summary: unknown }).summary)
          } satisfies CompanyChatAgentExecution)
        : null
  };
}

export default async function CompanyChatPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePermission("view_chat");
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const threadId = typeof resolvedSearchParams?.threadId === "string" ? resolvedSearchParams.threadId : undefined;
  const initialPrompt = typeof resolvedSearchParams?.prompt === "string" ? resolvedSearchParams.prompt : "";
  const workspace = await getCompanyChatWorkspace({
    organizationId: user.organizationId,
    userId: user.id,
    userRole: user.role,
    threadId
  });

  const activeThread = workspace.activeThread;
  const activeThreadId = activeThread?.id;
  const activeMessages = activeThread?.messages ?? [];
  const canReviewApprovals = hasPermission(user.role, "review_agent_approvals");
  const latestAssistantMessage = [...activeMessages].reverse().find((message) => message.role === "ASSISTANT");
  const latestAssistantMetadata = latestAssistantMessage ? parseMessageMetadata(latestAssistantMessage.metadata) : null;
  const messageCount = activeMessages.length;
  const resolverPrompt = "Resolver com IA o item mais urgente daqui.";

  const prompts =
    latestAssistantMetadata?.suggestedPrompts.length
      ? [resolverPrompt, ...latestAssistantMetadata.suggestedPrompts.filter((prompt) => prompt !== resolverPrompt)].slice(0, 4)
      : [
          resolverPrompt,
          "Quais pend\u00eancias do RH exigem aten\u00e7\u00e3o hoje?",
          "Resuma os onboardings ativos.",
          "O que est\u00e1 em risco no service desk?"
        ];

  return (
    <CompanyChatShell
      hasActiveThread={Boolean(activeThreadId)}
      className={styles.chatApp}
      overlayClassName={styles.chatOverlay}
      railPanelClassName={styles.threadRailPanel}
      railClassName={styles.threadRail}
      mainClassName={styles.chatMain}
      topbarClassName={styles.chatTopbar}
      railToggleClassName={styles.railToggleButton}
      bodyClassName={styles.chatBody}
      composerClassName={styles.composerDock}
      rail={
        <>
          <div className={styles.railHeader}>
            <div>
              <p className={styles.railEyebrow}>Chat da empresa</p>
              <h1 className={styles.railTitle}>Conversas</h1>
            </div>

            <Link href="/chat" className={styles.newThreadButton}>
              <Plus className="h-4 w-4" />
              Nova
            </Link>
          </div>

          <div className={styles.threadList}>
            {workspace.threads.length ? (
              workspace.threads.map((thread) => {
                const preview = thread.messages.at(-1)?.content ?? "Sem mensagens ainda.";

                return (
                  <Link
                    key={thread.id}
                    href={`/chat?threadId=${thread.id}`}
                    className={cn(styles.threadItem, activeThreadId === thread.id && styles.threadItemActive)}
                  >
                    <div className={styles.threadItemTop}>
                      <strong>{thread.title}</strong>
                      <Badge variant="outline">{formatThreadScope(thread.scope)}</Badge>
                    </div>
                    <p>{preview}</p>
                  </Link>
                );
              })
            ) : (
              <div className={styles.emptyRailState}>{"Sua primeira pergunta j\u00e1 abre a conversa."}</div>
            )}
          </div>
        </>
      }
      header={
        <>
          <div className={styles.chatTopbarCopy}>
            <h2>{activeThread?.title ?? "Nova conversa"}</h2>
            <span>{activeThread ? `${formatMessageCount(messageCount)} \u00b7 Enter envia` : "Pergunte de forma direta"}</span>
          </div>

          <div className={styles.chatTopbarMeta}>
            {activeThread?.scope ? <Badge variant="outline">{formatThreadScope(activeThread.scope)}</Badge> : null}
          </div>
        </>
      }
      body={
        <CompanyChatLiveConversation
          threadId={activeThreadId}
          messageCount={messageCount}
          hasMessages={activeMessages.length > 0}
          messageStack={
            <>
              {activeMessages.map((message) => {
                const metadata = parseMessageMetadata(message.metadata);
                const isAssistant = message.role === "ASSISTANT";
                const isUser = message.role === "USER";
                const roleLabel = isAssistant ? "Harpia" : isUser ? "Voc\u00ea" : "Sistema";
                const showActionProposals = Boolean(activeThreadId && metadata.actionProposals.length > 0);
                const hasContext = Boolean(metadata.agentExecution || metadata.citations.length || showActionProposals);

                return (
                  <div
                    key={message.id}
                    data-testid="company-chat-message-row"
                    className={cn(
                      styles.messageRow,
                      isAssistant && styles.messageAssistant,
                      isUser && styles.messageUser,
                      !isAssistant && !isUser && styles.messageSystem
                    )}
                  >
                    <div className={styles.messageColumn}>
                      <div className={styles.messageMeta}>
                        <span className={styles.messageRole}>
                          {isAssistant ? <Bot className="h-3.5 w-3.5" /> : <MessageSquareText className="h-3.5 w-3.5" />}
                          {roleLabel}
                        </span>
                        <span>{formatMessageTime(message.createdAt)}</span>
                      </div>

                      <div
                        className={cn(
                          styles.messageBubble,
                          isAssistant && styles.assistantBubble,
                          isUser && styles.userBubble,
                          !isAssistant && !isUser && styles.systemBubble
                        )}
                        data-testid="company-chat-message"
                      >
                        <div className={styles.messageBody}>{message.content}</div>

                        {hasContext ? (
                          <details className={styles.messageDetails}>
                            <summary>
                              <span>Contexto da resposta</span>
                              <ChevronDown className="h-4 w-4" />
                            </summary>

                            <div className={styles.detailsBody}>
                              {metadata.agentExecution ? (
                                <section className={styles.detailSection}>
                                  <strong className={styles.detailsLabel}>{"Execu\u00e7\u00e3o"}</strong>
                                  <p className={styles.messageSupportingText}>{metadata.agentExecution.summary}</p>
                                  {metadata.agentExecution.status === "WAITING_APPROVAL" &&
                                  canReviewApprovals &&
                                  metadata.agentExecution.approvalRequestId ? (
                                    <AgentApprovalReviewForm
                                      action={reviewAgentApprovalAction}
                                      approvalRequestId={metadata.agentExecution.approvalRequestId}
                                      compact
                                    />
                                  ) : null}
                                </section>
                              ) : null}

                              {metadata.citations.length ? (
                                <section className={styles.detailSection}>
                                  <strong className={styles.detailsLabel}>Fontes</strong>
                                  <div className={styles.citationList}>
                                    {metadata.citations.map((citation) => (
                                      <a
                                        key={`${message.id}-${citation.id}`}
                                        href={citation.href ?? "/knowledge"}
                                        className={styles.citationLink}
                                      >
                                        <strong>{citation.title}</strong>
                                        <span>{citation.excerpt}</span>
                                      </a>
                                    ))}
                                  </div>
                                </section>
                              ) : null}

                              {showActionProposals ? (
                                <section className={styles.detailSection}>
                                  <strong className={styles.detailsLabel}>{"A\u00e7\u00f5es sugeridas"}</strong>
                                  <div className={styles.proposalList}>
                                    {metadata.actionProposals.map((proposal, index) => (
                                      <CompanyChatProposalForm
                                        key={`${message.id}-${proposal.type}-${index}`}
                                        action={applyCompanyChatAction}
                                        threadId={activeThreadId!}
                                        proposal={proposal}
                                      />
                                    ))}
                                  </div>
                                </section>
                              ) : null}
                            </div>
                          </details>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          }
          emptyState={
            <div className={styles.emptyConversation}>
              <div className={styles.emptyConversationCopy}>
                <p className={styles.railEyebrow}>{"Pronto para come\u00e7ar"}</p>
                <h2>Pergunte com clareza.</h2>
                <p>O Harpia responde com contexto real do workspace.</p>
              </div>

              <CompanyChatPromptStrip
                action={sendCompanyChatMessage}
                prompts={prompts}
                className={styles.emptyPromptStrip}
                buttonClassName={styles.promptButton}
              />
            </div>
          }
        />
      }
      composer={
        <div className={styles.composerStack}>
          {activeThreadId && activeMessages.length ? (
            <CompanyChatPromptStrip
              action={sendCompanyChatMessage}
              prompts={prompts}
              threadId={activeThreadId}
              className={styles.composerPromptStrip}
              buttonClassName={styles.composerPromptButton}
            />
          ) : null}
          <CompanyChatComposer action={sendCompanyChatMessage} threadId={activeThreadId} initialDraft={initialPrompt} />
        </div>
      }
    />
  );
}
