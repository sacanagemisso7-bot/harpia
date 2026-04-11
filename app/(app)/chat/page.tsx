import Link from "next/link";
import { Bot, Link2, MessagesSquare, Sparkles, WandSparkles } from "lucide-react";

import { applyCompanyChatAction, sendCompanyChatMessage } from "@/app/(app)/chat/actions";
import { reviewAgentApprovalAction } from "@/app/(app)/people/agent-approvals/actions";
import { AgentApprovalReviewForm } from "@/components/ai-agent/agent-approval-review-form";
import { CompanyChatComposer } from "@/components/chat/company-chat-composer";
import { CompanyChatPromptStrip } from "@/components/chat/company-chat-prompt-strip";
import { CompanyChatProposalForm } from "@/components/chat/company-chat-proposal-form";
import { CompanyChatScrollArea } from "@/components/chat/company-chat-scroll-area";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { hasPermission } from "@/lib/auth/permission-matrix";
import { requirePermission } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";
import { getCompanyChatWorkspace } from "@/modules/company-chat/queries";
import type {
  CompanyChatActionProposal,
  CompanyChatAgentExecution,
  CompanyChatCitation,
  CompanyChatEmailDraft,
  CompanyChatPolicyDraft,
  CompanyChatPolicyOperations,
  CompanyChatRelatedEntity,
  CompanyChatToolTrace
} from "@/types/company-chat";

import styles from "./company-chat-page.module.css";

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

function parseMessageMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") {
    return {
      suggestedPrompts: [] as string[],
      relatedEntities: [] as CompanyChatRelatedEntity[],
      actionProposals: [] as CompanyChatActionProposal[],
      toolTraces: [] as CompanyChatToolTrace[],
      citations: [] as CompanyChatCitation[],
      emailDraft: null as CompanyChatEmailDraft | null,
      policyDraft: null as CompanyChatPolicyDraft | null,
      policyOperations: null as CompanyChatPolicyOperations | null,
      agentExecution: null as CompanyChatAgentExecution | null
    };
  }

  const data = metadata as Record<string, unknown>;

  return {
    suggestedPrompts: Array.isArray(data.suggestedPrompts)
      ? data.suggestedPrompts.filter((item): item is string => typeof item === "string")
      : [],
    relatedEntities: Array.isArray(data.relatedEntities)
      ? data.relatedEntities.filter(
          (item): item is { type: string; id: string; label: string; href: string | null } =>
            !!item && typeof item === "object" && typeof (item as { id?: unknown }).id === "string"
        )
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
    toolTraces: Array.isArray(data.toolTraces)
      ? data.toolTraces.filter(
          (item): item is CompanyChatToolTrace =>
            !!item &&
            typeof item === "object" &&
            typeof (item as { tool?: unknown }).tool === "string" &&
            typeof (item as { summary?: unknown }).summary === "string"
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
    emailDraft:
      data.emailDraft && typeof data.emailDraft === "object" && typeof (data.emailDraft as { subject?: unknown }).subject === "string"
        ? ({
            subject: String((data.emailDraft as { subject: unknown }).subject),
            body: String((data.emailDraft as { body: unknown }).body),
            to:
              typeof (data.emailDraft as { to?: unknown }).to === "string"
                ? String((data.emailDraft as { to?: unknown }).to)
                : null
          } satisfies CompanyChatEmailDraft)
        : null,
    policyDraft:
      data.policyDraft &&
      typeof data.policyDraft === "object" &&
      typeof (data.policyDraft as { response?: unknown }).response === "string" &&
      typeof (data.policyDraft as { confidence?: unknown }).confidence === "string" &&
      typeof (data.policyDraft as { summary?: unknown }).summary === "string"
        ? ({
            response: String((data.policyDraft as { response: unknown }).response),
            confidence: (data.policyDraft as { confidence: CompanyChatPolicyDraft["confidence"] }).confidence,
            summary: String((data.policyDraft as { summary: unknown }).summary)
          } satisfies CompanyChatPolicyDraft)
        : null,
    policyOperations:
      data.policyOperations &&
      typeof data.policyOperations === "object" &&
      typeof (data.policyOperations as { summary?: unknown }).summary === "string"
        ? ({
            summary: String((data.policyOperations as { summary: unknown }).summary),
            pendingAcknowledgements: Number((data.policyOperations as { pendingAcknowledgements?: unknown }).pendingAcknowledgements ?? 0),
            overdueAcknowledgements: Number((data.policyOperations as { overdueAcknowledgements?: unknown }).overdueAcknowledgements ?? 0),
            pendingPolicyRequirements: Number((data.policyOperations as { pendingPolicyRequirements?: unknown }).pendingPolicyRequirements ?? 0),
            items: Array.isArray((data.policyOperations as { items?: unknown[] }).items)
              ? ((data.policyOperations as { items?: unknown[] }).items ?? []).filter(
                  (item): item is CompanyChatPolicyOperations["items"][number] =>
                    !!item &&
                    typeof item === "object" &&
                    typeof (item as { id?: unknown }).id === "string" &&
                    typeof (item as { title?: unknown }).title === "string" &&
                    typeof (item as { employeeName?: unknown }).employeeName === "string" &&
                    typeof (item as { status?: unknown }).status === "string"
                )
              : []
          } satisfies CompanyChatPolicyOperations)
        : null,
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
  const assistantCount = activeMessages.filter((message) => message.role === "ASSISTANT").length;
  const messageCount = activeMessages.length;
  const prompts =
    latestAssistantMetadata?.suggestedPrompts.length
      ? latestAssistantMetadata.suggestedPrompts.slice(0, 4)
      : [
          "Quais pendências do RH estão em risco agora?",
          "Mostre o que exige decisão hoje.",
          "Onde o onboarding perdeu ritmo?",
          "Quais políticas sustentam essa resposta?"
        ];

  const focusSignals = [
    { label: "threads", value: String(workspace.threads.length).padStart(2, "0") },
    { label: "mensagens", value: String(messageCount).padStart(2, "0") },
    { label: "respostas", value: String(assistantCount).padStart(2, "0") },
    { label: "fontes", value: String(latestAssistantMetadata?.citations.length ?? 0).padStart(2, "0") }
  ];

  return (
    <div className={styles.scene}>
      <PageHeader
        eyebrow="Company Chat"
        ghost="COMPANY CHAT"
        title="Conversa com contexto operacional."
        description="Um chat direto, claro e conectado ao workspace para responder, sugerir caminhos e transformar resposta em ação."
      />

      <div className={styles.workspace}>
        <aside className={styles.rail}>
          <div className={styles.panelHeader}>
            <span className={styles.panelEyebrow}>Threads</span>
            <h2 className={styles.panelTitle}>Conversas abertas</h2>
            <p className={styles.panelDescription}>Retome qualquer assunto sem perder o contexto já construído.</p>
          </div>

          <div className={styles.signalGrid}>
            {focusSignals.map((signal) => (
              <div key={signal.label} className={styles.signalCard}>
                <span>{signal.label}</span>
                <strong>{signal.value}</strong>
              </div>
            ))}
          </div>

          <Link href="/chat" className={styles.railAction}>
            <Sparkles className="h-4 w-4" />
            <span>Nova conversa</span>
          </Link>

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
                    <span>{thread.messages.length} mensagens</span>
                  </Link>
                );
              })
            ) : (
              <div className={styles.emptyState}>Sua primeira pergunta já abre a trilha automaticamente.</div>
            )}
          </div>
        </aside>

        <section className={styles.conversationPanel}>
          <div className={styles.conversationHeader}>
            <div>
              <span className={styles.panelEyebrow}>Thread ativa</span>
              <div className={styles.conversationLead}>
                <h2>{activeThread?.title ?? "Nova conversa"}</h2>
                {activeThread?.scope ? <Badge variant="outline">{formatThreadScope(activeThread.scope)}</Badge> : null}
              </div>
              <p className={styles.panelDescription}>
                {activeThread
                  ? "A conversa flui em sequência: pergunta, contexto, resposta e próximos passos."
                  : "Faça uma pergunta natural sobre backlog, pessoas, compliance, service desk ou contratação."}
              </p>
            </div>

            <div className={styles.conversationMeta}>
              <span>
                <MessagesSquare className="h-4 w-4" />
                {messageCount} itens
              </span>
              <span>
                <Sparkles className="h-4 w-4" />
                {assistantCount} respostas
              </span>
              <span>
                <Bot className="h-4 w-4" />
                {prompts.length} atalhos
              </span>
            </div>
          </div>

          <CompanyChatScrollArea className={styles.messageRiver} threadId={activeThreadId} messageCount={messageCount}>
            {activeMessages.length ? (
              <div className={styles.messageStack}>
                {activeMessages.map((message) => {
                  const metadata = parseMessageMetadata(message.metadata);
                  const isAssistant = message.role === "ASSISTANT";
                  const isUser = message.role === "USER";
                  const roleLabel = isAssistant ? "Harpia" : isUser ? "Você" : "Sistema";

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
                      <div
                        className={cn(
                          "chat-message-shell",
                          isAssistant ? "assistant-message" : isUser ? "user-message" : "system-message",
                          styles.messageBubble
                        )}
                        data-testid="company-chat-message"
                      >
                        <div className={cn(styles.messageMeta, "text-xs uppercase tracking-[0.22em] text-muted-foreground")}>
                          <span className={styles.messageRole}>
                            {isAssistant ? <Sparkles className="h-3.5 w-3.5" /> : <MessagesSquare className="h-3.5 w-3.5" />}
                            {roleLabel}
                          </span>
                          <span>{formatMessageTime(message.createdAt)}</span>
                        </div>

                        <div className={styles.messageBody}>{message.content}</div>

                        {metadata.agentExecution ? (
                          <div className="data-row mt-4 p-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline">{formatEnumLabel(metadata.agentExecution.status)}</Badge>
                              <Badge variant="outline">{formatEnumLabel(metadata.agentExecution.riskLevel)}</Badge>
                              <Badge variant="outline">
                                {metadata.agentExecution.requiresApproval ? "Com aprovação" : "Execução direta"}
                              </Badge>
                              {metadata.agentExecution.approvalStatus ? (
                                <Badge variant="outline">{formatEnumLabel(metadata.agentExecution.approvalStatus)}</Badge>
                              ) : null}
                              {metadata.agentExecution.executionStatus ? (
                                <Badge variant="outline">{formatEnumLabel(metadata.agentExecution.executionStatus)}</Badge>
                              ) : null}
                            </div>
                            <p className="mt-3 text-sm text-muted-foreground">{metadata.agentExecution.summary}</p>
                            {metadata.agentExecution.status === "WAITING_APPROVAL" &&
                            canReviewApprovals &&
                            metadata.agentExecution.approvalRequestId ? (
                              <AgentApprovalReviewForm
                                action={reviewAgentApprovalAction}
                                approvalRequestId={metadata.agentExecution.approvalRequestId}
                                compact
                              />
                            ) : null}
                          </div>
                        ) : null}

                        {metadata.toolTraces.length ? (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {metadata.toolTraces.map((trace) => (
                              <div key={`${message.id}-${trace.tool}`} className="trace-pill">
                                {trace.tool}: {trace.summary}
                              </div>
                            ))}
                          </div>
                        ) : null}

                        {metadata.policyDraft ? (
                          <div className="data-row mt-4 p-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline">Policy assistant</Badge>
                              <Badge variant="outline">{formatEnumLabel(metadata.policyDraft.confidence)}</Badge>
                            </div>
                            <p className="mt-3 text-sm text-foreground">{metadata.policyDraft.response}</p>
                            <p className="mt-2 text-sm text-muted-foreground">{metadata.policyDraft.summary}</p>
                          </div>
                        ) : null}

                        {metadata.policyOperations ? (
                          <div className="data-row mt-4 p-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline">Compliance operacional</Badge>
                              <Badge variant="outline">{metadata.policyOperations.pendingAcknowledgements} pendentes</Badge>
                              {metadata.policyOperations.overdueAcknowledgements > 0 ? (
                                <Badge variant="outline">{metadata.policyOperations.overdueAcknowledgements} atrasados</Badge>
                              ) : null}
                            </div>
                            <p className="mt-3 text-sm text-muted-foreground">{metadata.policyOperations.summary}</p>
                          </div>
                        ) : null}

                        {metadata.citations.length ? (
                          <div className="mt-4 data-stack">
                            {metadata.citations.map((citation) => (
                              <a
                                key={`${message.id}-${citation.id}`}
                                href={citation.href ?? "/knowledge"}
                                className="command-link p-4"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <p className="font-semibold">{citation.title}</p>
                                  {citation.position !== null && citation.position !== undefined ? (
                                    <Badge variant="outline">Trecho {citation.position + 1}</Badge>
                                  ) : null}
                                </div>
                                <p className="mt-2 text-sm text-muted-foreground">{citation.excerpt}</p>
                              </a>
                            ))}
                          </div>
                        ) : null}

                        {metadata.relatedEntities.length ? (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {metadata.relatedEntities.map((entity) =>
                              entity.href ? (
                                <a
                                  key={`${message.id}-${entity.id}`}
                                  href={entity.href}
                                  className="interactive-chip text-xs text-muted-foreground"
                                >
                                  <Link2 className="h-3.5 w-3.5" />
                                  {entity.label}
                                </a>
                              ) : null
                            )}
                          </div>
                        ) : null}

                        {metadata.actionProposals.length > 0 && activeThreadId ? (
                          <div className="mt-4 grid gap-3">
                            {metadata.actionProposals.map((proposal, index) => (
                              <CompanyChatProposalForm
                                key={`${message.id}-${proposal.type}-${index}`}
                                action={applyCompanyChatAction}
                                threadId={activeThreadId}
                                proposal={proposal}
                              />
                            ))}
                          </div>
                        ) : null}

                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={styles.welcomeState}>
                <div className={styles.welcomeCopy}>
                  <span className={styles.panelEyebrow}>Company Chat</span>
                  <h2>Converse como no ChatGPT, mas com contexto do seu workspace.</h2>
                  <p>Peça um resumo, encontre pendências, consulte políticas e transforme resposta em ação sem trocar de tela.</p>
                </div>

                <CompanyChatPromptStrip
                  action={sendCompanyChatMessage}
                  prompts={prompts}
                  className={styles.welcomePromptStrip}
                  buttonClassName={styles.welcomePromptButton}
                />
              </div>
            )}
          </CompanyChatScrollArea>

          <div className={styles.composerDock}>
            <CompanyChatPromptStrip
              action={sendCompanyChatMessage}
              threadId={activeThreadId}
              prompts={prompts}
              className={styles.composerPromptStrip}
              buttonClassName={styles.composerPromptButton}
            />

            <div className={styles.composerWrap}>
              <CompanyChatComposer action={sendCompanyChatMessage} threadId={activeThreadId} />
            </div>
          </div>
        </section>

        <aside className={styles.contextPanel}>
          <div className={styles.contextSection}>
            <span className={styles.panelEyebrow}>Readout</span>
            <h3>Contexto atual</h3>
            <p>
              {latestAssistantMessage
                ? "A última resposta deixou fontes, rastros e próximos passos prontos para consulta."
                : "Quando a conversa ganhar contexto, os sinais mais úteis aparecem aqui."}
            </p>
          </div>

          {latestAssistantMetadata?.emailDraft ? (
            <div className={styles.contextSection}>
              <span className={styles.panelEyebrow}>Rascunho</span>
              <h3>{latestAssistantMetadata.emailDraft.subject}</h3>
              <p>{latestAssistantMetadata.emailDraft.to ?? "Sem destinatário sugerido"}</p>
            </div>
          ) : null}

          {latestAssistantMetadata?.policyDraft ? (
            <div className={styles.contextSection}>
              <span className={styles.panelEyebrow}>Policy</span>
              <h3>{formatEnumLabel(latestAssistantMetadata.policyDraft.confidence)}</h3>
              <p>{latestAssistantMetadata.policyDraft.summary}</p>
            </div>
          ) : null}

          {latestAssistantMetadata?.toolTraces.length ? (
            <div className={styles.contextSection}>
              <span className={styles.panelEyebrow}>Toolchain</span>
              <div className={styles.contextList}>
                {latestAssistantMetadata.toolTraces.slice(0, 3).map((trace) => (
                  <div key={trace.tool} className={styles.contextItem}>
                    <strong>{trace.tool}</strong>
                    <p>{trace.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {latestAssistantMetadata?.citations.length ? (
            <div className={styles.contextSection}>
              <span className={styles.panelEyebrow}>Fontes</span>
              <div className={styles.contextList}>
                {latestAssistantMetadata.citations.slice(0, 3).map((citation) => (
                  <a key={citation.id} href={citation.href ?? "/knowledge"} className={styles.contextLink}>
                    {citation.title}
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          {latestAssistantMetadata?.relatedEntities.length ? (
            <div className={styles.contextSection}>
              <span className={styles.panelEyebrow}>Entidades</span>
              <div className={styles.contextList}>
                {latestAssistantMetadata.relatedEntities.slice(0, 3).map((entity) => (
                  <a key={entity.id} href={entity.href ?? "/chat"} className={styles.contextLink}>
                    {entity.label}
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          <div className={styles.contextSection}>
            <span className={styles.panelEyebrow}>Próximo passo</span>
            <p>Use os atalhos ao lado do composer para continuar a conversa sem quebrar o contexto.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
