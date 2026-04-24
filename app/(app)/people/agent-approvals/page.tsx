import { AgentApprovalStatus } from "@prisma/client";
import { CheckCircle2, Clock3, ShieldAlert, Sparkles } from "lucide-react";

import { reviewAgentApprovalAction } from "@/app/(app)/people/agent-approvals/actions";
import { AgentApprovalReviewForm } from "@/components/ai-agent/agent-approval-review-form";
import { Badge } from "@/components/ui/badge";
import { requirePermission } from "@/lib/auth/permissions";
import { listAgentApprovalRequests, listRecentAgentRuns } from "@/modules/ai-agent/queries";

import styles from "@/components/operations/ops-workspace.module.css";

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

function readPayload(payload: unknown) {
  return payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
}

function getAffectedRecordCount(payload: Record<string, unknown>) {
  const listCount = Array.isArray(payload.applicationIds) ? payload.applicationIds.length : 0;
  const singleKeys = ["requestId", "taskId", "employeeId", "applicationId", "candidateId"].filter((key) => Boolean(payload[key])).length;
  return Math.max(listCount, singleKeys);
}

function getBeforeAfter(actionType: string | null, payload: Record<string, unknown>) {
  const status = typeof payload.status === "string" ? payload.status : null;
  const stageId = typeof payload.stageId === "string" ? payload.stageId : null;

  if (status) {
    return {
      before: "Status atual do registro",
      after: `Status proposto: ${formatEnumLabel(status)}`
    };
  }

  if (stageId || actionType === "move_stage") {
    return {
      before: "Etapa atual da candidatura",
      after: "Nova etapa validada pelo agente"
    };
  }

  if (actionType?.includes("create")) {
    return {
      before: "Nenhum registro criado",
      after: "Novo registro operacional com auditoria"
    };
  }

  return {
    before: "Estado atual preservado",
    after: "Mudança será aplicada após aprovação"
  };
}

