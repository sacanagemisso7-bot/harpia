import { BillingPlan, BillingStatus } from "@prisma/client";
import Link from "next/link";
import { ArrowRight, Bell, Layers3 } from "lucide-react";

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
        <div className="hero-orb absolute left-[-9rem] top-12 h-72 w-72 rounded-full bg-white/[0.03] blur-3xl" />
      </div>
      <div className="mx-auto grid min-h-screen max-w-[1760px] gap-5 px-4 py-4 lg:grid-cols-[308px_minmax(0,1fr)] lg:px-5">
        <aside className="panel sticky top-4 flex h-[calc(100vh-2rem)] flex-col px-4 py-5 text-white lg:px-5">
          <Link href="/dashboard" className="relative flex items-center gap-3">
            <div className="brand-mark text-slate-100">
              <Layers3 className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-xl font-semibold tracking-[-0.03em] text-white">HireFlow AI</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/42">Operations workspace</p>
            </div>
          </Link>

          <div className="shell-card relative mt-6 p-4">
            <div className="flex items-start gap-3">
              <div className="nav-item-icon">
                <Layers3 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Operational workspace</p>
                <p className="text-xs leading-5 text-white/54">
                  Pessoas, solicitacoes, conhecimento e governanca em uma interface unica.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 min-h-0 flex-1 overflow-y-auto pr-1">
            <MainNav role={user.role} canViewRevenueOps={canViewRevenueOps} />
          </div>

          {user.memberships.length > 1 ? (
            <div className="shell-card mt-5 p-4">
              <p className="nav-section-label">Workspace ativo</p>
              <p className="mt-2 text-sm font-semibold text-white">{user.organizationName}</p>
              <form action={switchOrganization} className="mt-3 flex gap-2">
                <select
                  name="organizationId"
                  defaultValue={user.organizationId}
                  className="field-shell h-11 min-w-0 flex-1 rounded-[0.95rem] px-4 py-2 text-sm text-white shadow-none"
                >
                  {user.memberships.map((membership) => (
                    <option key={membership.organizationId} value={membership.organizationId}>
                      {membership.organizationName} ({membership.role})
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="inline-flex h-11 items-center justify-center rounded-[0.95rem] border border-white/[0.08] bg-white/[0.04] px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:border-white/[0.14] hover:bg-white/[0.08]"
                >
                  Trocar
                </button>
              </form>
            </div>
          ) : null}

          <div className="shell-card mt-5 p-5">
            <p className="nav-section-label">Workspace</p>
            <div className="mt-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/42">{user.organizationName}</p>
                <p className="text-sm font-semibold text-white">{user.name}</p>
                <p className="text-sm text-white/56">{user.email}</p>
              </div>
              <Badge className="border-white/[0.08] bg-white/[0.06] text-white" variant="outline">
                {user.role}
              </Badge>
            </div>
          </div>

          <div className="mt-6">
            <SignOutButton />
          </div>
        </aside>

        <main className="min-w-0">
          {showBillingBanner && billing && billingPlan ? (
            <div className="panel mb-4 flex flex-col gap-4 border-primary/14 bg-[linear-gradient(135deg,rgba(16,20,29,0.98),rgba(19,25,36,0.96),rgba(23,32,47,0.94))] px-5 py-5 text-primary-foreground lg:flex-row lg:items-center lg:justify-between lg:px-6">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className="bg-white/10 text-primary-foreground" variant="outline">
                    {billingPlan.label}
                  </Badge>
                  <Badge className="bg-white/10 text-primary-foreground" variant="outline">
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
                  className="inline-flex h-11 items-center justify-center rounded-[1rem] bg-white px-5 text-sm font-semibold text-foreground transition hover:-translate-y-0.5 hover:shadow-soft"
                >
                  Abrir billing
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex h-11 items-center justify-center rounded-[1rem] border border-white/[0.14] bg-white/[0.08] px-5 text-sm font-semibold text-primary-foreground transition hover:-translate-y-0.5 hover:bg-white/[0.12]"
                >
                  Ver planos
                </Link>
              </div>
            </div>
          ) : null}

          <div className="shell-topbar mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 space-y-2">
              <p className="nav-section-label">Workspace</p>
              <p className="text-sm text-foreground/76">Ambiente operacional centralizado para people ops, atendimento interno e conhecimento corporativo.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="shell-topbar-chip hidden md:inline-flex">
                {user.organizationName}
              </div>
              <button type="button" className="shell-topbar-action">
                <Bell className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="page-stage space-y-6 pb-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
