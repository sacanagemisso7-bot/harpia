import { BillingPlan, BillingStatus } from "@prisma/client";
import Link from "next/link";
import { Activity, CalendarClock, Cpu, CreditCard, Database, Mail, Sparkles } from "lucide-react";

import styles from "../workspace-expansion.module.css";
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
import { PageHeader } from "@/components/layout/page-header";
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
      description: "Sincronizacao opcional de entrevistas com calendario externo.",
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
      description: "Checkout, portal do cliente e sincronizacao de assinatura.",
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
  const readyIntegrations = integrations.filter((integration) => integration.ready).length;
  const assignableRoles = getAssignableRoles(user.role).map((role) => ({
    value: role,
    label: getRoleLabel(role)
  }));

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Settings"
        title="Configuracoes da organizacao"
        description="Billing, equipe, integracoes e governanca do workspace em uma leitura mais direta."
      />

      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Plano</span>
          <strong className={styles.statValue}>{planDefinition.label}</strong>
          <p className={styles.statHint}>{BILLING_STATUS_LABELS[organization.billingStatus]}</p>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Equipe</span>
          <strong className={styles.statValue}>{teamMembers.length}</strong>
          <p className={styles.statHint}>Membros ativos no workspace</p>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Convites</span>
          <strong className={styles.statValue}>{pendingInvites.length}</strong>
          <p className={styles.statHint}>Convites aguardando aceitacao</p>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Integracoes prontas</span>
          <strong className={styles.statValue}>{readyIntegrations}</strong>
          <p className={styles.statHint}>De {integrations.length} conectores avaliados</p>
        </div>
      </section>

      <div className={styles.layout}>
        <div className={styles.column}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Billing</span>
              <h2 className={styles.panelTitle}>Plano, uso e upgrade</h2>
              <p className={styles.panelDescription}>Controle comercial do workspace, com trial, assinatura e limites em uma area unica.</p>
            </div>

            <div className={styles.summaryGrid}>
              <div className={styles.summaryTile}>
                <strong>{planDefinition.label}</strong>
                <span>{planDefinition.monthlyPriceLabel}</span>
              </div>
              <div className={styles.summaryTile}>
                <strong>{billingIsActive ? "Ativo" : "Inativo"}</strong>
                <span>{BILLING_STATUS_LABELS[organization.billingStatus]}</span>
              </div>
              {billingOverview ? (
                <>
                  <div className={styles.summaryTile}>
                    <strong>{billingOverview.usage.activeJobs}</strong>
                    <span>Vagas ativas / limite {formatLimitValue(planDefinition.limits.activeJobs)}</span>
                  </div>
                  <div className={styles.summaryTile}>
                    <strong>{billingOverview.usage.teamMembers}</strong>
                    <span>Membros / limite {formatLimitValue(planDefinition.limits.teamMembers)}</span>
                  </div>
                </>
              ) : null}
            </div>

            <div className={styles.listItem}>
              <strong className={styles.itemTitle}>{planDefinition.description}</strong>
              <p className={styles.itemDescription}>
                {organization.billingStatus === BillingStatus.TRIALING && organization.billingTrialEndsAt
                  ? `Trial ativo ate ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(organization.billingTrialEndsAt)}.`
                  : organization.billingCurrentPeriodEndsAt
                    ? `Periodo atual ate ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(organization.billingCurrentPeriodEndsAt)}.`
                    : "Nenhum trial ou assinatura ativa registrada ainda."}
              </p>
            </div>

            <div className={styles.actionStack}>
              <div className={styles.actionRow}>
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
              </div>

              <div className={styles.actionRow}>
                <form action={openBillingPortal}>
                  <Button type="submit" variant="ghost" disabled={!organization.stripeCustomerId}>
                    Abrir portal do cliente
                  </Button>
                </form>
                <Button asChild variant="ghost">
                  <Link href="/settings/billing">Billing detalhado</Link>
                </Button>
              </div>
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Workspace</span>
              <h2 className={styles.panelTitle}>Configuracoes da organizacao</h2>
              <p className={styles.panelDescription}>Dados base usados pelo tenant e exibidos para o time.</p>
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

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Playbooks</span>
              <h2 className={styles.panelTitle}>Templates por departamento</h2>
              <p className={styles.panelDescription}>Padronize triagem, entrevista e decisao para vagas recorrentes.</p>
            </div>

            <DepartmentPlaybookForm action={upsertDepartmentPlaybook} submitLabel="Salvar playbook" />

            <div className={styles.list}>
              {playbooks.length ? (
                playbooks.map((playbook) => (
                  <div key={playbook.id} className={styles.listItem}>
                    <div className={styles.rowBetween}>
                      <div className={styles.itemLead}>
                        <strong className={styles.itemTitle}>{playbook.title}</strong>
                        <span className={styles.itemMeta}>{playbook.department}</span>
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
                <div className={styles.emptyState}>Nenhum playbook cadastrado ainda.</div>
              )}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Equipe</span>
              <h2 className={styles.panelTitle}>Convites e papeis</h2>
              <p className={styles.panelDescription}>Acesso ao workspace, convites pendentes e alteracao de role no mesmo fluxo.</p>
            </div>

            {assignableRoles.length ? (
              <TeamInviteForm action={inviteTeamMember} assignableRoles={assignableRoles} />
            ) : (
              <div className={styles.emptyState}>Seu papel nao pode convidar novos membros.</div>
            )}

            <div className={styles.list}>
              {pendingInvites.length ? (
                pendingInvites.map((invite) => (
                  <div key={invite.id} className={styles.listItem}>
                    <div className={styles.rowBetween}>
                      <div className={styles.itemLead}>
                        <strong className={styles.itemTitle}>{invite.email}</strong>
                        <span className={styles.itemMeta}>{getRoleLabel(invite.role)} • enviado por {invite.invitedBy.name}</span>
                      </div>
                      <form action={revokePendingInvite.bind(null, invite.id)}>
                        <Button type="submit" variant="outline" size="sm">
                          Revogar
                        </Button>
                      </form>
                    </div>
                    <p className={styles.itemDescription}>
                      Expira em {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(invite.expiresAt)}
                    </p>
                    <p className={styles.itemMeta}>{`${env.APP_URL}/invite/${invite.token}`}</p>
                  </div>
                ))
              ) : (
                <div className={styles.emptyState}>Nenhum convite pendente no momento.</div>
              )}
            </div>

            <div className={styles.list}>
              {teamMembers.map((member) => {
                const canEdit = canManageTeamMember(user.role, member.role);
                const roleOptions = (canEdit ? getAssignableRoles(user.role) : [member.role]).map((role) => ({
                  value: role,
                  label: getRoleLabel(role)
                }));

                return (
                  <div key={member.id} className={styles.listItem}>
                    <div className={styles.rowBetween}>
                      <div className={styles.itemLead}>
                        <strong className={styles.itemTitle}>{member.name}</strong>
                        <span className={styles.itemMeta}>{member.email}</span>
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
                      <p className={styles.itemDescription}>Papel visivel, sem permissao de alteracao para seu nivel atual.</p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <aside className={styles.column}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Integracoes</span>
              <h2 className={styles.panelTitle}>Readiness do ambiente</h2>
              <p className={styles.panelDescription}>Panorama do que ja esta pronto para demo ou producao.</p>
            </div>

            <div className={styles.list}>
              {integrations.map((integration) => {
                const Icon = integration.icon;

                return (
                  <div key={integration.title} className={styles.listItem}>
                    <div className={styles.rowBetween}>
                      <div className={styles.itemLead}>
                        <div className={styles.miniRow}>
                          <span className={styles.iconLead}>
                            <Icon className="h-4 w-4" />
                          </span>
                          <strong className={styles.itemTitle}>{integration.title}</strong>
                        </div>
                        <span className={styles.itemMeta}>{integration.meta}</span>
                      </div>
                      <Badge variant={integration.ready ? "success" : "warning"}>{integration.ready ? "Ativo" : "Pendente"}</Badge>
                    </div>
                    <p className={styles.itemDescription}>{integration.description}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Audit trail</span>
              <h2 className={styles.panelTitle}>Eventos criticos do workspace</h2>
              <p className={styles.panelDescription}>Rastreabilidade para operacao, suporte e governanca.</p>
            </div>

            <div className={styles.list}>
              {auditEvents.length ? (
                auditEvents.map((event) => (
                  <div key={event.id} className={styles.listItem}>
                    <strong className={styles.itemTitle}>{event.summary}</strong>
                    <p className={styles.itemDescription}>
                      {event.actor?.name || "Sistema"} • {event.action} • {event.entityType}
                    </p>
                    <span className={styles.itemMeta}>
                      {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(event.createdAt)}
                    </span>
                  </div>
                ))
              ) : (
                <div className={styles.emptyState}>Ainda nao ha eventos de auditoria registrados.</div>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
