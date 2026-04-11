import { BillingPlan, BillingStatus } from "@prisma/client";
import Link from "next/link";
import { ArrowRight, CreditCard, FileText, Receipt, Sparkles } from "lucide-react";

import {
  createBillingCheckout,
  createBillingUpgradeRequest,
  openBillingPortal,
  startOrganizationTrial,
  updateBillingCommercialTerms,
  updateBillingProfile
} from "@/app/(app)/settings/actions";
import { PageHeader } from "@/components/layout/page-header";
import { BillingAddonsForm } from "@/components/settings/billing-addons-form";
import { BillingProfileForm } from "@/components/settings/billing-profile-form";
import { BillingUpgradeRequestForm } from "@/components/settings/billing-upgrade-request-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/permissions";
import { BILLING_FEATURE_LABELS, getPlanFeatures } from "@/lib/billing/features";
import { getBillingPageData } from "@/lib/billing/queries";
import { BILLING_STATUS_LABELS, formatLimitValue, getPlanDefinition, isBillingActive } from "@/lib/billing/plans";
import { isStripeConfigured, isStripePlanAvailable } from "@/lib/billing/stripe";

import styles from "../../workspace-expansion.module.css";

const checkoutPlans = [BillingPlan.STARTER, BillingPlan.GROWTH, BillingPlan.BUSINESS];

function formatMoney(amountInCents: number, currency: string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency.toUpperCase()
  }).format(amountInCents / 100);
}

function getBillingNotice(code?: string) {
  switch (code) {
    case "success":
      return {
        variant: "success" as const,
        message: "Checkout concluido. A sincronizacao da assinatura deve aparecer aqui em instantes."
      };
    case "cancelled":
      return {
        variant: "warning" as const,
        message: "Checkout cancelado. Você pode retomar quando quiser."
      };
    case "trial-started":
      return {
        variant: "success" as const,
        message: "Trial iniciado com sucesso."
      };
    case "trial-already-running":
      return {
        variant: "warning" as const,
        message: "Ja existe um trial ativo para este workspace."
      };
    case "already-active":
      return {
        variant: "outline" as const,
        message: "Sua organização ja possui uma assinatura ativa."
      };
    case "portal":
      return {
        variant: "outline" as const,
        message: "Você voltou do portal do cliente do Stripe."
      };
    case "job-limit":
    case "candidate-limit":
      return {
        variant: "warning" as const,
        message: "Seu plano atual atingiu um limite operacional. Abra o billing para fazer upgrade."
      };
    default:
      return null;
  }
}

