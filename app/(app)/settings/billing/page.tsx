import { BillingPlan, BillingStatus } from "@prisma/client";
import Link from "next/link";
import { ArrowRight, CreditCard, FileText, Receipt, Sparkles } from "lucide-react";

import styles from "@/components/operations/ops-workspace.module.css";
import {
  createBillingCheckout,
  createBillingUpgradeRequest,
  openBillingPortal,
  startOrganizationTrial,
  updateBillingCommercialTerms,
  updateBillingProfile
} from "@/app/(app)/settings/actions";
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
        message: "Checkout concluído. A sincronização da assinatura deve aparecer aqui em instantes."
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
        message: "Já existe um trial ativo para este workspace."
      };
    case "already-active":
      return {
        variant: "outline" as const,
        message: "Sua organização já possui uma assinatura ativa."
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
        message: "Seu plano atual atingiu um limite operacional. Abra Plano e uso para fazer upgrade."
      };
    default:
      return null;
  }
}

function formatRequestStatus(status: string) {
  if (status === "APPROVED") return "Aprovado";
  if (status === "REJECTED") return "Rejeitado";
  if (status === "PENDING") return "Pendente";
  return status;
}

export default async function BillingPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePermission("manage_workspace");
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const billingNotice = getBillingNotice(typeof resolvedSearchParams?.billing === "string" ? resolvedSearchParams.billing : undefined);
  const billing = await getBillingPageData(user.organizationId);

  if (!billing) {
    return null;
  }

  const currentPlan = getPlanDefinition(billing.organization.billingPlan);
  const billingIsActive = isBillingActive(billing.organization.billingStatus, billing.organization.billingTrialEndsAt);
  const currentFeatures = getPlanFeatures(billing.organization.billingPlan);

  const stats = [
    { label: "Plano", value: currentPlan.label },
    { label: "MRR estimado", value: formatMoney(billing.metrics.estimatedMrrCents, "BRL") },
    { label: "ARR estimado", value: formatMoney(billing.metrics.estimatedArrCents, "BRL") },
    { label: "Overage IA", value: formatMoney(billing.metrics.aiOverageRevenueCents, "BRL") }
  ];

  return (
    <div className={styles.workspace}>
      <div className={styles.header}>
        <span className={styles.eyebrow}>Plano e uso</span>
        <h2 className={styles.title}>Plano, trial e cobrança</h2>
        <p className={styles.description}>Assinatura, uso, faturas e pedidos comerciais em um fluxo claro.</p>
      </div>

      {billingNotice ? (
        <div className={styles.toolbar}>
          <div className={styles.toolbarMeta}>
            <strong className={styles.panelTitle}>Atualização do plano</strong>
            <span className={styles.shortcutHint}>{billingNotice.message}</span>
          </div>
          <Badge variant={billingNotice.variant}>{billingNotice.variant === "success" ? "OK" : "Info"}</Badge>
        </div>
      ) : null}

      <div className={styles.statRow}>
        {stats.map((stat) => (
          <div key={stat.label} className={styles.statPill}>
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </div>
        ))}
      </div>

      <div className={styles.workflowGuide}>
        <span>
          <strong>1.</strong> Confira limites
        </span>
        <span>
          <strong>2.</strong> Ajuste plano ou add-ons
        </span>
        <span>
          <strong>3.</strong> Revise faturas
        </span>
      </div>

      <div className={styles.body}>
        <div className={styles.detailColumn}>
          <section className={styles.detailPanel}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.panelTitle}>Assinatura atual</h3>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={billingIsActive ? "success" : "warning"}>{BILLING_STATUS_LABELS[billing.organization.billingStatus]}</Badge>
                <Badge variant="outline">{currentPlan.label}</Badge>
              </div>
            </div>

            <div className={styles.detailCell}>
              <span className={styles.metaLabel}>Plano</span>
              <p className={styles.detailText}>{currentPlan.description}</p>
              <p className={styles.detailText}>
                {billing.organization.billingStatus === BillingStatus.TRIALING && billing.organization.billingTrialEndsAt
                  ? `Trial ativo até ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(billing.organization.billingTrialEndsAt)}.`
                  : billing.organization.billingCurrentPeriodEndsAt
                    ? `Período atual até ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(
                        billing.organization.billingCurrentPeriodEndsAt
                      )}.`
                    : "Ainda não há assinatura ativa ou trial corrente registrado."}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <form action={startOrganizationTrial}>
                <Button type="submit" variant="outline">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Iniciar trial
                </Button>
              </form>

              <form action={openBillingPortal}>
                <Button type="submit" disabled={!billing.organization.stripeCustomerId}>
                  Abrir portal Stripe
                </Button>
              </form>

              <Button asChild variant="outline">
                <Link href="/pricing">Ver preços</Link>
              </Button>
            </div>
          </section>

          <section className={styles.detailPanel}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.panelTitle}>Uso do workspace</h3>
            </div>

            <div className={styles.detailGrid}>
              <div className={styles.detailCell}>
                <span className={styles.metaLabel}>Vagas ativas</span>
                <span className={styles.metaValue}>
                  {billing.usage.activeJobs} / {formatLimitValue(billing.effectiveLimits.activeJobs)}
                </span>
              </div>
              <div className={styles.detailCell}>
                <span className={styles.metaLabel}>Membros</span>
                <span className={styles.metaValue}>
                  {billing.usage.teamMembers} / {formatLimitValue(billing.effectiveLimits.teamMembers)}
                </span>
              </div>
              <div className={styles.detailCell}>
                <span className={styles.metaLabel}>IA no mês</span>
                <span className={styles.metaValue}>
                  {billing.usage.monthlyAiAnalyses} / {formatLimitValue(billing.effectiveLimits.monthlyAiAnalyses)}
                </span>
              </div>
              <div className={styles.detailCell}>
                <span className={styles.metaLabel}>Candidatos no mês</span>
                <span className={styles.metaValue}>
                  {billing.usage.monthlyCandidates} / {formatLimitValue(billing.effectiveLimits.monthlyCandidates)}
                </span>
              </div>
            </div>
          </section>

          <section className={styles.listPanel}>
            <div className={styles.panelHeader}>
              <div className={styles.panelHeaderRow}>
                <div>
                  <h3 className={styles.panelTitle}>Planos disponíveis</h3>
                  <p className={styles.panelDescription}>Assine direto quando houver self-serve ou vá para vendas quando necessário.</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 p-4 xl:grid-cols-3">
              {checkoutPlans.map((plan) => {
                const definition = getPlanDefinition(plan);
                const isCurrent = billing.organization.billingPlan === plan;
                const canSelfServe = isStripePlanAvailable(plan);

                return (
                  <div key={plan} className={styles.detailCell}>
                    <div className={styles.sectionHeader}>
                      <span className={styles.metaValue}>{definition.label}</span>
                      {isCurrent ? <Badge variant="success">Atual</Badge> : null}
                    </div>
                    <p className={styles.detailText}>{definition.monthlyPriceLabel}</p>
                    <p className={styles.detailText}>{definition.annualPriceLabel}</p>
                    <p className={styles.detailText}>{definition.description}</p>

                    <div className="mt-3 grid gap-2">
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
          </section>

          <section className={styles.formPanel}>
            <div className={styles.panelHeader}>
              <h3 className={styles.panelTitle}>Membros extras e IA</h3>
              <p className={styles.panelDescription}>Ajuste a camada comercial sem sair desta tela.</p>
            </div>

            <BillingAddonsForm
              action={updateBillingCommercialTerms}
              defaultValues={{
                billingExtraSeats: billing.organization.billingExtraSeats,
                billingAiAddonUnits: billing.organization.billingAiAddonUnits,
                billingContractedMrrCents: billing.organization.billingContractedMrrCents ?? 0
              }}
            />
          </section>

          <section className={styles.formPanel}>
            <div className={styles.panelHeader}>
              <h3 className={styles.panelTitle}>Perfil fiscal</h3>
              <p className={styles.panelDescription}>Dados usados para cobrança, fiscalidade e uso adicional.</p>
            </div>

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
          </section>
        </div>

        <aside className={styles.detailColumn}>
          <section className={styles.detailPanel}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.panelTitle}>Saúde da assinatura</h3>
            </div>

            <div className={styles.detailGrid}>
              <div className={styles.detailCell}>
                <span className={styles.metaLabel}>Status</span>
                <span className={styles.metaValue}>{BILLING_STATUS_LABELS[billing.organization.billingStatus]}</span>
              </div>
              <div className={styles.detailCell}>
                <span className={styles.metaLabel}>Trial iniciado</span>
                <span className={styles.metaValue}>
                  {billing.metrics.trialStartedAt
                    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(billing.metrics.trialStartedAt)
                    : "Não"}
                </span>
              </div>
              <div className={styles.detailCell}>
                <span className={styles.metaLabel}>Primeira ativação</span>
                <span className={styles.metaValue}>
                  {billing.metrics.activatedAt
                    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(billing.metrics.activatedAt)
                    : "Ainda não"}
                </span>
              </div>
              <div className={styles.detailCell}>
                <span className={styles.metaLabel}>Dias para converter</span>
                <span className={styles.metaValue}>{billing.metrics.daysToConvert ?? "-"}</span>
              </div>
            </div>
          </section>

          <section className={styles.detailPanel}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.panelTitle}>Integração Stripe</h3>
            </div>

            <div className={styles.sectionStack}>
              <div className={styles.detailCell}>
                <div className={styles.sectionHeader}>
                  <span className={styles.metaValue}>
                    <CreditCard className="mr-2 inline h-4 w-4" />
                    Stripe
                  </span>
                  <Badge variant={isStripeConfigured() ? "success" : "warning"}>{isStripeConfigured() ? "Ativo" : "Pendente"}</Badge>
                </div>
                <p className={styles.detailText}>
                  {isStripeConfigured()
                    ? "Configurado para checkout, portal do cliente e histórico de invoices."
                    : "Ainda não configurado. O produto continua com trial e pricing, mas sem cobrança automática."}
                </p>
              </div>
              <div className={styles.detailCell}>
                <span className={styles.metaLabel}>Customer</span>
                <p className={styles.detailText}>{billing.organization.stripeCustomerId ?? "Não criado"}</p>
                <span className={styles.metaLabel}>Subscription</span>
                <p className={styles.detailText}>{billing.organization.stripeSubscriptionId ?? "Não criada"}</p>
              </div>
            </div>
          </section>

          <section className={styles.detailPanel}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.panelTitle}>Recursos do plano</h3>
            </div>

            <div className={styles.sectionStack}>
              {Object.entries(BILLING_FEATURE_LABELS).map(([feature, label]) => {
                const enabled = currentFeatures.includes(feature as keyof typeof BILLING_FEATURE_LABELS);

                return (
                  <div key={feature} className={styles.detailCell}>
                    <div className={styles.sectionHeader}>
                      <span className={styles.metaValue}>
                        <Receipt className="mr-2 inline h-4 w-4" />
                        {label}
                      </span>
                      <Badge variant={enabled ? "success" : "outline"}>{enabled ? "Ativo" : "Bloqueado"}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </aside>
      </div>

      <section className={styles.listPanel}>
        <div className={styles.panelHeader}>
          <div className={styles.panelHeaderRow}>
            <div>
              <h3 className={styles.panelTitle}>Pedidos comerciais</h3>
              <p className={styles.panelDescription}>Abra pedidos customizados e acompanhe o histórico sem trocar de tela.</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <div className="border border-border/65 bg-transparent p-4">
            <BillingUpgradeRequestForm action={createBillingUpgradeRequest} />
          </div>

          <div className="grid gap-3">
            {billing.requests.length ? (
              billing.requests.map((request) => (
                <div key={request.id} className="border border-border/65 bg-transparent p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="grid gap-1">
                      <strong className="text-sm text-foreground">
                        {request.targetPlan} · {request.targetInterval === "annual" ? "Anual" : "Mensal"}
                      </strong>
                      <span className="text-sm text-muted-foreground">
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
                      {formatRequestStatus(request.status)}
                    </Badge>
                  </div>

                  <p className="mt-3 text-sm text-muted-foreground">
                    Membros extras: {request.requestedExtraSeats} · Pacotes de IA: {request.requestedAiAddonUnits}
                  </p>
                  {request.note ? <p className="mt-2 text-sm text-muted-foreground">{request.note}</p> : null}
                  {request.responseNote ? <p className="mt-2 text-sm text-muted-foreground">Resposta: {request.responseNote}</p> : null}
                </div>
              ))
            ) : (
              <div className="border border-dashed border-border/65 bg-transparent p-4 text-sm text-muted-foreground">
                Nenhum pedido de upgrade enviado ainda.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className={styles.listPanel}>
        <div className={styles.panelHeader}>
          <div className={styles.panelHeaderRow}>
            <div>
              <h3 className={styles.panelTitle}>Faturas</h3>
              <p className={styles.panelDescription}>Histórico de cobrança e exportação quando o plano permite.</p>
            </div>
          </div>
        </div>

        {!currentFeatures.includes("invoice_history") ? (
          <div className="p-4">
            <div className="border border-dashed border-border/65 bg-transparent p-4 text-sm text-muted-foreground">
              Histórico detalhado de faturas fica disponível a partir do plano Growth.
            </div>
          </div>
        ) : billing.invoices.length ? (
          <div className={styles.list}>
            {billing.invoices.map((invoice) => (
              <div key={invoice.id} className={styles.row}>
                <div className={styles.rowTop}>
                  <div className={styles.rowLead}>
                    <p className={styles.rowTitle}>{invoice.number || invoice.id}</p>
                    <p className={styles.rowSubtitle}>
                      Criada em {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(invoice.created * 1000))}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={invoice.status === "paid" ? "success" : "warning"}>{invoice.status || "unknown"}</Badge>
                    <Badge variant="outline">{formatMoney(invoice.amount_paid || invoice.amount_due, invoice.currency)}</Badge>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {invoice.hosted_invoice_url ? (
                    <Button asChild variant="outline" size="sm">
                      <a href={invoice.hosted_invoice_url} target="_blank" rel="noreferrer">
                        <FileText className="mr-2 h-4 w-4" />
                        Abrir fatura
                      </a>
                    </Button>
                  ) : null}
                  {invoice.invoice_pdf ? (
                    <Button asChild variant="outline" size="sm">
                      <a href={invoice.invoice_pdf} target="_blank" rel="noreferrer">
                        PDF
                      </a>
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4">
            <div className="border border-dashed border-border/65 bg-transparent p-4 text-sm text-muted-foreground">
              {isStripeConfigured()
                ? "Nenhuma fatura encontrada ainda."
                : "Configure Stripe para exibir faturas e histórico de cobrança aqui."}
            </div>
          </div>
        )}

        {currentFeatures.includes("invoice_history") ? (
          <div className="p-4 pt-0">
            <Button asChild variant="outline">
              <Link href="/api/billing/invoices/export">Exportar CSV</Link>
            </Button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
