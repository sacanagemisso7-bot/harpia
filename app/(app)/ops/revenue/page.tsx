import { BillingStatus } from "@prisma/client";

import { reviewBillingUpgradeRequest } from "@/app/(app)/settings/actions";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRevenueOpsAccess } from "@/lib/billing/revenue-ops";
import { getRevenueOpsSnapshot } from "@/lib/billing/revenue-queries";

function formatMoney(amountInCents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(amountInCents / 100);
}

export default async function RevenueOpsPage() {
  await requireRevenueOpsAccess();
  const snapshot = await getRevenueOpsSnapshot();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Revenue Ops"
        title="Receita, risco e aprovacoes"
        description="Visao consolidada multi-tenant para operacao interna de billing, contratos e aprovacoes comerciais."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card className="panel-hover">
          <CardContent className="p-5">
            <p className="section-intro">Orgs</p>
            <p className="mt-3 text-3xl font-semibold">{snapshot.summary.organizations}</p>
          </CardContent>
        </Card>
        <Card className="panel-hover">
          <CardContent className="p-5">
            <p className="section-intro">Ativas</p>
            <p className="mt-3 text-3xl font-semibold">{snapshot.summary.activeOrganizations}</p>
          </CardContent>
        </Card>
        <Card className="panel-hover">
          <CardContent className="p-5">
            <p className="section-intro">Trials</p>
            <p className="mt-3 text-3xl font-semibold">{snapshot.summary.trialOrganizations}</p>
          </CardContent>
        </Card>
        <Card className="panel-hover">
          <CardContent className="p-5">
            <p className="section-intro">MRR projetado</p>
            <p className="mt-3 text-3xl font-semibold">{formatMoney(snapshot.summary.projectedMrrCents)}</p>
          </CardContent>
        </Card>
        <Card className="panel-hover">
          <CardContent className="p-5">
            <p className="section-intro">ARR projetado</p>
            <p className="mt-3 text-3xl font-semibold">{formatMoney(snapshot.summary.projectedArrCents)}</p>
          </CardContent>
        </Card>
      </section>

      <Card className="panel-hover">
        <CardHeader>
          <CardTitle>Aprovacoes pendentes</CardTitle>
          <CardDescription>Pedidos de upgrade ou condicao comercial aguardando resposta.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {snapshot.pendingRequests.length ? (
            snapshot.pendingRequests.map((request) => (
              <div key={request.id} className="rounded-[1.25rem] border border-border/70 bg-white/75 p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="font-semibold">{request.organization.name}</p>
                      <Badge variant="warning">{request.status}</Badge>
                      <Badge variant="outline">
                        {request.targetPlan} {request.targetInterval === "annual" ? "anual" : "mensal"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Solicitado por {request.requestedBy.name} ({request.requestedBy.email})
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Seats extras: {request.requestedExtraSeats} - Pacotes IA: {request.requestedAiAddonUnits}
                    </p>
                    {request.requestedContractedMrrCents ? (
                      <p className="text-sm text-muted-foreground">MRR proposto: {formatMoney(request.requestedContractedMrrCents)}</p>
                    ) : null}
                    {request.note ? <p className="text-sm text-muted-foreground">{request.note}</p> : null}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <form action={reviewBillingUpgradeRequest.bind(null, request.id, "approve")} className="space-y-3">
                      <textarea
                        name="responseNote"
                        className="min-h-24 w-full rounded-[1rem] border border-border bg-white px-4 py-3 text-sm"
                        placeholder="Notas de aprovacao"
                      />
                      <Button type="submit" className="w-full">
                        Aprovar
                      </Button>
                    </form>
                    <form action={reviewBillingUpgradeRequest.bind(null, request.id, "reject")} className="space-y-3">
                      <textarea
                        name="responseNote"
                        className="min-h-24 w-full rounded-[1rem] border border-border bg-white px-4 py-3 text-sm"
                        placeholder="Motivo da rejeicao"
                      />
                      <Button type="submit" variant="outline" className="w-full">
                        Rejeitar
                      </Button>
                    </form>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[1.25rem] border border-dashed border-border bg-white/75 p-5 text-sm text-muted-foreground">
              Nenhum pedido pendente no momento.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="panel-hover">
        <CardHeader>
          <CardTitle>Tenants monitorados</CardTitle>
          <CardDescription>Leitura consolidada de receita, overage de IA e risco operacional por organizacao.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {snapshot.organizations.map((item) => (
            <div key={item.organization.id} className="rounded-[1.25rem] border border-border/70 bg-white/75 p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="font-semibold">{item.organization.name}</p>
                    <Badge
                      variant={
                        item.organization.billingStatus === BillingStatus.PAST_DUE
                          ? "warning"
                          : item.organization.billingStatus === BillingStatus.ACTIVE
                            ? "success"
                            : "outline"
                      }
                    >
                      {item.organization.billingStatus}
                    </Badge>
                    <Badge variant="outline">{item.organization.billingPlan}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {item.organization.billingBillingEmail || "Sem email de cobranca"} - {item.organization.billingCountryCode || "BR"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Seats: {item.usage.teamMembers}/{item.effectiveLimits.teamMembers ?? "inf"} - IA: {item.usage.monthlyAiAnalyses}/
                    {item.effectiveLimits.monthlyAiAnalyses ?? "inf"}
                  </p>
                </div>
                <div className="grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
                  <div className="rounded-[1rem] border border-border/70 bg-white px-4 py-3">
                    MRR: <span className="font-medium text-foreground">{formatMoney(item.estimatedMrrCents)}</span>
                  </div>
                  <div className="rounded-[1rem] border border-border/70 bg-white px-4 py-3">
                    Overage IA: <span className="font-medium text-foreground">{formatMoney(item.aiOverageRevenueCents)}</span>
                  </div>
                  <div className="rounded-[1rem] border border-border/70 bg-white px-4 py-3">
                    Receita proj.: <span className="font-medium text-foreground">{formatMoney(item.projectedMonthlyRevenueCents)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
