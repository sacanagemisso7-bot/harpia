import { BillingPlan, BillingStatus } from "@prisma/client";
import Link from "next/link";
import { Activity, CalendarClock, Cpu, CreditCard, Database, Mail, Sparkles } from "lucide-react";

import styles from "@/components/operations/ops-workspace.module.css";
import {
  createBillingCheckout,
  deleteDepartmentPlaybook,
  inviteTeamMember,
  openBillingPortal,
  revokePendingInvite,
  startOrganizationTrial,
  updateOrganizationSettings,
  updateTeamMemberRole,
  upsertDepartmentPlaybook
} from "@/app/(app)/settings/actions";
import { DepartmentPlaybookForm } from "@/components/settings/department-playbook-form";
import { OrganizationSettingsForm } from "@/components/settings/organization-settings-form";
import { TeamInviteForm } from "@/components/settings/team-invite-form";
import { TeamMemberRoleForm } from "@/components/settings/team-member-role-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getRecentAuditEvents } from "@/lib/audit/queries";
import { requirePermission } from "@/lib/auth/permissions";
import { canManageTeamMember, getAssignableRoles, getRoleLabel } from "@/lib/auth/roles";
import { BILLING_STATUS_LABELS, formatLimitValue, getPlanDefinition, isBillingActive } from "@/lib/billing/plans";
import { isStripeConfigured, isStripePlanAvailable } from "@/lib/billing/stripe";
import { isGoogleCalendarSyncConfigured } from "@/lib/calendar/google-sync";
import { env } from "@/lib/env";
import { isEmailConfigured } from "@/lib/email/transporter";
import { isObservabilityConfigured } from "@/lib/observability/forwarder";
import { getDepartmentPlaybooks } from "@/lib/playbooks/queries";
import { getOrganizationBillingOverview, getOrganizationSettings } from "@/lib/settings/queries";
import { getStorageDriver, isS3Configured } from "@/lib/storage/provider";
import { getPendingInvites, getTeamMembers } from "@/lib/team/queries";

function formatTokenLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

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
      description: "Parsing de currículo, score refinado e copiloto de triagem.",
      icon: Cpu,
      ready: !!env.OPENAI_API_KEY,
      meta: env.OPENAI_API_KEY ? env.OPENAI_RESUME_MODEL : "Não configurado"
    },
    {
      title: "SMTP",
      description: "Envio de e-mails operacionais para candidatos e convites internos.",
      icon: Mail,
      ready: isEmailConfigured(),
      meta: isEmailConfigured() ? env.EMAIL_FROM : "Não configurado"
    },
    {
      title: "Google Calendar",
      description: "Sincronização opcional de entrevistas com calendário externo.",
      icon: CalendarClock,
      ready: isGoogleCalendarSyncConfigured(),
      meta: isGoogleCalendarSyncConfigured() ? env.GOOGLE_CALENDAR_ID : "Não configurado"
    },
    {
      title: "Storage",
      description: "Persistência de currículos em disco local ou bucket S3-compatible.",
      icon: Database,
      ready: storageDriver === "local" ? true : isS3Configured(),
      meta: storageDriver === "local" ? "Driver local" : "Driver S3"
    },
    {
      title: "Stripe",
      description: "Checkout, portal do cliente e sincronização de assinatura.",
      icon: CreditCard,
      ready: isStripeConfigured(),
      meta: isStripeConfigured() ? "Checkout configurável" : "Não configurado"
    },
    {
      title: "Observability",
      description: "Forwarding opcional de eventos operacionais para provedor externo.",
      icon: Activity,
      ready: isObservabilityConfigured(),
      meta: isObservabilityConfigured() ? env.OBSERVABILITY_SERVICE_NAME : "Não configurado"
    }
  ];

  const readyIntegrations = integrations.filter((integration) => integration.ready).length;
  const assignableRoles = getAssignableRoles(user.role).map((role) => ({
    value: role,
    label: getRoleLabel(role)
  }));

  const stats = [
    { label: "Plano", value: planDefinition.label },
    { label: "Equipe", value: teamMembers.length },
    { label: "Convites", value: pendingInvites.length },
    { label: "Integrações prontas", value: `${readyIntegrations}/${integrations.length}` }
  ];

  return (
    <div className={styles.workspace}>
      <div className={styles.header}>
        <span className={styles.eyebrow}>Settings</span>
        <h2 className={styles.title}>Configurações da organização</h2>
        <p className={styles.description}>Billing, equipe, integrações e governança do workspace em um fluxo mais direto.</p>
      </div>

      <div className={styles.statRow}>
        {stats.map((stat) => (
          <div key={stat.label} className={styles.statPill}>
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </div>
        ))}
      </div>

      <div className={styles.body}>
        <div className={styles.detailColumn}>
          <section className={styles.detailPanel}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.panelTitle}>Billing rápido</h3>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={billingIsActive ? "success" : "warning"}>{BILLING_STATUS_LABELS[organization.billingStatus]}</Badge>
                <Badge variant="outline">{planDefinition.label}</Badge>
              </div>
            </div>

            <div className={styles.detailGrid}>
              <div className={styles.detailCell}>
                <span className={styles.metaLabel}>Plano</span>
                <span className={styles.metaValue}>{planDefinition.monthlyPriceLabel}</span>
              </div>
              <div className={styles.detailCell}>
                <span className={styles.metaLabel}>Status</span>
                <span className={styles.metaValue}>{BILLING_STATUS_LABELS[organization.billingStatus]}</span>
              </div>
              {billingOverview ? (
                <>
                  <div className={styles.detailCell}>
                    <span className={styles.metaLabel}>Vagas ativas</span>
                    <span className={styles.metaValue}>
                      {billingOverview.usage.activeJobs} / {formatLimitValue(planDefinition.limits.activeJobs)}
                    </span>
                  </div>
                  <div className={styles.detailCell}>
                    <span className={styles.metaLabel}>Membros</span>
                    <span className={styles.metaValue}>
                      {billingOverview.usage.teamMembers} / {formatLimitValue(planDefinition.limits.teamMembers)}
                    </span>
                  </div>
                </>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-3">
              <form action={startOrganizationTrial}>
                <Button type="submit" variant="outline">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Ativar trial
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
                <Button type="submit" variant="outline" disabled={!organization.stripeCustomerId}>
                  Abrir portal Stripe
                </Button>
              </form>

              <Button asChild variant="outline">
                <Link href="/settings/billing">Billing detalhado</Link>
              </Button>
            </div>
          </section>

          <section className={styles.formPanel}>
            <div className={styles.panelHeader}>
              <h3 className={styles.panelTitle}>Dados da organização</h3>
              <p className={styles.panelDescription}>Nome, slug e faixa de tamanho usados no tenant.</p>
            </div>

            <OrganizationSettingsForm
              action={updateOrganizationSettings}
              defaultValues={{
                name: organization.name,
                slug: organization.slug,
                sizeRange: organization.sizeRange
              }}
            />
          </section>
        </div>

        <aside className={styles.detailColumn}>
          <section className={styles.detailPanel}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.panelTitle}>Readiness do ambiente</h3>
            </div>

            <div className={styles.sectionStack}>
              {integrations.map((integration) => {
                const Icon = integration.icon;

                return (
                  <div key={integration.title} className={styles.detailCell}>
                    <div className={styles.sectionHeader}>
                      <span className={styles.metaValue}>
                        <Icon className="mr-2 inline h-4 w-4" />
                        {integration.title}
                      </span>
                      <Badge variant={integration.ready ? "success" : "warning"}>{integration.ready ? "Ativo" : "Pendente"}</Badge>
                    </div>
                    <p className={styles.detailText}>{integration.description}</p>
                    <p className={styles.detailText}>{integration.meta}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className={styles.detailPanel}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.panelTitle}>Trilha de auditoria</h3>
            </div>

            {auditEvents.length ? (
              <div className={styles.commentList}>
                {auditEvents.map((event) => (
                  <div key={event.id} className={styles.commentItem}>
                    <div className={styles.sectionHeader}>
                      <span className={styles.commentAuthor}>{event.summary}</span>
                      <span className={styles.metaLabel}>
                        {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(event.createdAt)}
                      </span>
                    </div>
                    <p className={styles.commentBody}>
                      {event.actor?.name || "Sistema"} · {event.action} · {event.entityType}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.emptyState}>Ainda não há eventos de auditoria registrados.</p>
            )}
          </section>
        </aside>
      </div>

      <section className={styles.listPanel}>
        <div className={styles.panelHeader}>
          <div className={styles.panelHeaderRow}>
            <div>
              <h3 className={styles.panelTitle}>Equipe e convites</h3>
              <p className={styles.panelDescription}>Convide pessoas, revise convites abertos e ajuste papéis com mais clareza.</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="grid gap-4">
            {assignableRoles.length ? (
              <div className="border border-border/85 bg-card p-4">
                <TeamInviteForm action={inviteTeamMember} assignableRoles={assignableRoles} />
              </div>
            ) : (
              <div className="border border-dashed border-border/85 bg-card p-4 text-sm text-muted-foreground">
                Seu papel atual não pode convidar novos membros.
              </div>
            )}

            <div className="grid gap-3">
              {pendingInvites.length ? (
                pendingInvites.map((invite) => (
                  <div key={invite.id} className="border border-border/85 bg-card p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="grid gap-1">
                        <strong className="text-sm text-foreground">{invite.email}</strong>
                        <span className="text-sm text-muted-foreground">
                          {getRoleLabel(invite.role)} · enviado por {invite.invitedBy.name}
                        </span>
                      </div>
                      <form action={revokePendingInvite.bind(null, invite.id)}>
                        <Button type="submit" variant="outline" size="sm">
                          Revogar
                        </Button>
                      </form>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                      Expira em {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(invite.expiresAt)}
                    </p>
                    <p className="mt-1 break-all text-xs text-muted-foreground">{`${env.APP_URL}/invite/${invite.token}`}</p>
                  </div>
                ))
              ) : (
                <div className="border border-dashed border-border/85 bg-card p-4 text-sm text-muted-foreground">
                  Nenhum convite pendente no momento.
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-3">
            {teamMembers.map((member) => {
              const canEdit = canManageTeamMember(user.role, member.role);
              const roleOptions = (canEdit ? getAssignableRoles(user.role) : [member.role]).map((role) => ({
                value: role,
                label: getRoleLabel(role)
              }));

              return (
                <div key={member.id} className="border border-border/85 bg-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="grid gap-1">
                      <strong className="text-sm text-foreground">{member.name}</strong>
                      <span className="text-sm text-muted-foreground">{member.email}</span>
                    </div>
                    <Badge variant="outline">{getRoleLabel(member.role)}</Badge>
                  </div>

                  <div className="mt-4">
                    {canEdit ? (
                      <TeamMemberRoleForm
                        currentRole={member.role}
                        allowedRoles={roleOptions}
                        action={updateTeamMemberRole.bind(null, member.id)}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">Papel visível, sem permissão de alteração para o seu nível atual.</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className={styles.listPanel}>
        <div className={styles.panelHeader}>
          <div className={styles.panelHeaderRow}>
            <div>
              <h3 className={styles.panelTitle}>Playbooks por departamento</h3>
              <p className={styles.panelDescription}>Padronize triagem, entrevista e decisão para vagas recorrentes.</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div className="border border-border/85 bg-card p-4">
            <DepartmentPlaybookForm action={upsertDepartmentPlaybook} submitLabel="Salvar playbook" />
          </div>

          <div className="grid gap-4">
            {playbooks.length ? (
              playbooks.map((playbook) => (
                <div key={playbook.id} className="grid gap-4 border border-border/85 bg-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="grid gap-1">
                      <strong className="text-sm text-foreground">{playbook.title}</strong>
                      <span className="text-sm text-muted-foreground">{playbook.department}</span>
                    </div>
                    <form action={deleteDepartmentPlaybook.bind(null, playbook.id)}>
                      <Button type="submit" variant="outline" size="sm">
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
              <div className="border border-dashed border-border/85 bg-card p-4 text-sm text-muted-foreground">
                Nenhum playbook cadastrado ainda.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
