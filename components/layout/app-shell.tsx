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
        <div className="hero-orb absolute left-[-9rem] top-12 h-72 w-72 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="hero-orb absolute right-[-7rem] top-6 h-[22rem] w-[22rem] rounded-full bg-amber-300/[0.08] blur-3xl [animation-delay:1.2s]" />
        <div className="hero-orb absolute bottom-[-3rem] left-1/3 h-64 w-64 rounded-full bg-cyan-300/[0.08] blur-3xl [animation-delay:2.3s]" />
      </div>
      <div className="mx-auto grid min-h-screen max-w-[1680px] gap-5 px-4 py-4 lg:grid-cols-[292px_minmax(0,1fr)] lg:px-6">
        <aside className="sticky top-4 flex h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-[1.65rem] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(7,11,18,0.97),rgba(8,13,22,0.98),rgba(8,17,27,0.94))] px-5 py-6 text-white shadow-aura backdrop-blur-2xl">
          <div className="absolute inset-x-0 top-0 h-44 bg-[radial-gradient(circle_at_top_left,rgba(122,183,255,0.18),transparent_42%),radial-gradient(circle_at_88%_12%,rgba(255,191,118,0.1),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent)]" />
          <div className="absolute inset-x-0 top-0 h-32 grid-fade opacity-24" />
          <Link href="/dashboard" className="relative flex items-center gap-3">
            <div className="rounded-[1rem] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(102,170,255,0.18),rgba(12,23,38,0.88))] p-2.5 text-sky-100 shadow-[0_16px_38px_rgba(0,0,0,0.3)] backdrop-blur-xl">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-xl font-semibold tracking-[-0.03em] text-white">HireFlow AI</p>
              <p className="text-[11px] uppercase tracking-[0.24em] text-white/44">Operational Intelligence OS</p>
            </div>
          </Link>

          <div className="relative mt-8 rounded-[1.25rem] border border-white/[0.08] bg-white/[0.03] p-4 shadow-[0_18px_36px_rgba(4,8,18,0.2)] backdrop-blur-xl">
            <div className="flex items-start gap-3">
              <div className="rounded-[0.95rem] border border-white/10 bg-white/[0.06] p-2 text-sky-100">
                <WandSparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Operational intelligence layer</p>
                <p className="text-xs leading-5 text-white/56">
                  People ops, approvals, service desk e conhecimento em um workspace governado.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <MainNav role={user.role} canViewRevenueOps={canViewRevenueOps} />
          </div>

          {user.memberships.length > 1 ? (
            <div className="mt-6 rounded-[1.3rem] border border-white/[0.08] bg-white/[0.03] p-4 shadow-[0_18px_36px_rgba(4,8,18,0.2)] backdrop-blur-xl">
              <p className="text-xs uppercase tracking-[0.24em] text-white/42">Workspace ativo</p>
              <p className="mt-2 text-sm font-semibold text-white">{user.organizationName}</p>
              <form action={switchOrganization} className="mt-3 flex gap-2">
                <select
                  name="organizationId"
                  defaultValue={user.organizationId}
                  className="h-11 min-w-0 flex-1 rounded-[0.95rem] border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-sm text-white shadow-none"
                >
                  {user.memberships.map((membership) => (
                    <option key={membership.organizationId} value={membership.organizationId}>
                      {membership.organizationName} ({membership.role})
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="inline-flex h-11 items-center justify-center rounded-[0.95rem] border border-white/[0.08] bg-white/[0.06] px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:border-primary/18 hover:bg-white/[0.1]"
                >
                  Trocar
                </button>
              </form>
            </div>
          ) : null}

          <div className="mt-auto rounded-[1.35rem] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-5 shadow-[0_20px_40px_rgba(5,9,18,0.24)] backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.24em] text-white/42">Workspace</p>
            <div className="mt-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/42">{user.organizationName}</p>
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
            <div className="panel mb-4 flex flex-col gap-4 border-white/[0.08] bg-[linear-gradient(135deg,rgba(9,16,28,0.98),rgba(12,27,43,0.96),rgba(10,43,59,0.92))] px-5 py-5 text-primary-foreground lg:flex-row lg:items-center lg:justify-between lg:px-6">
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
                  className="inline-flex h-11 items-center justify-center rounded-[1rem] bg-white px-5 text-sm font-semibold text-foreground transition hover:-translate-y-1 hover:shadow-soft"
                >
                  Abrir billing
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex h-11 items-center justify-center rounded-[1rem] border border-white/[0.14] bg-white/[0.08] px-5 text-sm font-semibold text-primary-foreground transition hover:-translate-y-1 hover:bg-white/[0.12]"
                >
                  Ver planos
                </Link>
              </div>
            </div>
          ) : null}

          <div className="panel mb-6 flex items-center justify-between gap-4 bg-[linear-gradient(180deg,rgba(10,15,25,0.88),rgba(8,12,20,0.78))] px-5 py-4 lg:px-6">
            <div className="glass-strip flex min-w-0 items-center gap-3 rounded-[1rem] border border-white/[0.08] px-4 py-3 shadow-soft">
              <span className="h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_18px_rgba(87,214,255,0.55)]" />
              <Search className="h-4 w-4 text-primary" />
              <span className="truncate text-sm text-foreground/72">
                Workspace operacional com IA, governanca, solicitacoes internas e conhecimento unificado
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden rounded-[0.95rem] border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-foreground/54 shadow-soft md:block">
                People operations intelligence
              </div>
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-[1rem] border border-white/[0.08] bg-white/[0.04] text-foreground/68 shadow-soft hover:-translate-y-1 hover:border-primary/18 hover:text-foreground"
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
