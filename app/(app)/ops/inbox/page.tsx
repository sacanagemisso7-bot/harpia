import Link from "next/link";
import type { Route } from "next";
import { BellRing, BriefcaseBusiness, CalendarClock, ClipboardList, ShieldAlert, Sparkles } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/permissions";
import { getPeopleDashboard } from "@/modules/people-ops/queries";

export default async function OperationsInboxPage() {
  const user = await requirePermission("view_ops_inbox");
  const inbox = await getPeopleDashboard(user.organizationId);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations inbox"
        title="Inbox operacional da empresa"
        description="Priorize o que esta travando people ops, service desk interno, compliance e processos do dia a dia. Hiring continua visivel como modulo complementar."
      />

      <section className="grid gap-5 xl:grid-cols-4">
        <Card className="panel-hover">
          <CardContent className="p-5">
            <p className="section-intro">Solicitacoes abertas</p>
            <p className="mt-3 text-3xl font-semibold">{inbox.metrics.openRequests}</p>
          </CardContent>
        </Card>
        <Card className="panel-hover">
          <CardContent className="p-5">
            <p className="section-intro">Tarefas vencidas</p>
            <p className="mt-3 text-3xl font-semibold">{inbox.metrics.overdueTasks}</p>
          </CardContent>
        </Card>
        <Card className="panel-hover">
          <CardContent className="p-5">
            <p className="section-intro">Compliance pendente</p>
            <p className="mt-3 text-3xl font-semibold">{inbox.metrics.pendingCompliance}</p>
          </CardContent>
        </Card>
        <Card className="panel-hover">
          <CardContent className="p-5">
            <p className="section-intro">SLAs em risco</p>
            <p className="mt-3 text-3xl font-semibold">{inbox.metrics.requestsAtRisk}</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_380px]">
        <Card className="panel-hover">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-secondary p-3 text-secondary-foreground">
                <BellRing className="h-4 w-4" />
              </div>
              <div>
                <CardTitle>Fila de prioridades</CardTitle>
                <CardDescription>Leitura unica do que esta exigindo acao imediata na operacao interna.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {inbox.alerts.length ? (
              inbox.alerts.map((item, index) => (
                <Link
                  key={`${item.type}-${index}`}
                  href={item.href as Route}
                  className="block rounded-[1.35rem] border border-border/70 bg-white/75 p-5 transition hover:-translate-y-0.5 hover:shadow-soft"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        {item.type === "overdue_task" ? (
                          <ClipboardList className="h-4 w-4 text-amber-600" />
                        ) : item.type === "hr_request" ? (
                          <ShieldAlert className="h-4 w-4 text-destructive" />
                        ) : (
                          <Sparkles className="h-4 w-4 text-primary" />
                        )}
                        <p className="font-semibold">{item.title}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <Badge variant={item.severity === "high" ? "destructive" : "warning"}>
                      {item.severity === "high" ? "Alta prioridade" : "Atencao"}
                    </Badge>
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-[1.35rem] border border-dashed border-border bg-white/75 p-5 text-sm text-muted-foreground">
                Nenhum item critico no inbox operacional agora.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="panel-hover">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-secondary p-3 text-secondary-foreground">
                <CalendarClock className="h-4 w-4" />
              </div>
              <div>
                <CardTitle>Resumo rapido</CardTitle>
                <CardDescription>Uma leitura curta para abrir a rotina do dia.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[1.25rem] border border-border/70 bg-white/75 p-4">
              <p className="section-intro">Onboarding ativo</p>
              <p className="mt-3 text-3xl font-semibold">{inbox.metrics.onboardingActive}</p>
            </div>
            <div className="rounded-[1.25rem] border border-border/70 bg-white/75 p-4">
              <p className="section-intro">Offboarding ativo</p>
              <p className="mt-3 text-3xl font-semibold">{inbox.metrics.offboardingActive}</p>
            </div>
            <div className="rounded-[1.25rem] border border-border/70 bg-white/75 p-4">
              <p className="section-intro">Eventos hoje</p>
              <p className="mt-3 text-3xl font-semibold">{inbox.metrics.eventsToday}</p>
            </div>
            <div className="rounded-[1.25rem] border border-border/70 bg-white/75 p-4">
              <p className="section-intro">Hiring complementar</p>
              <p className="mt-3 text-3xl font-semibold">{inbox.hiring.applicationCount}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {inbox.hiring.jobCount} vagas abertas e {inbox.hiring.slaAlerts} alertas operacionais no modulo de hiring.
              </p>
              <Link href="/hiring" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                <BriefcaseBusiness className="h-4 w-4" />
                Abrir modulo de hiring
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
