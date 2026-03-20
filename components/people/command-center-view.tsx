import Link from "next/link";
import type { Route } from "next";
import { BellRing, BriefcaseBusiness, CalendarClock, CheckCircle2, ClipboardList, FileWarning, ShieldAlert, UsersRound } from "lucide-react";

import { KpiCard } from "@/components/dashboard/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type CommandCenterViewProps = {
  data: {
    metrics: {
      employees: number;
      onboardingActive: number;
      offboardingActive: number;
      openRequests: number;
      overdueTasks: number;
      pendingCompliance: number;
      eventsToday: number;
      requestsAtRisk: number;
    };
    alerts: Array<{
      type: string;
      title: string;
      description: string;
      href: string;
      severity: "high" | "medium";
    }>;
    requests: Array<{
      id: string;
      title: string;
      status: string;
      effectiveSlaStatus: string;
      assigneeUser: { name: string } | null;
    }>;
    overdueTasks: Array<{
      id: string;
      title: string;
      status: string;
      relatedEmployee: { fullName: string } | null;
    }>;
    onboarding: Array<{
      id: string;
      employee: { fullName: string; title: string };
      steps: Array<{ status: string }>;
    }>;
    offboarding: Array<{
      id: string;
      employee: { fullName: string; title: string };
      steps: Array<{ status: string }>;
    }>;
    events: Array<{
      id: string;
      title: string;
      startsAt: Date;
      relatedEmployee: { fullName: string } | null;
    }>;
    compliance: Array<{
      id: string;
      title: string;
      employee: { fullName: string } | null;
      dueAt: Date | null;
    }>;
    hiring: {
      jobCount: number;
      applicationCount: number;
      slaAlerts: number;
    };
  };
};

function getProgress(steps: Array<{ status: string }>) {
  if (!steps.length) {
    return 0;
  }

  const completed = steps.filter((step) => step.status === "DONE").length;
  return Math.round((completed / steps.length) * 100);
}

