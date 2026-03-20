import { BillingPlan, BillingStatus } from "@prisma/client";
import Link from "next/link";
import { Activity, CalendarClock, Cpu, CreditCard, Database, Link as LinkIcon, Mail, ShieldCheck, Sparkles, UsersRound } from "lucide-react";

import {
  createBillingCheckout,
  deleteDepartmentPlaybook,
  inviteTeamMember,
  openBillingPortal,
  startOrganizationTrial,
  upsertDepartmentPlaybook,
  revokePendingInvite,
  updateOrganizationSettings,
  updateTeamMemberRole
} from "@/app/(app)/settings/actions";
import { getRecentAuditEvents } from "@/lib/audit/queries";
import { getPlanDefinition, BILLING_STATUS_LABELS, formatLimitValue, isBillingActive } from "@/lib/billing/plans";
import { isStripeConfigured, isStripePlanAvailable } from "@/lib/billing/stripe";
import { DepartmentPlaybookForm } from "@/components/settings/department-playbook-form";
import { TeamInviteForm } from "@/components/settings/team-invite-form";
import { TeamMemberRoleForm } from "@/components/settings/team-member-role-form";
import { OrganizationSettingsForm } from "@/components/settings/organization-settings-form";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/permissions";
import {
  canManageTeamMember,
  getAssignableRoles,
  getRoleLabel
} from "@/lib/auth/roles";
import { env } from "@/lib/env";
import { isGoogleCalendarSyncConfigured } from "@/lib/calendar/google-sync";
import { isEmailConfigured } from "@/lib/email/transporter";
import { isObservabilityConfigured } from "@/lib/observability/forwarder";
import { getDepartmentPlaybooks } from "@/lib/playbooks/queries";
import { getOrganizationBillingOverview, getOrganizationSettings } from "@/lib/settings/queries";
import { getStorageDriver, isS3Configured } from "@/lib/storage/provider";
import { getPendingInvites, getTeamMembers } from "@/lib/team/queries";

