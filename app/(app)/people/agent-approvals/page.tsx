import { AgentApprovalStatus } from "@prisma/client";
import { CheckCircle2, Clock3, ShieldAlert, Sparkles } from "lucide-react";

import { reviewAgentApprovalAction } from "@/app/(app)/people/agent-approvals/actions";
import { AgentApprovalReviewForm } from "@/components/ai-agent/agent-approval-review-form";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { requirePermission } from "@/lib/auth/permissions";
import { listAgentApprovalRequests, listRecentAgentRuns } from "@/modules/ai-agent/queries";

import styles from "../../workspace-expansion.module.css";

function formatDateTime(value: Date | null | undefined) {
  if (!value) {
    return "Sem data";
  }

  return value.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function AgentApprovalsPage() {
  const user = await requirePermission("review_agent_approvals");
  const [pendingApprovals, recentRuns] = await Promise.all([
    listAgentApprovalRequests(user.organizationId, AgentApprovalStatus.PENDING),
    listRecentAgentRuns(user.organizationId, 10)
  ]);

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Agent approvals"
        title="Trust layer do agente corporativo"
        description="Aprovacoes humanas para acoes assistidas de maior risco dentro do workspace."
      />

      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Pendencias</span>
          <strong className={styles.statValue}>{pendingApprovals.length}</strong>
          <span className={styles.statHint}>Acoes aguardando decisao humana antes de executar.</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Runs recentes</span>
          <strong className={styles.statValue}>{recentRuns.length}</strong>
          <span className={styles.statHint}>Historico curto para revisar uso e confianca.</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Objetivo</span>
          <strong className={styles.statValue}>Controle</strong>
          <span className={styles.statHint}>Acoes sensiveis nao passam sem checkpoint humano.</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Modo</span>
          <strong className={styles.statValue}>Guarded</strong>
          <span className={styles.statHint}>Uso assistido com rastreio e revisao.</span>
        </div>
      </section>

      <section className={styles.detailLayout}>
        <div className={styles.column}>
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Approval queue</span>
              <h2 className={styles.panelTitle}>Fila pendente</h2>
              <p className={styles.panelDescription}>Pedidos montados pelo agente que dependem de um decisor antes de seguir.</p>
            </div>
            {pendingApprovals.length ? (
              <div className={styles.list}>
                {pendingApprovals.map((approval) => (
                  <article key={approval.id} className={styles.listItem}>
                    <div className={styles.itemHeader}>
                      <div className={styles.itemLead}>
                        <strong className={styles.itemTitle}>{approval.title}</strong>
                        <span className={styles.itemSubtitle}>
                          {formatDateTime(approval.createdAt)} · {approval.expiresAt ? `expira ${formatDateTime(approval.expiresAt)}` : "sem expiracao"}
                        </span>
                      </div>
                      <div className={styles.tagWrap}>
                        <Badge variant="outline">{formatEnumLabel(approval.riskLevel)}</Badge>
                        <Badge variant="outline">{formatEnumLabel(approval.status)}</Badge>
                      </div>
                    </div>
                    <span className={styles.itemDescription}>{approval.summary}</span>
                    <div className={styles.subGrid2}>
                      <div className={styles.surfaceMuted}>
                        <strong className={styles.itemTitle}>Solicitado por</strong>
                        <span className={styles.itemDescription}>
                          {approval.requestedByUser?.name ?? approval.agentRun.startedByUser?.name ?? "Usuario do workspace"}
                        </span>
                        <span className={styles.itemDescription}>
                          {approval.requestedByUser?.email ?? approval.agentRun.startedByUser?.email ?? "Sem email disponivel"}
                        </span>
                      </div>
                      <div className={styles.surfaceMuted}>
                        <strong className={styles.itemTitle}>Contexto</strong>
                        <span className={styles.itemDescription}>
                          {approval.agentRun.chatThread?.title ?? approval.agentRun.goal ?? "Execucao sem thread vinculada"}
                        </span>
                        <span className={styles.itemDescription}>
                          {approval.agentRun.chatThread ? "Originado no company chat" : "Originado fora do chat"}
                        </span>
                      </div>
                    </div>
                    <div className={styles.surfaceMuted}>
                      <AgentApprovalReviewForm action={reviewAgentApprovalAction} approvalRequestId={approval.id} />
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>Nenhuma aprovacao pendente no momento.</div>
            )}
          </div>
        </div>

        <aside className={styles.stickyAside}>
          <div className={styles.spotlight}>
            <span className={styles.panelEyebrow}>Queue</span>
            <strong className={styles.spotlightValue}>{pendingApprovals.length}</strong>
            <p className={styles.panelDescription}>Checkpoint humano aguardando decisao agora.</p>
          </div>

          <div className={styles.panel}>
            <div className={styles.itemHeader}>
              <div className={styles.itemLead}>
                <span className={styles.panelEyebrow}>Recent runs</span>
                <h3 className={styles.panelTitle}>Execucoes recentes</h3>
              </div>
              <span className={styles.iconLead}>
                <Sparkles className="h-4 w-4" />
              </span>
            </div>
            {recentRuns.length ? (
              <div className={styles.list}>
                {recentRuns.map((run) => {
                  const latestApproval = run.approvals[0];
                  const latestExecution = run.executions[0];

                  return (
                    <article key={run.id} className={styles.listItem}>
                      <div className={styles.itemHeader}>
                        <div className={styles.itemLead}>
                          <strong className={styles.itemTitle}>{run.summary ?? run.goal}</strong>
                          <span className={styles.itemSubtitle}>
                            {run.startedByUser?.name ?? "Agente"} · {formatDateTime(run.createdAt)}
                          </span>
                        </div>
                        <Badge variant="outline">{formatEnumLabel(run.status)}</Badge>
                      </div>
                      <div className={styles.tagWrap}>
                        <span className={styles.tagPill}>{formatEnumLabel(run.riskLevel)}</span>
                        <span className={styles.tagPill}>{run.requiresApproval ? "Com aprovacao" : "Execucao direta"}</span>
                        {latestApproval ? <span className={styles.tagPill}>{formatEnumLabel(latestApproval.status)}</span> : null}
                        {latestExecution ? <span className={styles.tagPill}>{formatEnumLabel(latestExecution.status)}</span> : null}
                      </div>
                      {run.error ? <span className={styles.itemDescription}>{run.error}</span> : null}
                      {run.status === "SUCCEEDED" ? (
                        <div className={styles.rowBetween}>
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          <span className={styles.itemDescription}>Execucao concluida com sucesso.</span>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className={styles.surfaceMuted}>O historico recente do agente ainda nao tem runs suficientes para exibir aqui.</div>
            )}
          </div>

          <div className={styles.panel}>
            <div className={styles.metricStack}>
              <div className={styles.metricRow}>
                <span>
                  <Clock3 className="mr-2 inline h-4 w-4" />
                  Pendentes
                </span>
                <strong>{pendingApprovals.length}</strong>
              </div>
              <div className={styles.metricRow}>
                <span>
                  <ShieldAlert className="mr-2 inline h-4 w-4" />
                  Guardrail
                </span>
                <strong>On</strong>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