export default async function AgentApprovalsPage() {
  const user = await requirePermission("review_agent_approvals");
  const [pendingApprovals, recentRuns] = await Promise.all([
    listAgentApprovalRequests(user.organizationId, AgentApprovalStatus.PENDING),
    listRecentAgentRuns(user.organizationId, 10)
  ]);

  return (
    <div className={styles.workspace}>
      <div className={styles.header}>
        <span className={styles.eyebrow}>Agente</span>
        <h2 className={styles.title}>Aprovações do agente</h2>
        <p className={styles.description}>
          Ações sensíveis passam por revisão humana antes de executar, com rastreio claro de risco, contexto e
          histórico recente.
        </p>
      </div>

      <div className={styles.statRow}>
        <div className={styles.statPill}>
          <strong>{pendingApprovals.length}</strong>
          <span>pendentes agora</span>
        </div>
        <div className={styles.statPill}>
          <strong>{recentRuns.length}</strong>
          <span>runs recentes</span>
        </div>
        <div className={styles.statPill}>
          <strong>Guarded</strong>
          <span>execução protegida</span>
        </div>
      </div>

      <div className={styles.body}>
        <section className={styles.listPanel}>
          <div className={styles.panelHeader}>
            <div className={styles.panelHeaderRow}>
              <div>
                <h3 className={styles.panelTitle}>Fila pendente</h3>
                <p className={styles.panelDescription}>O que o agente pediu para executar e ainda aguarda decisão.</p>
              </div>
            </div>
          </div>

          <div className={styles.list}>
            {pendingApprovals.length ? (
              pendingApprovals.map((approval) => {
                const payload = readPayload(approval.payload);
                const actionType = approval.agentRun.actionType;
                const diff = getBeforeAfter(actionType, payload);
                const affectedRecords = getAffectedRecordCount(payload);

                return (
                <div key={approval.id} className={styles.row}>
                  <div className={styles.rowTop}>
                    <div className={styles.rowLead}>
                      <p className={styles.rowTitle}>{approval.title}</p>
                      <p className={styles.rowSubtitle}>
                        {formatDateTime(approval.createdAt)} ·{" "}
                        {approval.expiresAt ? `expira ${formatDateTime(approval.expiresAt)}` : "sem expiração"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{formatEnumLabel(approval.riskLevel)}</Badge>
                      <Badge variant="warning">{formatEnumLabel(approval.status)}</Badge>
                    </div>
                  </div>
                  <p className={styles.rowSubtitle}>{approval.summary}</p>
                  <div className={styles.approvalPremium}>
                    <div className={styles.sectionHeader}>
                      <div>
                        <span className={styles.metaLabel}>Checkpoint enterprise</span>
                        <h4 className={styles.panelTitle}>Revise antes de executar</h4>
                      </div>
                      <Badge variant={approval.riskLevel === "CRITICAL" ? "destructive" : "outline"}>
                        Risco {formatEnumLabel(approval.riskLevel)}
                      </Badge>
                    </div>
                    <div className={styles.approvalChecklist}>
                      <div>
                        <span className={styles.metaLabel}>Ação proposta</span>
                        <span className={styles.metaValue}>{actionType ? formatEnumLabel(actionType) : "Ação do agente"}</span>
                      </div>
                      <div>
                        <span className={styles.metaLabel}>Registros afetados</span>
                        <span className={styles.metaValue}>{affectedRecords || "Sob demanda"}</span>
                      </div>
                      <div>
                        <span className={styles.metaLabel}>Motivo</span>
                        <span className={styles.metaValue}>Executar só depois de revisão humana.</span>
                      </div>
                    </div>
                    <div className={styles.approvalDiff}>
                      <div>
                        <span className={styles.metaLabel}>Antes</span>
                        <p className={styles.detailText}>{diff.before}</p>
                      </div>
                      <div>
                        <span className={styles.metaLabel}>Depois</span>
                        <p className={styles.detailText}>{diff.after}</p>
                      </div>
                    </div>
                    <p className={styles.detailText}>
                      Confiança: a ação só usa o payload aprovado, respeita permissões, cria auditoria e pode ser rejeitada sem efeito colateral.
                    </p>
                  </div>
                  <div className={styles.detailGrid}>
                    <div className={styles.detailCell}>
                      <span className={styles.metaLabel}>Solicitado por</span>
                      <span className={styles.metaValue}>
                        {approval.requestedByUser?.name ?? approval.agentRun.startedByUser?.name ?? "Usuário do workspace"}
                      </span>
                      <p className={styles.detailText}>
                        {approval.requestedByUser?.email ?? approval.agentRun.startedByUser?.email ?? "Sem e-mail disponível"}
                      </p>
                    </div>
                    <div className={styles.detailCell}>
                      <span className={styles.metaLabel}>Contexto</span>
                      <span className={styles.metaValue}>
                        {approval.agentRun.chatThread?.title ?? approval.agentRun.goal ?? "Execução sem thread vinculada"}
                      </span>
                      <p className={styles.detailText}>
                        {approval.agentRun.chatThread ? "Originado no Company Chat" : "Originado fora do chat"}
                      </p>
                    </div>
                  </div>
                  <div className={styles.detailCell}>
                    <AgentApprovalReviewForm action={reviewAgentApprovalAction} approvalRequestId={approval.id} compact />
                  </div>
                </div>
                );
              })
            ) : (
              <div className={styles.emptyWrap}>
                <p className={styles.emptyState}>Nenhuma aprovação pendente no momento.</p>
              </div>
            )}
          </div>
        </section>

        <aside className={styles.detailColumn}>
          <section className={styles.detailPanel}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.panelTitle}>Runs recentes</h3>
              <Badge variant="outline">Histórico</Badge>
            </div>

            <div className={styles.sectionStack}>
              {recentRuns.length ? (
                recentRuns.map((run) => {
                  const latestApproval = run.approvals[0];
                  const latestExecution = run.executions[0];

                  return (
                    <div key={run.id} className={styles.detailCell}>
                      <div className={styles.sectionHeader}>
                        <span className={styles.metaValue}>{run.summary ?? run.goal}</span>
                        <Badge variant="outline">{formatEnumLabel(run.status)}</Badge>
                      </div>
                      <p className={styles.detailText}>
                        {run.startedByUser?.name ?? "Agente"} · {formatDateTime(run.createdAt)}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{formatEnumLabel(run.riskLevel)}</Badge>
                        <Badge variant="outline">{run.requiresApproval ? "Com aprovação" : "Execução direta"}</Badge>
                        {latestApproval ? <Badge variant="outline">{formatEnumLabel(latestApproval.status)}</Badge> : null}
                        {latestExecution ? <Badge variant="outline">{formatEnumLabel(latestExecution.status)}</Badge> : null}
                      </div>
                      {run.error ? <p className={styles.detailText}>{run.error}</p> : null}
                      {run.status === "SUCCEEDED" ? (
                        <p className={styles.detailText}>
                          <CheckCircle2 className="mr-2 inline h-4 w-4 text-emerald-500" />
                          Execução concluída com sucesso.
                        </p>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <p className={styles.emptyState}>Ainda não há runs suficientes para mostrar histórico.</p>
              )}
            </div>
          </section>

          <section className={styles.detailPanel}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.panelTitle}>Leitura rápida</h3>
            </div>

            <div className={styles.sectionStack}>
              <div className={styles.detailCell}>
                <span className={styles.metaValue}>
                  <Clock3 className="mr-2 inline h-4 w-4" />
                  Pendentes
                </span>
                <p className={styles.detailText}>{pendingApprovals.length} aguardando decisão agora.</p>
              </div>
              <div className={styles.detailCell}>
                <span className={styles.metaValue}>
                  <ShieldAlert className="mr-2 inline h-4 w-4" />
                  Guardrail
                </span>
                <p className={styles.detailText}>Toda ação sensível continua protegida por checkpoint humano.</p>
              </div>
              <div className={styles.detailCell}>
                <span className={styles.metaValue}>
                  <Sparkles className="mr-2 inline h-4 w-4" />
                  Objetivo
                </span>
                <p className={styles.detailText}>Acelerar o uso do agente sem abrir mão de controle e auditabilidade.</p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