export default async function BillingPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePermission("manage_workspace");
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const billingNotice = getBillingNotice(
    typeof resolvedSearchParams?.billing === "string" ? resolvedSearchParams.billing : undefined
  );
  const billing = await getBillingPageData(user.organizationId);

  if (!billing) {
    return null;
  }

  const currentPlan = getPlanDefinition(billing.organization.billingPlan);
  const billingIsActive = isBillingActive(billing.organization.billingStatus, billing.organization.billingTrialEndsAt);
  const currentFeatures = getPlanFeatures(billing.organization.billingPlan);

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Billing"
        title="Plano, trial e histórico de cobranca"
        description="Controle assinatura, acompanhe uso do workspace e veja invoices em um lugar mais claro para operar."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/pricing">Ver pricing</Link>
            </Button>
            <form action={openBillingPortal}>
              <Button type="submit" disabled={!billing.organization.stripeCustomerId}>
                Abrir portal Stripe
              </Button>
            </form>
          </>
        }
      />

      {billingNotice ? (
        <div className={styles.panel}>
          <div className={styles.rowBetween}>
            <div className={styles.itemLead}>
              <strong className={styles.itemTitle}>Atualizacao de billing</strong>
              <span className={styles.itemDescription}>{billingNotice.message}</span>
            </div>
            <Badge variant={billingNotice.variant}>{billingNotice.variant === "success" ? "OK" : "Info"}</Badge>
          </div>
        </div>
      ) : null}

      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Plano</span>
          <strong className={styles.statValue}>{currentPlan.label}</strong>
          <span className={styles.statHint}>{currentPlan.monthlyPriceLabel}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>MRR estimado</span>
          <strong className={styles.statValue}>{formatMoney(billing.metrics.estimatedMrrCents, "BRL")}</strong>
          <span className={styles.statHint}>Receita mensal projetada do workspace.</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>ARR estimado</span>
          <strong className={styles.statValue}>{formatMoney(billing.metrics.estimatedArrCents, "BRL")}</strong>
          <span className={styles.statHint}>Receita anual projetada com o estado atual.</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Overage IA</span>
          <strong className={styles.statValue}>{formatMoney(billing.metrics.aiOverageRevenueCents, "BRL")}</strong>
              <span className={styles.statHint}>{billing.metrics.aiOverageAnalyses} análises acima da franquia.</span>
        </div>
      </section>

      <section className={styles.detailLayout}>
        <div className={styles.column}>
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Current subscription</span>
              <h2 className={styles.panelTitle}>Assinatura atual</h2>
              <p className={styles.panelDescription}>Visão executiva do plano e do estado da cobranca.</p>
            </div>
            <div className={styles.tagWrap}>
              <Badge variant={billingIsActive ? "success" : "warning"}>{BILLING_STATUS_LABELS[billing.organization.billingStatus]}</Badge>
              <Badge variant="outline">{currentPlan.label}</Badge>
              <span className={styles.tagPill}>{currentPlan.monthlyPriceLabel}</span>
            </div>
            <div className={styles.surfaceMuted}>
              <strong className={styles.itemTitle}>{currentPlan.description}</strong>
              <span className={styles.itemDescription}>
                {billing.organization.billingStatus === BillingStatus.TRIALING && billing.organization.billingTrialEndsAt
                  ? `Trial ativo ate ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(billing.organization.billingTrialEndsAt)}.`
                  : billing.organization.billingCurrentPeriodEndsAt
                    ? `Período atual ate ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(billing.organization.billingCurrentPeriodEndsAt)}.`
                    : "Ainda não ha uma assinatura ativa ou trial corrente registrado."}
              </span>
            </div>
            <div className={styles.actionCluster}>
              <form action={startOrganizationTrial}>
                <Button type="submit" variant="outline">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Iniciar trial
                </Button>
              </form>
              <div className={styles.subGrid2}>
                <form action={createBillingCheckout.bind(null, BillingPlan.GROWTH, "monthly")}>
                  <Button type="submit" disabled={!isStripePlanAvailable(BillingPlan.GROWTH)} className="w-full">
                    Upgrade mensal
                  </Button>
                </form>
                <form action={createBillingCheckout.bind(null, BillingPlan.GROWTH, "annual")}>
                  <Button type="submit" variant="outline" disabled={!isStripePlanAvailable(BillingPlan.GROWTH, "annual")} className="w-full">
                    Growth anual
                  </Button>
                </form>
              </div>
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Workspace usage</span>
              <h2 className={styles.panelTitle}>Uso do workspace</h2>
            </div>
            <div className={styles.infoGrid}>
              <div className={styles.infoTile}>
                <strong>Vagas ativas</strong>
                <span>{billing.usage.activeJobs} · limite {formatLimitValue(billing.effectiveLimits.activeJobs)}</span>
              </div>
              <div className={styles.infoTile}>
                <strong>Membros</strong>
                <span>{billing.usage.teamMembers} · limite {formatLimitValue(billing.effectiveLimits.teamMembers)}</span>
              </div>
              <div className={styles.infoTile}>
                <strong>IA no mes</strong>
                <span>{billing.usage.monthlyAiAnalyses} · limite {formatLimitValue(billing.effectiveLimits.monthlyAiAnalyses)}</span>
              </div>
              <div className={styles.infoTile}>
                <strong>Candidatos no mes</strong>
                <span>{billing.usage.monthlyCandidates} · limite {formatLimitValue(billing.effectiveLimits.monthlyCandidates)}</span>
              </div>
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Checkout and upgrades</span>
              <h2 className={styles.panelTitle}>Planos disponíveis</h2>
            </div>
            <div className={styles.subGrid3}>
              {checkoutPlans.map((plan) => {
                const definition = getPlanDefinition(plan);
                const isCurrent = billing.organization.billingPlan === plan;
                const canSelfServe = isStripePlanAvailable(plan);

                return (
                  <div key={plan} className={styles.listItem}>
                    <div className={styles.rowBetween}>
                      <strong className={styles.itemTitle}>{definition.label}</strong>
                      {isCurrent ? <Badge variant="success">Atual</Badge> : null}
                    </div>
                    <span className={styles.itemDescription}>{definition.monthlyPriceLabel}</span>
                    <span className={styles.itemDescription}>{definition.annualPriceLabel}</span>
                    <span className={styles.itemDescription}>{definition.description}</span>
                    <div className={styles.actionCluster}>
                      {canSelfServe ? (
                        <>
                          <form action={createBillingCheckout.bind(null, plan, "monthly")}>
                            <Button type="submit" variant={isCurrent ? "outline" : "default"} className="w-full">
                              Mensal
                            </Button>
                          </form>
                          <form action={createBillingCheckout.bind(null, plan, "annual")}>
                            <Button type="submit" variant="outline" disabled={!isStripePlanAvailable(plan, "annual")} className="w-full">
                              Anual
                            </Button>
                          </form>
                        </>
                      ) : (
                        <Button asChild variant="outline">
                          <Link href="/book-demo">
                            Falar com vendas
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Commercial layer</span>
              <h2 className={styles.panelTitle}>Seats e add-ons de IA</h2>
            </div>
            <div className={styles.infoGrid}>
              <div className={styles.infoTile}>
                <strong>Seats extras</strong>
                <span>{billing.organization.billingExtraSeats}</span>
              </div>
              <div className={styles.infoTile}>
                <strong>Pacotes IA</strong>
                <span>{billing.organization.billingAiAddonUnits}</span>
              </div>
              <div className={styles.infoTile}>
                <strong>MRR contratado</strong>
                <span>{billing.organization.billingContractedMrrCents ? formatMoney(billing.organization.billingContractedMrrCents, "BRL") : "Automatico"}</span>
              </div>
            </div>
            <div className={styles.surfaceMuted}>
              <BillingAddonsForm
                action={updateBillingCommercialTerms}
                defaultValues={{
                  billingExtraSeats: billing.organization.billingExtraSeats,
                  billingAiAddonUnits: billing.organization.billingAiAddonUnits,
                  billingContractedMrrCents: billing.organization.billingContractedMrrCents ?? 0
                }}
              />
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Workspace profile</span>
              <h2 className={styles.panelTitle}>Perfil fiscal e de cobranca</h2>
            </div>
            <div className={styles.surfaceMuted}>
              <BillingProfileForm
                action={updateBillingProfile}
                defaultValues={{
                  billingLegalName: billing.organization.billingLegalName ?? billing.organization.name,
                  billingTaxId: billing.organization.billingTaxId ?? "",
                  billingBillingEmail: billing.organization.billingBillingEmail ?? "",
                  billingCountryCode: billing.organization.billingCountryCode ?? "BR",
                  billingAiOverageRateCents: billing.organization.billingAiOverageRateCents ?? 120
                }}
              />
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Upgrade requests</span>
              <h2 className={styles.panelTitle}>Pedido de upgrade ou contrato customizado</h2>
            </div>
            <div className={styles.surfaceMuted}>
              <BillingUpgradeRequestForm action={createBillingUpgradeRequest} />
            </div>
            {billing.requests.length ? (
              <div className={styles.list}>
                {billing.requests.map((request) => (
                  <div key={request.id} className={styles.listItem}>
                    <div className={styles.itemHeader}>
                      <div className={styles.itemLead}>
                        <strong className={styles.itemTitle}>
                          {request.targetPlan} {request.targetInterval === "annual" ? "anual" : "mensal"}
                        </strong>
                        <span className={styles.itemSubtitle}>
                          Solicitado por {request.requestedBy.name} em{" "}
                          {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(request.createdAt)}
                        </span>
                      </div>
                      <Badge
                        variant={
                          request.status === "APPROVED"
                            ? "success"
                            : request.status === "REJECTED"
                              ? "destructive"
                              : "warning"
                        }
                      >
                        {request.status}
                      </Badge>
                    </div>
                    <span className={styles.itemDescription}>
                      Seats extras: {request.requestedExtraSeats} · Pacotes IA: {request.requestedAiAddonUnits}
                    </span>
                    {request.note ? <span className={styles.itemDescription}>{request.note}</span> : null}
                    {request.responseNote ? <span className={styles.itemDescription}>Resposta: {request.responseNote}</span> : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>Nenhum pedido de upgrade enviado ainda.</div>
            )}
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Invoices</span>
              <h2 className={styles.panelTitle}>Histórico de cobranca</h2>
            </div>
            {!currentFeatures.includes("invoice_history") ? (
              <div className={styles.surfaceMuted}>Histórico detalhado de invoices fica disponível a partir do plano Growth.</div>
            ) : billing.invoices.length ? (
              <div className={styles.list}>
                {billing.invoices.map((invoice) => (
                  <div key={invoice.id} className={styles.listItem}>
                    <div className={styles.itemHeader}>
                      <div className={styles.itemLead}>
                        <strong className={styles.itemTitle}>{invoice.number || invoice.id}</strong>
                        <span className={styles.itemSubtitle}>
                          Criada em {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(invoice.created * 1000))}
                        </span>
                      </div>
                      <div className={styles.tagWrap}>
                        <Badge variant={invoice.status === "paid" ? "success" : "warning"}>{invoice.status || "unknown"}</Badge>
                        <span className={styles.tagPill}>{formatMoney(invoice.amount_paid || invoice.amount_due, invoice.currency)}</span>
                      </div>
                    </div>
                    <div className={styles.rowBetween}>
                      <div className={styles.tagWrap}>
                        {invoice.hosted_invoice_url ? (
                          <Button asChild variant="outline" size="sm">
                            <a href={invoice.hosted_invoice_url} target="_blank" rel="noreferrer">
                              <FileText className="mr-2 h-4 w-4" />
                              Abrir fatura
                            </a>
                          </Button>
                        ) : null}
                        {invoice.invoice_pdf ? (
                          <Button asChild variant="ghost" size="sm">
                            <a href={invoice.invoice_pdf} target="_blank" rel="noreferrer">
                              PDF
                            </a>
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.surfaceMuted}>
                {isStripeConfigured()
                  ? "Nenhuma invoice encontrada ainda para este workspace."
                  : "Configure Stripe para exibir invoices e histórico de cobranca aqui."}
              </div>
            )}

            {currentFeatures.includes("invoice_history") ? (
              <div className={styles.actionCluster}>
                <Button asChild variant="outline">
                  <Link href="/api/billing/invoices/export">Exportar CSV</Link>
                </Button>
              </div>
            ) : null}
          </div>
        </div>

        <aside className={styles.stickyAside}>
          <div className={styles.spotlight}>
            <span className={styles.panelEyebrow}>Billing status</span>
            <strong className={styles.spotlightValue}>{BILLING_STATUS_LABELS[billing.organization.billingStatus]}</strong>
            <p className={styles.panelDescription}>Estado atual da cobranca e da assinatura do workspace.</p>
          </div>

          <div className={styles.panel}>
            <div className={styles.metricStack}>
              <div className={styles.metricRow}>
                <span>Trial iniciado</span>
                <strong>
                  {billing.metrics.trialStartedAt
                    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(billing.metrics.trialStartedAt)
                    : "Não"}
                </strong>
              </div>
              <div className={styles.metricRow}>
                <span>Primeira ativacao</span>
                <strong>
                  {billing.metrics.activatedAt
                    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(billing.metrics.activatedAt)
                    : "Ainda não"}
                </strong>
              </div>
              <div className={styles.metricRow}>
                <span>Dias para converter</span>
                <strong>{billing.metrics.daysToConvert ?? "-"}</strong>
              </div>
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.itemHeader}>
              <div className={styles.itemLead}>
                <span className={styles.panelEyebrow}>Stripe</span>
                <h3 className={styles.panelTitle}>Integracao</h3>
              </div>
              <span className={styles.iconLead}>
                <CreditCard className="h-4 w-4" />
              </span>
            </div>
            <div className={styles.surfaceMuted}>
              <span className={styles.itemDescription}>
                {isStripeConfigured()
                  ? "Configurado para checkout, portal do cliente e histórico de invoices."
                  : "Ainda não configurado. O produto continua com trial e pricing, mas sem cobranca automatica."}
              </span>
            </div>
            <div className={styles.surfaceMuted}>
              <span className={styles.itemDescription}>
                Customer: {billing.organization.stripeCustomerId ?? "Não criado"}<br />
                Subscription: {billing.organization.stripeSubscriptionId ?? "Não criada"}
              </span>
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.itemHeader}>
              <div className={styles.itemLead}>
                <span className={styles.panelEyebrow}>Features</span>
                <h3 className={styles.panelTitle}>Plano atual</h3>
              </div>
              <span className={styles.iconLead}>
                <Receipt className="h-4 w-4" />
              </span>
            </div>
            <div className={styles.list}>
              {Object.entries(BILLING_FEATURE_LABELS).map(([feature, label]) => {
                const enabled = currentFeatures.includes(feature as keyof typeof BILLING_FEATURE_LABELS);

                return (
                  <div key={feature} className={styles.listItem}>
                    <div className={styles.rowBetween}>
                      <strong className={styles.itemTitle}>{label}</strong>
                      <Badge variant={enabled ? "success" : "outline"}>{enabled ? "Ativo" : "Bloqueado"}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