export default async function SettingsPage() {
  const user = await requirePermission("manage_workspace");
  const [organization, billingOverview, teamMembers, pendingInvites, auditEvents, playbooks] = await Promise.all([
    getOrganizationSettings(user.organizationId),
    getOrganizationBillingOverview(user.organizationId),
    getTeamMembers(user.organizationId),
    getPendingInvites(user.organizationId),
    getRecentAuditEvents(user.organizationId),
    getDepartmentPlaybooks(user.organizationId)
  ]);

  if (!organization) {
    return null;
  }

  const storageDriver = getStorageDriver();
  const planDefinition = getPlanDefinition(organization.billingPlan);
  const billingIsActive = isBillingActive(organization.billingStatus, organization.billingTrialEndsAt);
  const integrations = [
    {
      title: "OpenAI",
      description: "Parsing de curriculo, score refinado e copiloto de triagem.",
      icon: Cpu,
      ready: !!env.OPENAI_API_KEY,
      meta: env.OPENAI_API_KEY ? env.OPENAI_RESUME_MODEL : "Nao configurado"
    },
    {
      title: "SMTP",
      description: "Envio de emails operacionais para candidatos e convites internos.",
      icon: Mail,
      ready: isEmailConfigured(),
      meta: isEmailConfigured() ? env.EMAIL_FROM : "Nao configurado"
    },
    {
      title: "Google Calendar",
      description: "Sincronizacao opcional de entrevistas com calendario externo via service account.",
      icon: CalendarClock,
      ready: isGoogleCalendarSyncConfigured(),
      meta: isGoogleCalendarSyncConfigured() ? env.GOOGLE_CALENDAR_ID : "Nao configurado"
    },
    {
      title: "Storage",
      description: "Persistencia de curriculos em disco local ou bucket S3-compatible.",
      icon: Database,
      ready: storageDriver === "local" ? true : isS3Configured(),
      meta: storageDriver === "local" ? "Driver local" : "Driver S3"
    },
    {
      title: "Stripe",
      description: "Checkout, portal do cliente e sincronizacao de assinatura para cobrar por plano.",
      icon: CreditCard,
      ready: isStripeConfigured(),
      meta: isStripeConfigured() ? "Checkout configuravel" : "Nao configurado"
    },
    {
      title: "Observability",
      description: "Forwarding opcional de eventos operacionais para provedor externo.",
      icon: Activity,
      ready: isObservabilityConfigured(),
      meta: isObservabilityConfigured() ? env.OBSERVABILITY_SERVICE_NAME : "Nao configurado"
    }
  ];
  const assignableRoles = getAssignableRoles(user.role).map((role) => ({
    value: role,
    label: getRoleLabel(role)
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="Configuracoes da organizacao"
        description="Ajuste identidade do workspace, equipe e readiness das integracoes principais para operacao e deploy."
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)]">
        <Card className="panel-hover">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-secondary p-3 text-secondary-foreground">
                <CreditCard className="h-4 w-4" />
              </div>
              <div>
                <CardTitle>Billing e trial</CardTitle>
                <CardDescription>Plano atual, uso do workspace e caminho para upgrade comercial.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={billingIsActive ? "success" : "warning"}>{BILLING_STATUS_LABELS[organization.billingStatus]}</Badge>
              <Badge variant="outline">{planDefinition.label}</Badge>
              <span className="text-sm text-muted-foreground">{planDefinition.monthlyPriceLabel}</span>
            </div>

            <div className="rounded-[1.35rem] border border-border/70 bg-white/75 p-5">
              <p className="font-semibold">{planDefinition.description}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {organization.billingStatus === BillingStatus.TRIALING && organization.billingTrialEndsAt
                  ? `Trial ativo ate ${new Intl.DateTimeFormat("pt-BR", {
                      dateStyle: "medium"
                    }).format(organization.billingTrialEndsAt)}.`
                  : organization.billingCurrentPeriodEndsAt
                    ? `Periodo atual ate ${new Intl.DateTimeFormat("pt-BR", {
                        dateStyle: "medium"
                      }).format(organization.billingCurrentPeriodEndsAt)}.`
                    : "Nenhum trial ou assinatura ativa registrada ainda."}
              </p>
            </div>

            {billingOverview ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[1.25rem] border border-border/70 bg-white/75 p-4">
                  <p className="section-intro">Vagas ativas</p>
                  <p className="mt-3 text-3xl font-semibold">{billingOverview.usage.activeJobs}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Limite: {formatLimitValue(planDefinition.limits.activeJobs)}
                  </p>
                </div>
                <div className="rounded-[1.25rem] border border-border/70 bg-white/75 p-4">
                  <p className="section-intro">Membros</p>
                  <p className="mt-3 text-3xl font-semibold">{billingOverview.usage.teamMembers}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Limite: {formatLimitValue(planDefinition.limits.teamMembers)}
                  </p>
                </div>
                <div className="rounded-[1.25rem] border border-border/70 bg-white/75 p-4">
                  <p className="section-intro">IA no mes</p>
                  <p className="mt-3 text-3xl font-semibold">{billingOverview.usage.monthlyAiAnalyses}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Limite: {formatLimitValue(planDefinition.limits.monthlyAiAnalyses)}
                  </p>
                </div>
                <div className="rounded-[1.25rem] border border-border/70 bg-white/75 p-4">
                  <p className="section-intro">Candidatos no mes</p>
                  <p className="mt-3 text-3xl font-semibold">{billingOverview.usage.monthlyCandidates}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Limite: {formatLimitValue(planDefinition.limits.monthlyCandidates)}
                  </p>
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <form action={startOrganizationTrial}>
                <Button type="submit" variant="outline">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Ativar trial de 14 dias
                </Button>
              </form>
              <form action={createBillingCheckout.bind(null, BillingPlan.STARTER, "monthly")}>
                <Button type="submit" variant="outline" disabled={!isStripePlanAvailable(BillingPlan.STARTER, "monthly")}>
                  Assinar Starter
                </Button>
              </form>
              <form action={createBillingCheckout.bind(null, BillingPlan.GROWTH, "monthly")}>
                <Button type="submit" disabled={!isStripePlanAvailable(BillingPlan.GROWTH, "monthly")}>
                  Assinar Growth
                </Button>
              </form>
              <form action={openBillingPortal}>
                <Button type="submit" variant="ghost" disabled={!organization.stripeCustomerId}>
                  Abrir portal do cliente
                </Button>
              </form>
              <Button asChild variant="ghost">
                <Link href="/settings/billing">Billing detalhado</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="panel-hover">
          <CardHeader>
            <CardTitle>Workspace</CardTitle>
            <CardDescription>Informacoes exibidas e usadas para operacao do tenant.</CardDescription>
          </CardHeader>
          <CardContent>
            <OrganizationSettingsForm
              action={updateOrganizationSettings}
              defaultValues={{
                name: organization.name,
                slug: organization.slug,
                sizeRange: organization.sizeRange
              }}
            />
          </CardContent>
        </Card>

        <Card className="panel-hover">
          <CardHeader>
            <CardTitle>Readiness de integracoes</CardTitle>
            <CardDescription>Panorama do que ja esta pronto para demo ou ambiente de producao.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {integrations.map((integration) => {
              const Icon = integration.icon;

              return (
                <div key={integration.title} className="rounded-[1.35rem] border border-border/70 bg-white/75 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="rounded-2xl bg-secondary p-3 text-secondary-foreground">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-semibold">{integration.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{integration.description}</p>
                        <p className="mt-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">{integration.meta}</p>
                      </div>
                    </div>
                    <Badge variant={integration.ready ? "success" : "warning"}>
                      {integration.ready ? "Ativo" : "Pendente"}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card className="panel-hover">
          <CardHeader>
            <CardTitle>Novo playbook por departamento</CardTitle>
            <CardDescription>Padronize triagem, entrevista e decisao para tipos recorrentes de vaga.</CardDescription>
          </CardHeader>
          <CardContent>
            <DepartmentPlaybookForm action={upsertDepartmentPlaybook} submitLabel="Salvar playbook" />
          </CardContent>
        </Card>

        <Card className="panel-hover">
          <CardHeader>
            <CardTitle>Playbooks ativos</CardTitle>
            <CardDescription>Templates reutilizaveis que alimentam o copiloto e a operacao do time.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {playbooks.length ? (
              playbooks.map((playbook) => (
                <div key={playbook.id} className="rounded-[1.35rem] border border-border/70 bg-white/75 p-5">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">{playbook.title}</p>
                      <p className="text-sm text-muted-foreground">{playbook.department}</p>
                    </div>
                    <form action={deleteDepartmentPlaybook.bind(null, playbook.id)}>
                      <Button type="submit" variant="ghost" size="sm">
                        Remover
                      </Button>
                    </form>
                  </div>
                  <DepartmentPlaybookForm
                    action={upsertDepartmentPlaybook}
                    submitLabel="Atualizar playbook"
                    defaultValues={{
                      id: playbook.id,
                      department: playbook.department,
                      title: playbook.title,
                      screeningGuidance: playbook.screeningGuidance,
                      interviewGuidance: playbook.interviewGuidance,
                      decisionGuidance: playbook.decisionGuidance,
                      strongSignals: Array.isArray(playbook.strongSignals)
                        ? playbook.strongSignals.filter((item): item is string => typeof item === "string")
                        : [],
                      riskSignals: Array.isArray(playbook.riskSignals)
                        ? playbook.riskSignals.filter((item): item is string => typeof item === "string")
                        : []
                    }}
                  />
                </div>
              ))
            ) : (
              <div className="rounded-[1.25rem] border border-dashed border-border bg-white/75 p-5 text-sm text-muted-foreground">
                Nenhum playbook cadastrado ainda. Crie o primeiro template para reaproveitar entre vagas semelhantes.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)]">
        <Card className="panel-hover">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-secondary p-3 text-secondary-foreground">
                <UsersRound className="h-4 w-4" />
              </div>
              <div>
                <CardTitle>Convidar equipe</CardTitle>
                <CardDescription>Envie acesso para recrutadores, hiring managers e admins.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {assignableRoles.length ? (
              <TeamInviteForm action={inviteTeamMember} assignableRoles={assignableRoles} />
            ) : (
              <div className="rounded-[1.25rem] border border-dashed border-border bg-white/75 p-5 text-sm text-muted-foreground">
                Seu papel nao pode convidar novos membros.
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <LinkIcon className="h-4 w-4 text-muted-foreground" />
                Convites pendentes
              </div>
              {pendingInvites.length ? (
                pendingInvites.map((invite) => (
                  <div key={invite.id} className="rounded-[1.25rem] border border-border/70 bg-white/75 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-1">
                        <p className="font-semibold">{invite.email}</p>
                        <p className="text-sm text-muted-foreground">
                          {getRoleLabel(invite.role)} - enviado por {invite.invitedBy.name}
                        </p>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                          Expira em {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(invite.expiresAt)}
                        </p>
                        <p className="break-all text-sm text-primary">{`${env.APP_URL}/invite/${invite.token}`}</p>
                      </div>
                      <form action={revokePendingInvite.bind(null, invite.id)}>
                        <Button type="submit" variant="outline" size="sm">
                          Revogar
                        </Button>
                      </form>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[1.25rem] border border-dashed border-border bg-white/75 p-5 text-sm text-muted-foreground">
                  Nenhum convite pendente no momento.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="panel-hover">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-secondary p-3 text-secondary-foreground">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <CardTitle>Membros e papeis</CardTitle>
                <CardDescription>Controle de acesso para operacao diaria do time.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {teamMembers.map((member) => {
              const canEdit = canManageTeamMember(user.role, member.role);
              const roleOptions = (canEdit ? getAssignableRoles(user.role) : [member.role]).map((role) => ({
                value: role,
                label: getRoleLabel(role)
              }));

              return (
                <div key={member.id} className="rounded-[1.25rem] border border-border/70 bg-white/75 p-4">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold">{member.name}</p>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      </div>
                      <Badge variant="outline">{getRoleLabel(member.role)}</Badge>
                    </div>
                    {canEdit ? (
                      <TeamMemberRoleForm
                        currentRole={member.role}
                        allowedRoles={roleOptions}
                        action={updateTeamMemberRole.bind(null, member.id)}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Papel visivel, sem permissao de alteracao para seu nivel atual.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </section>

      <Card className="panel-hover">
        <CardHeader>
          <CardTitle>Audit trail</CardTitle>
          <CardDescription>Eventos criticos do workspace para operacao, suporte e rastreabilidade.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {auditEvents.length ? (
            auditEvents.map((event) => (
              <div key={event.id} className="rounded-[1.25rem] border border-border/70 bg-white/75 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-1">
                    <p className="font-semibold">{event.summary}</p>
                    <p className="text-sm text-muted-foreground">
                      {event.actor?.name || "Sistema"} - {event.action} - {event.entityType}
                    </p>
                  </div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(event.createdAt)}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[1.25rem] border border-dashed border-border bg-white/75 p-5 text-sm text-muted-foreground">
              Ainda nao ha eventos de auditoria registrados.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
