import { BillingPlan, BillingStatus } from "@prisma/client";
import Link from "next/link";
import { ArrowRight, Bell, Search, Sparkles, WandSparkles } from "lucide-react";

import { BILLING_LIMIT_LABELS, BILLING_STATUS_LABELS, getPlanDefinition } from "@/lib/billing/plans";
import { MainNav } from "@/components/layout/main-nav";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { Badge } from "@/components/ui/badge";

type AppShellProps = {
  user: {
    name?: string | null;
    email?: string | null;
    role: string;
    organizationId: string;
    organizationName: string;
    memberships: Array<{
      organizationId: string;
      organizationName: string;
      role: string;
      isDefault: boolean;
    }>;
  };
  canViewRevenueOps: boolean;
  billing: {
    plan: BillingPlan;
    status: BillingStatus;
    trialEndsAt: Date | null;
    currentPeriodEndsAt: Date | null;
    usage: {
      activeJobs: number;
      teamMembers: number;
      monthlyAiAnalyses: number;
      monthlyCandidates: number;
    };
    effectiveLimits: {
      activeJobs: number | null;
      teamMembers: number | null;
      monthlyAiAnalyses: number | null;
      monthlyCandidates: number | null;
    };
  } | null;
  children: React.ReactNode;
  switchOrganization: (formData: FormData) => Promise<void>;
};