export function CommandCenterView({ data }: CommandCenterViewProps) {
  return (
    <div className="space-y-6">
      <section className="grid gap-5 xl:grid-cols-4">
        <KpiCard title="Colaboradores" value={String(data.metrics.employees)} description="Base ativa de pessoas dentro da operacao." icon={UsersRound} />
        <KpiCard
          title="Solicitacoes abertas"
          value={String(data.metrics.openRequests)}
          description="Fila ativa do service desk interno."
          icon={BellRing}
        />
        <KpiCard title="Tarefas vencidas" value={String(data.metrics.overdueTasks)} description="Pendencias que exigem acao agora." icon={ClipboardList} />
        <KpiCard
          title="Compliance pendente"
          value={String(data.metrics.pendingCompliance)}
          description="Documentos ou trilhas obrigatorias ainda abertas."
          icon={ShieldAlert}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_380px]">
        <Card className="panel-hover">
          <CardHeader>
            <CardTitle>Alertas operacionais</CardTitle>
            <CardDescription>Leitura unica do que pode travar a operacao de pessoas no dia a dia.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.alerts.length ? (
              data.alerts.map((alert) => (
                <Link key={`${alert.type}-${alert.title}`} href={alert.href as Route} className="block rounded-[1.25rem] border border-border/70 bg-white/75 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">{alert.title}</p>
                      <p className="mt-2 text-sm text-muted-foreground">{alert.description}</p>
                    </div>
                    <Badge variant={alert.severity === "high" ? "destructive" : "warning"}>
                      {alert.severity === "high" ? "Critico" : "Atencao"}
                    </Badge>
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-[1.25rem] border border-dashed border-border bg-white/75 p-5 text-sm text-muted-foreground">
                Nenhum alerta critico no momento. A operacao interna esta sob controle.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="panel-hover">
          <CardHeader>
            <CardTitle>Resumo do dia</CardTitle>
            <CardDescription>O que merece abertura imediata na rotina do time.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[1.25rem] border border-border/70 bg-white/75 p-4">
              <p className="section-intro">Onboarding ativo</p>
              <p className="mt-3 text-3xl font-semibold">{data.metrics.onboardingActive}</p>
            </div>
            <div className="rounded-[1.25rem] border border-border/70 bg-white/75 p-4">
              <p className="section-intro">Offboarding ativo</p>
              <p className="mt-3 text-3xl font-semibold">{data.metrics.offboardingActive}</p>
            </div>
            <div className="rounded-[1.25rem] border border-border/70 bg-white/75 p-4">
              <p className="section-intro">Eventos hoje</p>
              <p className="mt-3 text-3xl font-semibold">{data.metrics.eventsToday}</p>
            </div>
            <div className="rounded-[1.25rem] border border-border/70 bg-white/75 p-4">
              <p className="section-intro">SLAs em risco</p>
              <p className="mt-3 text-3xl font-semibold">{data.metrics.requestsAtRisk}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card className="panel-hover">
          <CardHeader>
            <CardTitle>Service desk interno</CardTitle>
            <CardDescription>Solicitacoes recentes com visibilidade operacional e dono claro.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.requests.length ? (
              data.requests.map((request) => (
                <div key={request.id} className="rounded-[1.2rem] border border-border/70 bg-white/75 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">{request.title}</p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {request.assigneeUser?.name ? `Responsavel: ${request.assigneeUser.name}` : "Sem responsavel definido"}.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{request.status}</Badge>
                      <Badge variant={request.effectiveSlaStatus === "BREACHED" ? "destructive" : request.effectiveSlaStatus === "AT_RISK" ? "warning" : "success"}>
                        {request.effectiveSlaStatus}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[1.2rem] border border-dashed border-border bg-white/75 p-4 text-sm text-muted-foreground">
                Nenhuma solicitacao aberta agora.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="panel-hover">
          <CardHeader>
            <CardTitle>Tarefas e eventos</CardTitle>
            <CardDescription>Pendencias de execucao e marcos do calendario operacional.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.overdueTasks.length ? (
              data.overdueTasks.map((task) => (
                <div key={task.id} className="rounded-[1.2rem] border border-border/70 bg-white/75 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">{task.title}</p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {task.relatedEmployee ? `${task.relatedEmployee.fullName} segue com acao pendente.` : "Tarefa operacional sem colaborador associado."}
                      </p>
                    </div>
                    <Badge variant="destructive">{task.status}</Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[1.2rem] border border-dashed border-border bg-white/75 p-4 text-sm text-muted-foreground">
                Nenhuma tarefa vencida agora.
              </div>
            )}

            {data.events.length ? (
              <div className="space-y-3">
                {data.events.map((event) => (
                  <div key={event.id} className="rounded-[1.2rem] border border-border/70 bg-white/75 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold">{event.title}</p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {event.relatedEmployee?.fullName ?? "Evento interno"} -{" "}
                          {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(event.startsAt)}
                        </p>
                      </div>
                      <CalendarClock className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <Card className="panel-hover">
          <CardHeader>
            <CardTitle>Onboarding</CardTitle>
            <CardDescription>Fluxos de entrada ativos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.onboarding.length ? (
              data.onboarding.map((run) => (
                <div key={run.id} className="rounded-[1.2rem] border border-border/70 bg-white/75 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{run.employee.fullName}</p>
                      <p className="text-sm text-muted-foreground">{run.employee.title}</p>
                    </div>
                    <Badge variant="success">{getProgress(run.steps)}%</Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[1.2rem] border border-dashed border-border bg-white/75 p-4 text-sm text-muted-foreground">
                Nenhum onboarding ativo.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="panel-hover">
          <CardHeader>
            <CardTitle>Offboarding</CardTitle>
            <CardDescription>Saidas com acompanhamento operacional.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.offboarding.length ? (
              data.offboarding.map((run) => (
                <div key={run.id} className="rounded-[1.2rem] border border-border/70 bg-white/75 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{run.employee.fullName}</p>
                      <p className="text-sm text-muted-foreground">{run.employee.title}</p>
                    </div>
                    <Badge variant="warning">{getProgress(run.steps)}%</Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[1.2rem] border border-dashed border-border bg-white/75 p-4 text-sm text-muted-foreground">
                Nenhum offboarding ativo.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="panel-hover">
          <CardHeader>
            <CardTitle>Hiring module</CardTitle>
            <CardDescription>Recrutamento preservado como modulo complementar da plataforma.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[1.2rem] border border-border/70 bg-white/75 p-4">
              <p className="section-intro">Vagas</p>
              <p className="mt-3 text-3xl font-semibold">{data.hiring.jobCount}</p>
            </div>
            <div className="rounded-[1.2rem] border border-border/70 bg-white/75 p-4">
              <p className="section-intro">Aplicacoes</p>
              <p className="mt-3 text-3xl font-semibold">{data.hiring.applicationCount}</p>
            </div>
            <div className="rounded-[1.2rem] border border-border/70 bg-white/75 p-4">
              <p className="section-intro">Alertas do hiring</p>
              <p className="mt-3 text-3xl font-semibold">{data.hiring.slaAlerts}</p>
            </div>
            <Link href="/hiring" className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
              <BriefcaseBusiness className="h-4 w-4" />
              Abrir modulo de hiring
            </Link>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card className="panel-hover">
          <CardHeader>
            <CardTitle>Compliance leve</CardTitle>
            <CardDescription>Itens obrigatorios ainda em aberto na operacao.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.compliance.length ? (
              data.compliance.map((item) => (
                <div key={item.id} className="rounded-[1.2rem] border border-border/70 bg-white/75 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">{item.title}</p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {item.employee?.fullName ?? "Colaborador"}{item.dueAt ? ` - vence em ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(item.dueAt)}` : ""}
                      </p>
                    </div>
                    <FileWarning className="h-4 w-4 text-amber-600" />
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[1.2rem] border border-dashed border-border bg-white/75 p-4 text-sm text-muted-foreground">
                Nenhum item de compliance pendente.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="panel-hover">
          <CardHeader>
            <CardTitle>Proximos movimentos</CardTitle>
            <CardDescription>Atalhos para manter a operacao rodando sem friccao.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Link href="/employees" className="rounded-[1.2rem] border border-border/70 bg-white/75 p-4 text-sm font-semibold transition hover:-translate-y-0.5">
              <UsersRound className="mb-3 h-4 w-4 text-primary" />
              Cadastrar colaborador
            </Link>
            <Link href="/requests" className="rounded-[1.2rem] border border-border/70 bg-white/75 p-4 text-sm font-semibold transition hover:-translate-y-0.5">
              <BellRing className="mb-3 h-4 w-4 text-primary" />
              Abrir solicitacao interna
            </Link>
            <Link href="/people/tasks" className="rounded-[1.2rem] border border-border/70 bg-white/75 p-4 text-sm font-semibold transition hover:-translate-y-0.5">
              <ClipboardList className="mb-3 h-4 w-4 text-primary" />
              Criar tarefa operacional
            </Link>
            <Link href="/chat" className="rounded-[1.2rem] border border-border/70 bg-white/75 p-4 text-sm font-semibold transition hover:-translate-y-0.5">
              <CheckCircle2 className="mb-3 h-4 w-4 text-primary" />
              Operar com o company chat
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
