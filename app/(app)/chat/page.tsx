import Link from "next/link";
import { Bot, Link2, MessagesSquare, Sparkles, WandSparkles } from "lucide-react";

import { applyCompanyChatAction, sendCompanyChatMessage } from "@/app/(app)/chat/actions";
import { reviewAgentApprovalAction } from "@/app/(app)/people/agent-approvals/actions";
import { AgentApprovalReviewForm } from "@/components/ai-agent/agent-approval-review-form";
import { CompanyChatComposer } from "@/components/chat/company-chat-composer";
import { CompanyChatProposalForm } from "@/components/chat/company-chat-proposal-form";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { hasPermission } from "@/lib/auth/permission-matrix";
import { requirePermission } from "@/lib/auth/permissions";
import { getCompanyChatWorkspace } from "@/modules/company-chat/queries";
import type {
  CompanyChatActionProposal,
  CompanyChatAgentExecution,
  CompanyChatCitation,
  CompanyChatEmailDraft,
  CompanyChatPolicyOperations,
  CompanyChatPolicyDraft,
  CompanyChatRelatedEntity,
  CompanyChatToolTrace
} from "@/types/company-chat";

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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
  const activeThreadId = workspace.activeThread?.id;
  const canReviewApprovals = hasPermission(user.role, "review_agent_approvals");
  const latestAssistantMessage = [...(workspace.activeThread?.messages ?? [])].reverse().find((message) => message.role === "ASSISTANT");
  const latestAssistantMetadata = latestAssistantMessage ? parseMessageMetadata(latestAssistantMessage.metadata) : null;

  return (
    <div className="page-stage space-y-7">
      <PageHeader
        eyebrow="Company chat"
        title="Copiloto operacional da empresa"
        description="Converse com colaboradores, solicitacoes internas, tarefas, onboarding, offboarding, compliance, knowledge base e tambem com o modulo de hiring quando necessario."
      />

      <section className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_320px]">
        <Card className="panel-hover">
          <CardHeader>
            <CardTitle>Threads</CardTitle>
            <CardDescription>Historico do seu contexto operacional.</CardDescription>
          </CardHeader>
          <CardContent className="data-stack">
            {workspace.threads.length ? (
              workspace.threads.map((thread) => (
                <Link
                  key={thread.id}
                  href={`/chat?threadId=${thread.id}`}
                  className={`chat-rail-item ${
                    workspace.activeThread?.id === thread.id ? "chat-rail-item-active" : ""
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold">{thread.title}</p>
                      <Badge variant="outline">{thread.scope}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{thread.messages[0]?.content ?? "Sem mensagens ainda."}</p>
                  </div>
                </Link>
              ))
            ) : (
              <div className="empty-state-shell p-4 text-sm text-muted-foreground">
                Sua primeira conversa vira um thread automaticamente.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="panel-hover">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-secondary p-3 text-secondary-foreground">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <CardTitle>Workspace de conversa</CardTitle>
                <CardDescription>Leitura, copiloto operacional e acoes assistidas com confirmacao.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <CompanyChatComposer action={sendCompanyChatMessage} threadId={workspace.activeThread?.id} />

            <div className="data-stack">
              {workspace.activeThread?.messages.length ? (
                workspace.activeThread.messages.map((message) => {
                  const metadata = parseMessageMetadata(message.metadata);
                  const isAssistant = message.role === "ASSISTANT";

                  return (
                    <div
                      key={message.id}
                      className={`chat-message-shell ${
                        isAssistant ? "assistant-message" : message.role === "USER" ? "user-message" : "system-message"
                      }`}
                    >
                      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                        {isAssistant ? <Sparkles className="h-3.5 w-3.5" /> : <MessagesSquare className="h-3.5 w-3.5" />}
                        {message.role}
                      </div>
                      <div className="mt-3 whitespace-pre-wrap text-sm leading-7">{message.content}</div>

                      {metadata.agentExecution ? (
                        <div className="data-row mt-4 p-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{formatEnumLabel(metadata.agentExecution.status)}</Badge>
                            <Badge variant="outline">{formatEnumLabel(metadata.agentExecution.riskLevel)}</Badge>
                            <Badge variant="outline">
                              {metadata.agentExecution.requiresApproval ? "Com aprovacao" : "Execucao direta"}
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

                      {metadata.suggestedPrompts.length ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {metadata.suggestedPrompts.map((prompt) => (
                            <div key={`${message.id}-${prompt}`} className="interactive-chip text-xs text-muted-foreground">
                              {prompt}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <div className="empty-state-shell p-5 text-sm text-muted-foreground">
                  Pergunte algo como &quot;quais tarefas do RH estao vencidas?&quot;, &quot;resuma o backlog de solicitacoes internas&quot; ou &quot;crie um onboarding para esse colaborador&quot;.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="panel-hover">
          <CardHeader>
            <CardTitle>Contexto lateral</CardTitle>
            <CardDescription>Artifacts, trilha de tools e prompts para operar o chat como copiloto.</CardDescription>
          </CardHeader>
          <CardContent className="data-stack">
            {latestAssistantMetadata?.emailDraft ? (
              <div className="data-row p-4">
                <p className="section-intro">Rascunho de email</p>
                <p className="mt-3 font-semibold">{latestAssistantMetadata.emailDraft.subject}</p>
                <p className="mt-2 text-sm text-muted-foreground">{latestAssistantMetadata.emailDraft.to ?? "Sem destinatario sugerido"}</p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                  {latestAssistantMetadata.emailDraft.body}
                </p>
              </div>
            ) : null}

            {latestAssistantMetadata?.toolTraces.length ? (
              <div className="data-row p-4">
                <p className="section-intro">Toolchain usada</p>
                <div className="mt-3 data-stack">
                  {latestAssistantMetadata.toolTraces.map((trace) => (
                    <div key={trace.tool} className="data-row p-3">
                      <p className="font-semibold">{trace.tool}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{trace.summary}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {latestAssistantMetadata?.policyDraft ? (
              <div className="data-row p-4">
                <p className="section-intro">Policy assistant</p>
                <p className="mt-3 font-semibold">{formatEnumLabel(latestAssistantMetadata.policyDraft.confidence)}</p>
                <p className="mt-2 text-sm text-muted-foreground">{latestAssistantMetadata.policyDraft.summary}</p>
              </div>
            ) : null}

            {latestAssistantMetadata?.policyOperations ? (
              <div className="data-row p-4">
                <p className="section-intro">Status operacional</p>
                <p className="mt-3 font-semibold">{latestAssistantMetadata.policyOperations.summary}</p>
                <div className="mt-3 data-stack">
                  {latestAssistantMetadata.policyOperations.items.map((item) => (
                    <a
                      key={item.id}
                      href={item.href ?? "/people/compliance"}
                      className="command-link p-3"
                    >
                      <p className="font-semibold">{item.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.employeeName}
                        {item.documentTitle ? ` - ${item.documentTitle}` : ""}
                      </p>
                    </a>
                  ))}
                </div>
              </div>
            ) : null}

            {latestAssistantMetadata?.citations.length ? (
              <div className="data-row p-4">
                <p className="section-intro">Fontes citadas</p>
                <div className="mt-3 data-stack">
                  {latestAssistantMetadata.citations.map((citation) => (
                    <a
                      key={citation.id}
                      href={citation.href ?? "/knowledge"}
                      className="command-link p-3"
                    >
                      <p className="font-semibold">{citation.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{citation.excerpt}</p>
                    </a>
                  ))}
                </div>
              </div>
            ) : null}

            {latestAssistantMetadata?.relatedEntities.length ? (
              <div className="data-row p-4">
                <p className="section-intro">Entidades relacionadas</p>
                <div className="mt-3 data-stack">
                  {latestAssistantMetadata.relatedEntities.map((entity) => (
                    <a
                      key={entity.id}
                      href={entity.href ?? "/chat"}
                      className="command-link p-3"
                    >
                      <p className="font-semibold">{entity.label}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{entity.type}</p>
                    </a>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="data-stack">
              {[
                "Quais politicas internas devo citar para responder este caso?",
                "Resuma as pendencias operacionais que estao em risco hoje.",
                "Onde onboarding ou offboarding ficou travado?",
                "Quais solicitacoes internas precisam de resposta agora?"
              ].map((prompt) => (
                <div key={prompt} className="data-row p-4 text-sm text-muted-foreground">
                  <div className="flex items-start gap-3">
                    <WandSparkles className="mt-0.5 h-4 w-4 text-primary" />
                    <span>{prompt}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