export function AppShell({ user, canViewRevenueOps, billing, children, switchOrganization }: AppShellProps) {
  const billingPlan = billing ? getPlanDefinition(billing.plan) : null;
  const usageAlerts =
    billing && billingPlan
      ? (Object.entries(billing.effectiveLimits) as Array<[keyof typeof billing.effectiveLimits, number | null]>).reduce<
          Array<{
            key: keyof typeof billing.effectiveLimits;
            limit: number;
            usage: number;
            ratio: number;
          }>
        >((accumulator, [key, limit]) => {
          if (typeof limit !== "number" || limit <= 0) {
            return accumulator;
          }

          accumulator.push({
            key,
            limit,
            usage: billing.usage[key],
            ratio: billing.usage[key] / limit
          });

          return accumulator;
        }, [])
          .filter((item) => item.ratio >= 0.8)
          .sort((left, right) => right.ratio - left.ratio)
      : [];
  const showBillingBanner =
    !!billing &&
    (billing.status === BillingStatus.TRIALING ||
      billing.status === BillingStatus.PAST_DUE ||
      usageAlerts.length > 0);

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-8rem] top-20 h-72 w-72 rounded-full bg-emerald-200/30 blur-3xl" />
        <div className="absolute right-[-6rem] top-10 h-80 w-80 rounded-full bg-amber-200/30 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-emerald-100/40 blur-3xl" />
      </div>
      <div className="mx-auto grid min-h-screen max-w-[1680px] gap-6 px-4 py-4 lg:grid-cols-[300px_minmax(0,1fr)] lg:px-6">
        <aside className="panel sticky top-4 flex h-[calc(100vh-2rem)] flex-col overflow-hidden px-6 py-7">
          <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-br from-primary/10 via-transparent to-accent/30" />
          <Link href="/dashboard" className="relative flex items-center gap-3">
            <div className="rounded-2xl bg-primary p-2.5 text-primary-foreground shadow-[0_16px_36px_rgba(25,72,51,0.24)]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-xl font-semibold">HireFlow AI</p>
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Internal Operations OS</p>
            </div>
          </Link>

          <div className="relative mt-8 rounded-[1.35rem] border border-white/60 bg-white/55 p-4 shadow-soft backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-secondary p-2 text-secondary-foreground">
                <WandSparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">AI internal ops cockpit</p>
                <p className="text-xs text-muted-foreground">People ops, service desk, knowledge e copiloto em uma superficie unica</p>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <MainNav role={user.role} canViewRevenueOps={canViewRevenueOps} />
          </div>

          {user.memberships.length > 1 ? (
            <div className="mt-6 rounded-[1.4rem] border border-white/70 bg-white/65 p-4 shadow-soft backdrop-blur">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Workspace ativo</p>
              <p className="mt-2 text-sm font-semibold">{user.organizationName}</p>
              <form action={switchOrganization} className="mt-3 flex gap-2">
                <select
                  name="organizationId"
                  defaultValue={user.organizationId}
                  className="h-11 min-w-0 flex-1 rounded-2xl border border-border bg-white px-4 py-2 text-sm"
                >
                  {user.memberships.map((membership) => (
                    <option key={membership.organizationId} value={membership.organizationId}>
                      {membership.organizationName} ({membership.role})
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="inline-flex h-11 items-center justify-center rounded-full border border-border bg-white px-4 text-sm font-semibold transition hover:-translate-y-0.5 hover:shadow-soft"
                >
                  Trocar
                </button>
              </form>
            </div>
          ) : null}

          <div className="mt-auto rounded-[1.6rem] border border-white/70 bg-white/65 p-5 shadow-soft backdrop-blur">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Workspace</p>
            <div className="mt-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{user.organizationName}</p>
                <p className="text-sm font-semibold">{user.name}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
              <Badge variant="outline">{user.role}</Badge>
            </div>
          </div>

          <div className="mt-6">
            <SignOutButton />
          </div>
        </aside>

        <main className="min-w-0">
          {showBillingBanner && billing && billingPlan ? (
            <div className="panel mb-4 flex flex-col gap-4 border-primary/15 bg-[linear-gradient(135deg,rgba(22,59,43,0.96),rgba(37,92,66,0.92),rgba(144,164,98,0.78))] px-5 py-5 text-primary-foreground lg:flex-row lg:items-center lg:justify-between lg:px-6">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className="bg-white/15 text-primary-foreground" variant="outline">
                    {billingPlan.label}
                  </Badge>
                  <Badge className="bg-white/15 text-primary-foreground" variant="outline">
                    {BILLING_STATUS_LABELS[billing.status]}
                  </Badge>
                </div>
                <p className="text-lg font-semibold">
                  {billing.status === BillingStatus.TRIALING
                    ? `Trial em andamento${billing.trialEndsAt ? ` ate ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(billing.trialEndsAt)}` : ""}.`
                    : billing.status === BillingStatus.PAST_DUE
                      ? "Sua assinatura precisa de atencao para evitar bloqueios operacionais."
                      : "Seu time esta se aproximando dos limites do plano atual."}
                </p>
                <p className="text-sm text-primary-foreground/78">
                  {usageAlerts.length
                    ? `Uso em destaque: ${usageAlerts
                        .slice(0, 2)
                        .map((item) => `${item.usage}/${item.limit} em ${BILLING_LIMIT_LABELS[item.key]}`)
                        .join(" e ")}.`
                    : "Abra billing para ver uso, invoices e opcoes de upgrade."}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/settings/billing"
                  className="inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-foreground transition hover:-translate-y-0.5 hover:shadow-soft"
                >
                  Abrir billing
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex h-11 items-center justify-center rounded-full border border-white/20 bg-white/10 px-5 text-sm font-semibold text-primary-foreground transition hover:-translate-y-0.5 hover:bg-white/15"
                >
                  Ver planos
                </Link>
              </div>
            </div>
          ) : null}

          <div className="panel mb-6 flex items-center justify-between gap-4 px-5 py-4 lg:px-6">
            <div className="flex min-w-0 items-center gap-3 rounded-full border border-border/70 bg-white/75 px-4 py-3 shadow-sm">
              <Search className="h-4 w-4 text-muted-foreground" />
              <span className="truncate text-sm text-muted-foreground">Operacao interna de pessoas, processos e conhecimento com copiloto corporativo</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden rounded-full border border-border/70 bg-white/75 px-4 py-2 text-xs font-medium text-muted-foreground md:block">
                People & Internal Operations OS
              </div>
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-white/75 text-muted-foreground shadow-sm hover:-translate-y-0.5 hover:text-foreground"
              >
                <Bell className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="space-y-6 pb-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
