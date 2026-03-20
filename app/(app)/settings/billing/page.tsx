import { BillingPlan, BillingStatus } from "@prisma/client";
import Link from "next/link";
import { ArrowRight, CreditCard, FileText, Receipt, Sparkles } from "lucide-react";

import {
  createBillingCheckout,
  createBillingUpgradeRequest,
  openBillingPortal,
  startOrganizationTrial,
  updateBillingProfile,
  updateBillingCommercialTerms
} from "@/app/(app)/settings/actions";
import { PageHeader } from "@/components/layout/page-header";
import { BillingAddonsForm } from "@/components/settings/billing-addons-form";
import { BillingProfileForm } from "@/components/settings/billing-profile-form";
import { BillingUpgradeRequestForm } from "@/components/settings/billing-upgrade-request-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/permissions";
import {
  BILLING_STATUS_LABELS,
  formatLimitValue,
  getPlanDefinition,
  isBillingActive
} from "@/lib/billing/plans";
import { BILLING_FEATURE_LABELS, getPlanFeatures } from "@/lib/billing/features";
import { getBillingPageData } from "@/lib/billing/queries";
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
        message: "Checkout concluido. A sincronizacao da assinatura deve aparecer aqui em instantes."
      };
    case "cancelled":
      return {
        variant: "warning" as const,
        message: "Checkout cancelado. Voce pode retomar quando quiser."
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
        message: "Sua organizacao ja possui uma assinatura ativa."
      };
    case "portal":
      return {
        variant: "outline" as const,
        message: "Voce voltou do portal do cliente do Stripe."
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
    <div className="space-y-6">
      <PageHeader
        eyebrow="Billing"
        title="Plano, trial e historico de cobranca"
        description="Controle assinatura, acompanhe uso do workspace e veja invoices em um lugar mais proprio para operacao SaaS."
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
        <div className="flex items-center justify-between gap-3 rounded-[1.35rem] border border-border/70 bg-white/75 px-5 py-4 shadow-soft">
          <div className="space-y-1">
            <p className="font-semibold">Atualizacao de billing</p>
            <p className="text-sm text-muted-foreground">{billingNotice.message}</p>
          </div>
          <Badge variant={billingNotice.variant}>{billingNotice.variant === "success" ? "OK" : "Info"}</Badge>
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card className="panel-hover">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-secondary p-3 text-secondary-foreground">
                <CreditCard className="h-4 w-4" />
              </div>
              <div>
                <CardTitle>Assinatura atual</CardTitle>
                <CardDescription>Visao executiva do plano e do estado da cobranca.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={billingIsActive ? "success" : "warning"}>{BILLING_STATUS_LABELS[billing.organization.billingStatus]}</Badge>
              <Badge variant="outline">{currentPlan.label}</Badge>
              <span className="text-sm text-muted-foreground">{currentPlan.monthlyPriceLabel}</span>
            </div>

            <div className="rounded-[1.35rem] border border-border/70 bg-white/75 p-5">
              <p className="font-semibold">{currentPlan.description}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {billing.organization.billingStatus === BillingStatus.TRIALING && billing.organization.billingTrialEndsAt
                  ? `Trial ativo ate ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(billing.organization.billingTrialEndsAt)}.`
                  : billing.organization.billingCurrentPeriodEndsAt
                    ? `Periodo atual ate ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(billing.organization.billingCurrentPeriodEndsAt)}.`
                    : "Ainda nao ha uma assinatura ativa ou trial corrente registrado."}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <form action={startOrganizationTrial}>
                <Button type="submit" variant="outline">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Iniciar trial
                </Button>
              </form>
              <form action={createBillingCheckout.bind(null, BillingPlan.GROWTH, "monthly")}>
                <Button type="submit" disabled={!isStripePlanAvailable(BillingPlan.GROWTH)}>
                  Upgrade mensal
                </Button>
              </form>
              <form action={createBillingCheckout.bind(null, BillingPlan.GROWTH, "annual")}>
                <Button type="submit" variant="outline" disabled={!isStripePlanAvailable(BillingPlan.GROWTH, "annual")}>
                  Growth anual
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>

        <Card className="panel-hover">
          <CardHeader>
            <CardTitle>Uso do workspace</CardTitle>
            <CardDescription>Esses numeros alimentam banners de upgrade e limites de operacao.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.25rem] border border-border/70 bg-white/75 p-5">
              <p className="section-intro">Vagas ativas</p>
              <p className="mt-3 text-3xl font-semibold">{billing.usage.activeJobs}</p>
              <p className="mt-2 text-sm text-muted-foreground">Limite: {formatLimitValue(billing.effectiveLimits.activeJobs)}</p>
            </div>
            <div className="rounded-[1.25rem] border border-border/70 bg-white/75 p-5">
              <p className="section-intro">Membros</p>
              <p className="mt-3 text-3xl font-semibold">{billing.usage.teamMembers}</p>
              <p className="mt-2 text-sm text-muted-foreground">Limite: {formatLimitValue(billing.effectiveLimits.teamMembers)}</p>
            </div>
            <div className="rounded-[1.25rem] border border-border/70 bg-white/75 p-5">
              <p className="section-intro">IA no mes</p>
              <p className="mt-3 text-3xl font-semibold">{billing.usage.monthlyAiAnalyses}</p>
              <p className="mt-2 text-sm text-muted-foreground">Limite: {formatLimitValue(billing.effectiveLimits.monthlyAiAnalyses)}</p>
            </div>
            <div className="rounded-[1.25rem] border border-border/70 bg-white/75 p-5">
              <p className="section-intro">Candidatos no mes</p>
              <p className="mt-3 text-3xl font-semibold">{billing.usage.monthlyCandidates}</p>
              <p className="mt-2 text-sm text-muted-foreground">Limite: {formatLimitValue(billing.effectiveLimits.monthlyCandidates)}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-7">
        <Card className="panel-hover">
          <CardContent className="p-5">
            <p className="section-intro">Trial iniciado</p>
            <p className="mt-3 text-xl font-semibold">
              {billing.metrics.trialStartedAt
                ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(billing.metrics.trialStartedAt)
                : "Nao iniciado"}
            </p>
          </CardContent>
        </Card>
        <Card className="panel-hover">
          <CardContent className="p-5">
            <p className="section-intro">Primeira ativacao</p>
            <p className="mt-3 text-xl font-semibold">
              {billing.metrics.activatedAt
                ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(billing.metrics.activatedAt)
                : "Ainda nao"}
            </p>
          </CardContent>
        </Card>
        <Card className="panel-hover">
          <CardContent className="p-5">
            <p className="section-intro">Trial para pago</p>
            <p className="mt-3 text-xl font-semibold">{billing.metrics.convertedFromTrial ? "Convertido" : "Nao convertido"}</p>
          </CardContent>
        </Card>
        <Card className="panel-hover">
          <CardContent className="p-5">
            <p className="section-intro">Dias para converter</p>
            <p className="mt-3 text-xl font-semibold">{billing.metrics.daysToConvert ?? "-"}</p>
          </CardContent>
        </Card>
        <Card className="panel-hover">
          <CardContent className="p-5">
            <p className="section-intro">MRR estimado</p>
            <p className="mt-3 text-xl font-semibold">{formatMoney(billing.metrics.estimatedMrrCents, "BRL")}</p>
          </CardContent>
        </Card>
        <Card className="panel-hover">
          <CardContent className="p-5">
            <p className="section-intro">ARR estimado</p>
            <p className="mt-3 text-xl font-semibold">{formatMoney(billing.metrics.estimatedArrCents, "BRL")}</p>
          </CardContent>
        </Card>
        <Card className="panel-hover">
          <CardContent className="p-5">
            <p className="section-intro">Overage IA</p>
            <p className="mt-3 text-xl font-semibold">{formatMoney(billing.metrics.aiOverageRevenueCents, "BRL")}</p>
            <p className="mt-2 text-sm text-muted-foreground">{billing.metrics.aiOverageAnalyses} analises acima da franquia</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card className="panel-hover">
          <CardHeader>
            <CardTitle>Checkout e upgrades</CardTitle>
            <CardDescription>Uma trilha direta para assinar ou mover a conta para um plano melhor.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-3">
            {checkoutPlans.map((plan) => {
              const definition = getPlanDefinition(plan);
              const isCurrent = billing.organization.billingPlan === plan;
              const canSelfServe = isStripePlanAvailable(plan);

              return (
                <div key={plan} className="rounded-[1.35rem] border border-border/70 bg-white/75 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-lg font-semibold">{definition.label}</p>
                    {isCurrent ? <Badge variant="success">Atual</Badge> : null}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{definition.monthlyPriceLabel}</p>
                  <p className="text-sm text-muted-foreground">{definition.annualPriceLabel}</p>
                  <p className="mt-4 text-sm leading-6 text-muted-foreground">{definition.description}</p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    {canSelfServe ? (
                      <>
                        <form action={createBillingCheckout.bind(null, plan, "monthly")}>
                          <Button type="submit" variant={isCurrent ? "outline" : "default"}>
                            Mensal
                          </Button>
                        </form>
                        <form action={createBillingCheckout.bind(null, plan, "annual")}>
                          <Button type="submit" variant="outline" disabled={!isStripePlanAvailable(plan, "annual")}>
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
          </CardContent>
        </Card>

        <Card className="panel-hover">
          <CardHeader>
            <CardTitle>Status da integracao</CardTitle>
            <CardDescription>Cheque rapidamente se a camada comercial esta pronta para cobrar.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[1.25rem] border border-border/70 bg-white/75 p-5">
              <p className="font-semibold">Stripe</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {isStripeConfigured()
                  ? "Configurado para checkout, portal do cliente e historico de invoices."
                  : "Ainda nao configurado. O produto continua com trial e pricing, mas sem cobranca automatica."}
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-border/70 bg-white/75 p-5">
              <p className="font-semibold">Customer e subscription</p>
              <p className="mt-2 break-all text-sm text-muted-foreground">
                Customer: {billing.organization.stripeCustomerId ?? "Nao criado"}<br />
                Subscription: {billing.organization.stripeSubscriptionId ?? "Nao criada"}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="panel-hover">
        <CardHeader>
          <CardTitle>Seats e add-ons de IA</CardTitle>
          <CardDescription>Camada comercial para ajustar limite do tenant sem precisar mudar o plano base.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[1.25rem] border border-border/70 bg-white/75 p-5">
              <p className="section-intro">Seats extras</p>
              <p className="mt-3 text-3xl font-semibold">{billing.organization.billingExtraSeats}</p>
              <p className="mt-2 text-sm text-muted-foreground">Aumentam o limite de membros do workspace.</p>
            </div>
            <div className="rounded-[1.25rem] border border-border/70 bg-white/75 p-5">
              <p className="section-intro">Pacotes IA</p>
              <p className="mt-3 text-3xl font-semibold">{billing.organization.billingAiAddonUnits}</p>
              <p className="mt-2 text-sm text-muted-foreground">Cada pacote soma capacidade mensal de analises.</p>
            </div>
            <div className="rounded-[1.25rem] border border-border/70 bg-white/75 p-5">
              <p className="section-intro">MRR contratado</p>
              <p className="mt-3 text-3xl font-semibold">
                {billing.organization.billingContractedMrrCents
                  ? formatMoney(billing.organization.billingContractedMrrCents, "BRL")
                  : "Automatico"}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">Use override quando houver contrato customizado.</p>
            </div>
          </div>

          <BillingAddonsForm
            action={updateBillingCommercialTerms}
            defaultValues={{
              billingExtraSeats: billing.organization.billingExtraSeats,
              billingAiAddonUnits: billing.organization.billingAiAddonUnits,
              billingContractedMrrCents: billing.organization.billingContractedMrrCents ?? 0
            }}
          />
        </CardContent>
      </Card>

      <Card className="panel-hover">
        <CardHeader>
          <CardTitle>Features destravadas pelo plano</CardTitle>
          <CardDescription>Essa camada ajuda o time a entender o que some ou reaparece em trial, upgrade e downgrade.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Object.entries(BILLING_FEATURE_LABELS).map(([feature, label]) => {
            const enabled = currentFeatures.includes(feature as keyof typeof BILLING_FEATURE_LABELS);

            return (
              <div key={feature} className="rounded-[1.25rem] border border-border/70 bg-white/75 p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">{label}</p>
                  <Badge variant={enabled ? "success" : "outline"}>{enabled ? "Ativo" : "Bloqueado"}</Badge>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card className="panel-hover">
          <CardHeader>
            <CardTitle>Perfil fiscal e de cobranca</CardTitle>
            <CardDescription>Dados usados para nota, VAT note, contato financeiro e overage de IA.</CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        <Card className="panel-hover">
          <CardHeader>
            <CardTitle>Pedido de upgrade ou contrato customizado</CardTitle>
            <CardDescription>Abra uma solicitacao quando precisar de aprovacao comercial, Business ou condicao negociada.</CardDescription>
          </CardHeader>
          <CardContent>
            <BillingUpgradeRequestForm action={createBillingUpgradeRequest} />
          </CardContent>
        </Card>
      </section>

      <Card className="panel-hover">
        <CardHeader>
          <CardTitle>Pedidos recentes de upgrade</CardTitle>
          <CardDescription>Historico de solicitacoes enviadas para aprovacao comercial ou financeira.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {billing.requests.length ? (
            billing.requests.map((request) => (
              <div key={request.id} className="rounded-[1.25rem] border border-border/70 bg-white/75 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="font-semibold">
                        {request.targetPlan} {request.targetInterval === "annual" ? "anual" : "mensal"}
                      </p>
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
                    <p className="text-sm text-muted-foreground">
                      Solicitado por {request.requestedBy.name} em{" "}
                      {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(request.createdAt)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Seats extras: {request.requestedExtraSeats} - Pacotes IA: {request.requestedAiAddonUnits}
                    </p>
                    {request.note ? <p className="text-sm text-muted-foreground">{request.note}</p> : null}
                    {request.responseNote ? <p className="text-sm text-muted-foreground">Resposta: {request.responseNote}</p> : null}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {request.reviewedBy ? `Revisado por ${request.reviewedBy.name}` : "Aguardando revisao"}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[1.25rem] border border-dashed border-border bg-white/75 p-5 text-sm text-muted-foreground">
              Nenhum pedido de upgrade enviado ainda.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="panel-hover">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-secondary p-3 text-secondary-foreground">
              <Receipt className="h-4 w-4" />
            </div>
            <div>
              <CardTitle>Invoices e historico de cobranca</CardTitle>
              <CardDescription>Visao de pagamentos recentes puxados do Stripe quando a integracao estiver ativa.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!currentFeatures.includes("invoice_history") ? (
            <div className="rounded-[1.25rem] border border-dashed border-border bg-white/75 p-5 text-sm text-muted-foreground">
              Historico detalhado de invoices fica disponivel a partir do plano Growth.
            </div>
          ) : billing.invoices.length ? (
            billing.invoices.map((invoice) => (
              <div key={invoice.id} className="rounded-[1.25rem] border border-border/70 bg-white/75 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="font-semibold">{invoice.number || invoice.id}</p>
                      <Badge variant={invoice.status === "paid" ? "success" : "warning"}>{invoice.status || "unknown"}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Criada em {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(invoice.created * 1000))}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-lg font-semibold">{formatMoney(invoice.amount_paid || invoice.amount_due, invoice.currency)}</p>
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
            ))
          ) : (
            <div className="rounded-[1.25rem] border border-dashed border-border bg-white/75 p-5 text-sm text-muted-foreground">
              {isStripeConfigured()
                ? "Nenhuma invoice encontrada ainda para este workspace."
                : "Configure Stripe para exibir invoices e historico de cobranca aqui."}
            </div>
          )}

          {currentFeatures.includes("invoice_history") ? (
            <div className="pt-2">
              <Button asChild variant="outline">
                <Link href="/api/billing/invoices/export">Exportar CSV</Link>
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
