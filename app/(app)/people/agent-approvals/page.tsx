import { AgentApprovalStatus } from "@prisma/client";
import { CheckCircle2, Clock3, ShieldAlert, Sparkles } from "lucide-react";

import { reviewAgentApprovalAction } from "@/app/(app)/people/agent-approvals/actions";
import { AgentApprovalReviewForm } from "@/components/ai-agent/agent-approval-review-form";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/permissions";
import { listAgentApprovalRequests, listRecentAgentRuns } from "@/modules/ai-agent/queries";

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
    <div className="space-y-6">
      <PageHeader
        eyebrow="Agent approvals"
        title="Trust layer do agente corporativo"
        description="Acompanhe acoes assistidas de maior risco, aprove ou rejeite execucoes e mantenha trilha operacional do que a IA fez dentro do workspace."
      />

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="panel-hover">
          <CardHeader>
            <CardDescription>Pendencias agora</CardDescription>
            <CardTitle className="text-3xl">{pendingApprovals.length}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3 text-sm text-muted-foreground">
            <Clock3 className="h-4 w-4 text-amber-600" />
            Acoes aguardando decisao humana antes de executar.
          </CardContent>
        </Card>

        <Card className="panel-hover">
          <CardHeader>
            <CardDescription>Runs recentes</CardDescription>
            <CardTitle className="text-3xl">{recentRuns.length}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            Historico curto para revisar uso, execucao e confianca.
          </CardContent>
        </Card>

        <Card className="panel-hover">
          <CardHeader>
            <CardDescription>Objetivo da fila</CardDescription>
            <CardTitle className="text-xl">Agir com controle</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3 text-sm text-muted-foreground">
            <ShieldAlert className="h-4 w-4 text-rose-600" />
            Offboarding, mudancas sensiveis e acoes de alto risco nao passam sem checkpoint.
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Card className="panel-hover">
          <CardHeader>
            <CardTitle>Fila de aprovacoes pendentes</CardTitle>
            <CardDescription>Pedidos que o agente montou e dependem de um decisor antes de seguir.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingApprovals.length ? (
              pendingApprovals.map((approval) => (
                <article key={approval.id} className="rounded-[1.35rem] border border-border/70 bg-white/80 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-semibold">{approval.title}</p>
                        <Badge variant="outline">{formatEnumLabel(approval.riskLevel)}</Badge>
                        <Badge variant="outline">{formatEnumLabel(approval.status)}</Badge>
                      </div>
                      <p className="text-sm leading-6 text-muted-foreground">{approval.summary}</p>
                    </div>
                    <div className="text-right text-xs uppercase tracking-[0.22em] text-muted-foreground">
                      <p>{formatDateTime(approval.createdAt)}</p>
                      <p>{approval.expiresAt ? `Expira ${formatDateTime(approval.expiresAt)}` : "Sem expiracao"}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
                    <div className="rounded-[1rem] border border-border/70 bg-secondary/30 p-4">
                      <p className="section-intro">Solicitado por</p>
                      <p className="mt-2 font-semibold text-foreground">
                        {approval.requestedByUser?.name ?? approval.agentRun.startedByUser?.name ?? "Usuario do workspace"}
                      </p>
                      <p className="mt-1">{approval.requestedByUser?.email ?? approval.agentRun.startedByUser?.email ?? "Sem email disponivel"}</p>
                    </div>
                    <div className="rounded-[1rem] border border-border/70 bg-secondary/30 p-4">
                      <p className="section-intro">Contexto</p>
                      <p className="mt-2 font-semibold text-foreground">
                        {approval.agentRun.chatThread?.title ?? approval.agentRun.goal ?? "Execucao sem thread vinculada"}
                      </p>
                      <p className="mt-1">{approval.agentRun.chatThread ? "Originado no company chat" : "Originado fora do chat"}</p>
                    </div>
                  </div>

                  <AgentApprovalReviewForm action={reviewAgentApprovalAction} approvalRequestId={approval.id} />
                </article>
              ))
            ) : (
              <div className="rounded-[1.35rem] border border-dashed border-border bg-white/80 p-6 text-sm text-muted-foreground">
                Nenhuma aprovacao pendente no momento. O agente esta operando sem itens bloqueados por checkpoint humano.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="panel-hover">
          <CardHeader>
            <CardTitle>Execucoes recentes</CardTitle>
            <CardDescription>Visibilidade curta para entender o que o agente fez, aguardou ou falhou.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentRuns.length ? (
              recentRuns.map((run) => {
                const latestApproval = run.approvals[0];
                const latestExecution = run.executions[0];

                return (
                  <article key={run.id} className="rounded-[1.2rem] border border-border/70 bg-white/80 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2">
                        <p className="font-semibold">{run.summary ?? run.goal}</p>
                        <p className="text-sm text-muted-foreground">
                          {run.startedByUser?.name ?? "Agente"} · {formatDateTime(run.createdAt)}
                        </p>
                      </div>
                      <Badge variant="outline">{formatEnumLabel(run.status)}</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline">{formatEnumLabel(run.riskLevel)}</Badge>
                      <Badge variant="outline">{run.requiresApproval ? "Com aprovacao" : "Execucao direta"}</Badge>
                      {latestApproval ? <Badge variant="outline">{formatEnumLabel(latestApproval.status)}</Badge> : null}
                      {latestExecution ? <Badge variant="outline">{formatEnumLabel(latestExecution.status)}</Badge> : null}
                    </div>
                    {run.error ? <p className="mt-3 text-sm text-destructive">{run.error}</p> : null}
                    {run.status === "SUCCEEDED" ? (
                      <div className="mt-3 flex items-center gap-2 text-sm text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" />
                        Execucao concluida com sucesso.
                      </div>
                    ) : null}
                  </article>
                );
              })
            ) : (
              <div className="rounded-[1.2rem] border border-dashed border-border bg-white/80 p-5 text-sm text-muted-foreground">
                O historico recente do agente ainda nao tem runs suficientes para exibir aqui.
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
