import { BillingStatus } from "@prisma/client";

import { reviewBillingUpgradeRequest } from "@/app/(app)/settings/actions";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireRevenueOpsAccess } from "@/lib/billing/revenue-ops";
import { getRevenueOpsSnapshot } from "@/lib/billing/revenue-queries";

import styles from "../../workspace-expansion.module.css";

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
    <div className={styles.page}>
      <PageHeader
        eyebrow="Revenue Ops"
        title="Receita, risco e aprovações"
        description="Visão consolidada multi-tenant para operação interna de billing, contratos e aprovações comerciais."
      />

      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Orgs</span>
          <strong className={styles.statValue}>{snapshot.summary.organizations}</strong>
          <span className={styles.statHint}>Tenants monitorados nesta camada interna.</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Ativas</span>
          <strong className={styles.statValue}>{snapshot.summary.activeOrganizations}</strong>
          <span className={styles.statHint}>Organizações com operação comercial saudavel.</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Trials</span>
          <strong className={styles.statValue}>{snapshot.summary.trialOrganizations}</strong>
          <span className={styles.statHint}>Contas ainda no período de avaliação.</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>MRR projetado</span>
          <strong className={styles.statValue}>{formatMoney(snapshot.summary.projectedMrrCents)}</strong>
          <span className={styles.statHint}>Receita mensal estimada com a base atual.</span>
        </div>
      </section>

      <section className={styles.detailLayout}>
        <div className={styles.column}>
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Pending approvals</span>
              <h2 className={styles.panelTitle}>Aprovações pendentes</h2>
              <p className={styles.panelDescription}>Pedidos de upgrade ou condicao comercial aguardando resposta.</p>
            </div>
            {snapshot.pendingRequests.length ? (
              <div className={styles.list}>
                {snapshot.pendingRequests.map((request) => (
                  <div key={request.id} className={styles.listItem}>
                    <div className={styles.itemHeader}>
                      <div className={styles.itemLead}>
                        <strong className={styles.itemTitle}>{request.organization.name}</strong>
                        <span className={styles.itemSubtitle}>
                          Solicitado por {request.requestedBy.name} ({request.requestedBy.email})
                        </span>
                      </div>
                      <div className={styles.tagWrap}>
                        <Badge variant="warning">{request.status}</Badge>
                        <Badge variant="outline">
                          {request.targetPlan} {request.targetInterval === "annual" ? "anual" : "mensal"}
                        </Badge>
                      </div>
                    </div>
                    <span className={styles.itemDescription}>
                      Seats extras: {request.requestedExtraSeats} · Pacotes IA: {request.requestedAiAddonUnits}
                    </span>
                    {request.requestedContractedMrrCents ? (
                      <span className={styles.itemDescription}>MRR proposto: {formatMoney(request.requestedContractedMrrCents)}</span>
                    ) : null}
                    {request.note ? <span className={styles.itemDescription}>{request.note}</span> : null}
                    <div className={styles.subGrid2}>
                      <form action={reviewBillingUpgradeRequest.bind(null, request.id, "approve")} className={styles.actionCluster}>
                        <textarea name="responseNote" className={styles.textarea} placeholder="Notas de aprovação" />
                        <Button type="submit">Aprovar</Button>
                      </form>
                      <form action={reviewBillingUpgradeRequest.bind(null, request.id, "reject")} className={styles.actionCluster}>
                        <textarea name="responseNote" className={styles.textarea} placeholder="Motivo da rejeicao" />
                        <Button type="submit" variant="outline">
                          Rejeitar
                        </Button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>Nenhum pedido pendente no momento.</div>
            )}
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Tenant watch</span>
              <h2 className={styles.panelTitle}>Tenants monitorados</h2>
              <p className={styles.panelDescription}>Leitura consolidada de receita, overage de IA e risco operacional por organização.</p>
            </div>
            <div className={styles.list}>
              {snapshot.organizations.map((item) => (
                <div key={item.organization.id} className={styles.listItem}>
                  <div className={styles.itemHeader}>
                    <div className={styles.itemLead}>
                      <strong className={styles.itemTitle}>{item.organization.name}</strong>
                      <span className={styles.itemSubtitle}>
                        {item.organization.billingBillingEmail || "Sem email de cobranca"} - {item.organization.billingCountryCode || "BR"}
                      </span>
                    </div>
                    <div className={styles.tagWrap}>
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
                  </div>
                  <span className={styles.itemDescription}>
                    Seats: {item.usage.teamMembers}/{item.effectiveLimits.teamMembers ?? "inf"} · IA: {item.usage.monthlyAiAnalyses}/{item.effectiveLimits.monthlyAiAnalyses ?? "inf"}
                  </span>
                  <div className={styles.subGrid3}>
                    <div className={styles.infoTile}>
                      <strong>MRR</strong>
                      <span>{formatMoney(item.estimatedMrrCents)}</span>
                    </div>
                    <div className={styles.infoTile}>
                      <strong>Overage IA</strong>
                      <span>{formatMoney(item.aiOverageRevenueCents)}</span>
                    </div>
                    <div className={styles.infoTile}>
                      <strong>Receita proj.</strong>
                      <span>{formatMoney(item.projectedMonthlyRevenueCents)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className={styles.stickyAside}>
          <div className={styles.spotlight}>
            <span className={styles.panelEyebrow}>ARR</span>
            <strong className={styles.spotlightValue}>{formatMoney(snapshot.summary.projectedArrCents)}</strong>
            <p className={styles.panelDescription}>Receita anual projetada com base no estado atual da carteira.</p>
          </div>
          <div className={styles.panel}>
            <div className={styles.metricStack}>
              <div className={styles.metricRow}>
                <span>Ativas</span>
                <strong>{snapshot.summary.activeOrganizations}</strong>
              </div>
              <div className={styles.metricRow}>
                <span>Trials</span>
                <strong>{snapshot.summary.trialOrganizations}</strong>
              </div>
              <div className={styles.metricRow}>
                <span>Pendencias</span>
                <strong>{snapshot.pendingRequests.length}</strong>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
