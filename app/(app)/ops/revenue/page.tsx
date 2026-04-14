import { BillingStatus } from "@prisma/client";
import Link from "next/link";

import { reviewBillingUpgradeRequest } from "@/app/(app)/settings/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { requireRevenueOpsAccess } from "@/lib/billing/revenue-ops";
import { getRevenueOpsSnapshot } from "@/lib/billing/revenue-queries";

import styles from "@/components/operations/ops-workspace.module.css";

function formatMoney(amountInCents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(amountInCents / 100);
}

function getBillingStatusLabel(status: BillingStatus) {
  if (status === BillingStatus.ACTIVE) {
    return "Ativa";
  }

  if (status === BillingStatus.TRIALING) {
    return "Trial";
  }

  if (status === BillingStatus.PAST_DUE) {
    return "Em risco";
  }

  return "Inativa";
}

function getBillingStatusVariant(status: BillingStatus) {
  if (status === BillingStatus.ACTIVE) {
    return "success" as const;
  }

  if (status === BillingStatus.PAST_DUE) {
    return "warning" as const;
  }

  return "outline" as const;
}

export default async function RevenueOpsPage() {
  await requireRevenueOpsAccess();
  const snapshot = await getRevenueOpsSnapshot();

  const attentionOrganizations = snapshot.organizations
    .filter((item) => item.organization.billingStatus === BillingStatus.PAST_DUE || item.aiOverageRevenueCents > 0)
    .sort(
      (left, right) =>
        Number(right.organization.billingStatus === BillingStatus.PAST_DUE) -
          Number(left.organization.billingStatus === BillingStatus.PAST_DUE) ||
        right.projectedMonthlyRevenueCents - left.projectedMonthlyRevenueCents
    )
    .slice(0, 5);

  const topOrganizations = [...snapshot.organizations]
    .sort((left, right) => right.projectedMonthlyRevenueCents - left.projectedMonthlyRevenueCents)
    .slice(0, 8);

  const stats = [
    { label: "Organizações", value: snapshot.summary.organizations },
    { label: "Ativas", value: snapshot.summary.activeOrganizations },
    { label: "Trials", value: snapshot.summary.trialOrganizations },
    { label: "MRR projetado", value: formatMoney(snapshot.summary.projectedMrrCents) }
  ];

  return (
    <div className={styles.workspace}>
      <div className={styles.header}>
        <span className={styles.eyebrow}>Revenue ops</span>
        <h2 className={styles.title}>Receita, risco e aprovações</h2>
        <p className={styles.description}>
          Uma leitura interna mais direta da carteira, dos pedidos comerciais pendentes e do que merece atenção agora.
        </p>
      </div>

      <div className={styles.statRow}>
        {stats.map((stat) => (
          <div key={stat.label} className={styles.statPill}>
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </div>
        ))}
      </div>

      <div className={styles.toolbar}>
        <div className={styles.toolbarMeta}>
          <div className={styles.tabs}>
            <Button asChild variant="outline" size="sm">
              <Link href="/settings/billing">Abrir billing</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard">Voltar ao dashboard</Link>
            </Button>
          </div>
          <span className={styles.shortcutHint}>Sem painel ornamental: aprovação, risco e carteira no mesmo fluxo.</span>
        </div>
      </div>

      <div className={styles.body}>
        <section className={styles.listPanel}>
          <div className={styles.panelHeader}>
            <div className={styles.panelHeaderRow}>
              <div>
                <h3 className={styles.panelTitle}>Aprovações pendentes</h3>
                <p className={styles.panelDescription}>Pedidos comerciais aguardando decisão da operação de receita.</p>
              </div>
            </div>
          </div>

          <div className={styles.list}>
            {snapshot.pendingRequests.length ? (
              snapshot.pendingRequests.map((request) => (
                <div key={request.id} className={styles.row}>
                  <div className={styles.rowTop}>
                    <div className={styles.rowLead}>
                      <p className={styles.rowTitle}>{request.organization.name}</p>
                      <p className={styles.rowSubtitle}>
                        Solicitado por {request.requestedBy.name} ({request.requestedBy.email})
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="warning">Pendente</Badge>
                      <Badge variant="outline">
                        {request.targetPlan} · {request.targetInterval === "annual" ? "Anual" : "Mensal"}
                      </Badge>
                    </div>
                  </div>

                  <p className={styles.detailText}>
                    Seats extras: {request.requestedExtraSeats} · Pacotes de IA: {request.requestedAiAddonUnits}
                  </p>
                  {request.requestedContractedMrrCents ? (
                    <p className={styles.detailText}>MRR proposto: {formatMoney(request.requestedContractedMrrCents)}</p>
                  ) : null}
                  {request.note ? <p className={styles.detailText}>{request.note}</p> : null}

                  <div className="grid gap-3 xl:grid-cols-2">
                    <form action={reviewBillingUpgradeRequest.bind(null, request.id, "approve")} className="grid gap-3">
                      <Textarea
                        name="responseNote"
                        placeholder="Notas de aprovação"
                        className={styles.textareaCompact}
                        aria-label={`Notas de aprovação para ${request.organization.name}`}
                      />
                      <Button type="submit">Aprovar</Button>
                    </form>

                    <form action={reviewBillingUpgradeRequest.bind(null, request.id, "reject")} className="grid gap-3">
                      <Textarea
                        name="responseNote"
                        placeholder="Motivo da rejeição"
                        className={styles.textareaCompact}
                        aria-label={`Motivo da rejeição para ${request.organization.name}`}
                      />
                      <Button type="submit" variant="outline">
                        Rejeitar
                      </Button>
                    </form>
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.emptyWrap}>
                <p className={styles.emptyState}>Nenhum pedido pendente no momento.</p>
              </div>
            )}
          </div>
        </section>

        <aside className={styles.detailColumn}>
          <section className={styles.detailPanel}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.panelTitle}>Leitura da carteira</h3>
            </div>

            <div className={styles.detailGrid}>
              <div className={styles.detailCell}>
                <span className={styles.metaLabel}>ARR projetado</span>
                <span className={styles.metaValue}>{formatMoney(snapshot.summary.projectedArrCents)}</span>
              </div>
              <div className={styles.detailCell}>
                <span className={styles.metaLabel}>Pendências</span>
                <span className={styles.metaValue}>{snapshot.pendingRequests.length}</span>
              </div>
              <div className={styles.detailCell}>
                <span className={styles.metaLabel}>Past due</span>
                <span className={styles.metaValue}>{snapshot.summary.pastDueOrganizations}</span>
              </div>
              <div className={styles.detailCell}>
                <span className={styles.metaLabel}>MRR</span>
                <span className={styles.metaValue}>{formatMoney(snapshot.summary.projectedMrrCents)}</span>
              </div>
            </div>
          </section>

          <section className={styles.detailPanel}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.panelTitle}>Organizações em atenção</h3>
            </div>

            <div className={styles.sectionStack}>
              {attentionOrganizations.length ? (
                attentionOrganizations.map((item) => (
                  <div key={item.organization.id} className={styles.detailCell}>
                    <div className={styles.sectionHeader}>
                      <span className={styles.metaValue}>{item.organization.name}</span>
                      <Badge variant={getBillingStatusVariant(item.organization.billingStatus)}>
                        {getBillingStatusLabel(item.organization.billingStatus)}
                      </Badge>
                    </div>
                    <p className={styles.detailText}>Receita projetada {formatMoney(item.projectedMonthlyRevenueCents)}</p>
                    <p className={styles.detailText}>Overage de IA {formatMoney(item.aiOverageRevenueCents)}</p>
                  </div>
                ))
              ) : (
                <p className={styles.emptyState}>Nenhuma organização com risco relevante agora.</p>
              )}
            </div>
          </section>
        </aside>
      </div>

      <section className={styles.listPanel}>
        <div className={styles.panelHeader}>
          <div className={styles.panelHeaderRow}>
            <div>
              <h3 className={styles.panelTitle}>Carteira monitorada</h3>
              <p className={styles.panelDescription}>Leitura consolidada de receita, uso e status comercial por organização.</p>
            </div>
          </div>
        </div>

        <div className={styles.list}>
          {topOrganizations.map((item) => (
            <div key={item.organization.id} className={styles.row}>
              <div className={styles.rowTop}>
                <div className={styles.rowLead}>
                  <p className={styles.rowTitle}>{item.organization.name}</p>
                  <p className={styles.rowSubtitle}>
                    {item.organization.billingBillingEmail || "Sem e-mail de cobrança"} · {item.organization.billingCountryCode || "BR"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={getBillingStatusVariant(item.organization.billingStatus)}>
                    {getBillingStatusLabel(item.organization.billingStatus)}
                  </Badge>
                  <Badge variant="outline">{item.organization.billingPlan}</Badge>
                </div>
              </div>

              <div className={styles.detailGrid}>
                <div className={styles.detailCell}>
                  <span className={styles.metaLabel}>MRR</span>
                  <span className={styles.metaValue}>{formatMoney(item.estimatedMrrCents)}</span>
                </div>
                <div className={styles.detailCell}>
                  <span className={styles.metaLabel}>Receita projetada</span>
                  <span className={styles.metaValue}>{formatMoney(item.projectedMonthlyRevenueCents)}</span>
                </div>
                <div className={styles.detailCell}>
                  <span className={styles.metaLabel}>Seats</span>
                  <span className={styles.metaValue}>
                    {item.usage.teamMembers}/{item.effectiveLimits.teamMembers ?? "∞"}
                  </span>
                </div>
                <div className={styles.detailCell}>
                  <span className={styles.metaLabel}>IA</span>
                  <span className={styles.metaValue}>
                    {item.usage.monthlyAiAnalyses}/{item.effectiveLimits.monthlyAiAnalyses ?? "∞"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
