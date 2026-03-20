"use server";

import { BillingPlan, BillingStatus, UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { redirect } from "next/navigation";

import type { TeamInviteState } from "@/components/settings/team-invite-form";
import type { TeamRoleState } from "@/components/settings/team-member-role-form";
import type { BillingCommercialState } from "@/components/settings/billing-addons-form";
import type { BillingProfileState } from "@/components/settings/billing-profile-form";
import type { BillingUpgradeRequestState } from "@/components/settings/billing-upgrade-request-form";
import { createAuditEvent } from "@/lib/audit/events";
import { requirePermission } from "@/lib/auth/permissions";
import { requireRevenueOpsAccess } from "@/lib/billing/revenue-ops";
import {
  type BillingInterval,
  createStripeBillingPortalSession,
  createStripeCheckoutSession,
  isStripeConfigured,
  isStripePlanAvailable
} from "@/lib/billing/stripe";
import { checkBillingLimit } from "@/lib/billing/usage";
import { canAssignRole, canManageTeamMember, getRoleLabel } from "@/lib/auth/roles";
import { env } from "@/lib/env";
import { getEmailTransporter, isEmailConfigured } from "@/lib/email/transporter";
import { logError } from "@/lib/observability/logger";
import { prisma } from "@/lib/prisma/client";
import { billingCommercialTermsSchema } from "@/lib/validations/billing";
import { billingProfileSchema } from "@/lib/validations/billing-profile";
import { billingUpgradeRequestSchema, billingUpgradeReviewSchema } from "@/lib/validations/billing-upgrade-request";
import { departmentPlaybookSchema } from "@/lib/validations/playbook";
import { organizationSettingsSchema } from "@/lib/validations/settings";
import { inviteTeamMemberSchema, updateTeamMemberRoleSchema } from "@/lib/validations/team";

export async function startOrganizationTrial() {
  const user = await requirePermission("manage_workspace");
  const organization = await prisma.organization.findUnique({
    where: {
      id: user.organizationId
    }
  });

  if (!organization) {
    redirect("/settings?billing=organization-not-found");
  }

  if (organization.billingStatus === BillingStatus.ACTIVE) {
    redirect("/settings/billing?billing=already-active");
  }

  if (
    organization.billingStatus === BillingStatus.TRIALING &&
    organization.billingTrialEndsAt &&
    organization.billingTrialEndsAt.getTime() > Date.now()
  ) {
    redirect("/settings/billing?billing=trial-already-running");
  }

  const trialEndsAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14);

  await prisma.organization.update({
    where: {
      id: organization.id
    },
    data: {
      billingPlan: BillingPlan.GROWTH,
      billingStatus: BillingStatus.TRIALING,
      billingTrialEndsAt: trialEndsAt
    }
  });

  await createAuditEvent({
    organizationId: organization.id,
    actorId: user.id,
    action: "billing.trial_started",
    entityType: "organization",
    entityId: organization.id,
    summary: "Trial de 14 dias do plano Growth iniciado.",
    metadata: {
      billingPlan: BillingPlan.GROWTH,
      trialEndsAt: trialEndsAt.toISOString()
    }
  });

  revalidatePath("/settings");
  revalidatePath("/settings/billing");
  revalidatePath("/pricing");

  redirect("/settings/billing?billing=trial-started");
}

export async function createBillingCheckout(
  plan: BillingPlan,
  interval: BillingInterval = "monthly",
  _formData?: FormData
) {
  const user = await requirePermission("manage_workspace");

  if (!isStripeConfigured()) {
    redirect("/book-demo?billing=stripe-not-configured");
  }

  if (!isStripePlanAvailable(plan, interval)) {
    redirect("/book-demo?billing=contact-sales");
  }

  const organization = await prisma.organization.findUnique({
    where: {
      id: user.organizationId
    },
    select: {
      id: true,
      name: true,
      stripeCustomerId: true
    }
  });

  if (!organization) {
    redirect("/settings?billing=organization-not-found");
  }

  const session = await createStripeCheckoutSession(organization, plan, interval);

  await createAuditEvent({
    organizationId: organization.id,
    actorId: user.id,
    action: "billing.checkout_started",
    entityType: "organization",
    entityId: organization.id,
    summary: `Checkout iniciado para o plano ${plan}.`,
    metadata: {
      billingPlan: plan,
      interval,
      checkoutSessionId: session.id
    }
  });

  if (!session.url) {
    redirect("/settings?billing=missing-checkout-url");
  }

  redirect(session.url as never);
}

export async function openBillingPortal() {
  const user = await requirePermission("manage_workspace");

  if (!isStripeConfigured()) {
    redirect("/book-demo?billing=stripe-not-configured");
  }

  const organization = await prisma.organization.findUnique({
    where: {
      id: user.organizationId
    },
    select: {
      id: true,
      stripeCustomerId: true
    }
  });

  if (!organization?.stripeCustomerId) {
    redirect("/settings?billing=no-customer");
  }

  const session = await createStripeBillingPortalSession(organization);
  redirect(session.url as never);
}

export async function updateBillingCommercialTerms(
  _previousState: BillingCommercialState,
  formData: FormData
): Promise<BillingCommercialState> {
  const user = await requirePermission("manage_workspace");
  const parsed = billingCommercialTermsSchema.safeParse({
    billingExtraSeats: formData.get("billingExtraSeats"),
    billingAiAddonUnits: formData.get("billingAiAddonUnits"),
    billingContractedMrrCents: formData.get("billingContractedMrrCents")
  });

  if (!parsed.success) {
    return {
      error: parsed.error.errors[0]?.message ?? "Nao foi possivel validar os termos comerciais."
    };
  }

  await prisma.organization.update({
    where: {
      id: user.organizationId
    },
    data: parsed.data
  });

  await createAuditEvent({
    organizationId: user.organizationId,
    actorId: user.id,
    action: "billing.commercial_terms_updated",
    entityType: "organization",
    entityId: user.organizationId,
    summary: "Termos comerciais do workspace atualizados.",
    metadata: parsed.data
  });

  revalidatePath("/settings");
  revalidatePath("/settings/billing");

  return {
    success: "Termos comerciais atualizados."
  };
}

export async function updateBillingProfile(
  _previousState: BillingProfileState,
  formData: FormData
): Promise<BillingProfileState> {
  const user = await requirePermission("manage_workspace");
  const parsed = billingProfileSchema.safeParse({
    billingLegalName: formData.get("billingLegalName"),
    billingTaxId: formData.get("billingTaxId"),
    billingBillingEmail: formData.get("billingBillingEmail"),
    billingCountryCode: formData.get("billingCountryCode"),
    billingAiOverageRateCents: formData.get("billingAiOverageRateCents")
  });

  if (!parsed.success) {
    return {
      error: parsed.error.errors[0]?.message ?? "Nao foi possivel validar o perfil fiscal."
    };
  }

  await prisma.organization.update({
    where: {
      id: user.organizationId
    },
    data: parsed.data
  });

  await createAuditEvent({
    organizationId: user.organizationId,
    actorId: user.id,
    action: "billing.profile_updated",
    entityType: "organization",
    entityId: user.organizationId,
    summary: "Perfil fiscal e de cobranca atualizado.",
    metadata: parsed.data
  });

  revalidatePath("/settings/billing");

  return {
    success: "Perfil fiscal atualizado."
  };
}

export async function createBillingUpgradeRequest(
  _previousState: BillingUpgradeRequestState,
  formData: FormData
): Promise<BillingUpgradeRequestState> {
  const user = await requirePermission("manage_workspace");
  const parsed = billingUpgradeRequestSchema.safeParse({
    targetPlan: formData.get("targetPlan"),
    targetInterval: formData.get("targetInterval"),
    requestedExtraSeats: formData.get("requestedExtraSeats"),
    requestedAiAddonUnits: formData.get("requestedAiAddonUnits"),
    requestedContractedMrrCents: formData.get("requestedContractedMrrCents") || undefined,
    note: formData.get("note") || undefined
  });

  if (!parsed.success) {
    return {
      error: parsed.error.errors[0]?.message ?? "Nao foi possivel validar o pedido de upgrade."
    };
  }

  const request = await prisma.billingUpgradeRequest.create({
    data: {
      organizationId: user.organizationId,
      requestedById: user.id,
      targetPlan: parsed.data.targetPlan,
      targetInterval: parsed.data.targetInterval,
      requestedExtraSeats: parsed.data.requestedExtraSeats,
      requestedAiAddonUnits: parsed.data.requestedAiAddonUnits,
      requestedContractedMrrCents: parsed.data.requestedContractedMrrCents ?? null,
      note: parsed.data.note || null
    }
  });

  await createAuditEvent({
    organizationId: user.organizationId,
    actorId: user.id,
    action: "billing.upgrade_request_created",
    entityType: "billing_upgrade_request",
    entityId: request.id,
    summary: `Pedido de upgrade aberto para ${request.targetPlan}.`,
    metadata: {
      requestId: request.id,
      targetPlan: request.targetPlan,
      targetInterval: request.targetInterval
    }
  });

  revalidatePath("/settings/billing");
  revalidatePath("/ops/revenue");

  return {
    success: "Pedido de upgrade enviado para aprovacao."
  };
}

export async function reviewBillingUpgradeRequest(
  requestId: string,
  decision: "approve" | "reject",
  formData: FormData
) {
  const reviewer = await requireRevenueOpsAccess();
  const parsed = billingUpgradeReviewSchema.safeParse({
    responseNote: formData.get("responseNote") || undefined
  });

  if (!parsed.success) {
    redirect("/ops/revenue?billing=invalid-review");
  }

  const request = await prisma.billingUpgradeRequest.findUnique({
    where: {
      id: requestId
    }
  });

  if (!request || request.status !== "PENDING") {
    redirect("/ops/revenue?billing=request-not-found");
  }

  if (decision === "approve") {
    await prisma.$transaction([
      prisma.organization.update({
        where: {
          id: request.organizationId
        },
        data: {
          billingPlan: request.targetPlan,
          billingExtraSeats: request.requestedExtraSeats,
          billingAiAddonUnits: request.requestedAiAddonUnits,
          billingContractedMrrCents: request.requestedContractedMrrCents ?? undefined
        }
      }),
      prisma.billingUpgradeRequest.update({
        where: {
          id: request.id
        },
        data: {
          status: "APPROVED",
          reviewedById: reviewer.id,
          reviewedAt: new Date(),
          responseNote: parsed.data.responseNote || null
        }
      })
    ]);
  } else {
    await prisma.billingUpgradeRequest.update({
      where: {
        id: request.id
      },
      data: {
        status: "REJECTED",
        reviewedById: reviewer.id,
        reviewedAt: new Date(),
        responseNote: parsed.data.responseNote || null
      }
    });
  }

  await createAuditEvent({
    organizationId: request.organizationId,
    actorId: reviewer.id,
    action: decision === "approve" ? "billing.upgrade_request_approved" : "billing.upgrade_request_rejected",
    entityType: "billing_upgrade_request",
    entityId: request.id,
    summary: `Pedido de upgrade ${decision === "approve" ? "aprovado" : "rejeitado"}.`,
    metadata: {
      requestId: request.id,
      decision,
      responseNote: parsed.data.responseNote || null
    }
  });

  revalidatePath("/settings/billing");
  revalidatePath("/ops/revenue");
  redirect(`/ops/revenue?billing=${decision === "approve" ? "approved" : "rejected"}`);
}

export async function updateOrganizationSettings(formData: FormData) {
  const user = await requirePermission("manage_workspace");

  const payload = organizationSettingsSchema.parse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    sizeRange: formData.get("sizeRange")
  });

  await prisma.organization.update({
    where: { id: user.organizationId },
    data: payload
  });

  await createAuditEvent({
    organizationId: user.organizationId,
    actorId: user.id,
    action: "organization.settings_updated",
    entityType: "organization",
    entityId: user.organizationId,
    summary: "Configuracoes da organizacao atualizadas.",
    metadata: payload
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

export async function upsertDepartmentPlaybook(formData: FormData) {
  const user = await requirePermission("manage_workspace");

  const payload = departmentPlaybookSchema.parse({
    playbookId: formData.get("playbookId") || undefined,
    department: formData.get("department"),
    title: formData.get("title"),
    screeningGuidance: formData.get("screeningGuidance"),
    interviewGuidance: formData.get("interviewGuidance"),
    decisionGuidance: formData.get("decisionGuidance"),
    strongSignals: formData.get("strongSignals"),
    riskSignals: formData.get("riskSignals")
  });

  const playbook = await prisma.departmentPlaybook.upsert({
    where: {
      organizationId_department: {
        organizationId: user.organizationId,
        department: payload.department
      }
    },
    update: {
      title: payload.title,
      screeningGuidance: payload.screeningGuidance,
      interviewGuidance: payload.interviewGuidance,
      decisionGuidance: payload.decisionGuidance,
      strongSignals: payload.strongSignals,
      riskSignals: payload.riskSignals
    },
    create: {
      organizationId: user.organizationId,
      department: payload.department,
      title: payload.title,
      screeningGuidance: payload.screeningGuidance,
      interviewGuidance: payload.interviewGuidance,
      decisionGuidance: payload.decisionGuidance,
      strongSignals: payload.strongSignals,
      riskSignals: payload.riskSignals
    }
  });

  await createAuditEvent({
    organizationId: user.organizationId,
    actorId: user.id,
    action: "organization.playbook_upserted",
    entityType: "department_playbook",
    entityId: playbook.id,
    summary: `Playbook de ${playbook.department} atualizado.`,
    metadata: {
      playbookId: playbook.id,
      department: playbook.department
    }
  });

  revalidatePath("/settings");
}

export async function deleteDepartmentPlaybook(playbookId: string) {
  const user = await requirePermission("manage_workspace");

  const playbook = await prisma.departmentPlaybook.findFirst({
    where: {
      id: playbookId,
      organizationId: user.organizationId
    }
  });

  if (!playbook) {
    return;
  }

  await prisma.departmentPlaybook.delete({
    where: {
      id: playbook.id
    }
  });

  await createAuditEvent({
    organizationId: user.organizationId,
    actorId: user.id,
    action: "organization.playbook_deleted",
    entityType: "department_playbook",
    entityId: playbook.id,
    summary: `Playbook de ${playbook.department} removido.`,
    metadata: {
      playbookId: playbook.id,
      department: playbook.department
    }
  });

  revalidatePath("/settings");
}

export async function inviteTeamMember(
  _previousState: TeamInviteState,
  formData: FormData
): Promise<TeamInviteState> {
  const user = await requirePermission("manage_team");
  const organization = await prisma.organization.findUnique({
    where: {
      id: user.organizationId
    },
    select: {
      billingPlan: true
    }
  });

  if (!organization) {
    return {
      error: "Organizacao nao encontrada."
    };
  }

  const memberLimit = await checkBillingLimit(user.organizationId, organization.billingPlan, "teamMembers");

  if (!memberLimit.allowed) {
    return {
      error: memberLimit.message
    };
  }

  const parsed = inviteTeamMemberSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
    message: formData.get("message")
  });

  if (!parsed.success) {
    return {
      error: parsed.error.errors[0]?.message ?? "Nao foi possivel validar o convite."
    };
  }

  const email = parsed.data.email.toLowerCase();

  if (!canAssignRole(user.role, parsed.data.role)) {
    return {
      error: "Seu papel atual nao permite convidar esse nivel de acesso."
    };
  }

  const [existingUser, existingInvite] = await Promise.all([
    prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          where: {
            organizationId: user.organizationId
          }
        }
      }
    }),
    prisma.organizationInvite.findFirst({
      where: {
        organizationId: user.organizationId,
        email,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: {
          gt: new Date()
        }
      }
    })
  ]);

  if (existingUser?.memberships.length) {
    return {
      error: "Esse email ja pertence a um membro do workspace."
    };
  }

  if (existingInvite) {
    return {
      error: "Ja existe um convite pendente para esse email."
    };
  }

  const token = randomBytes(24).toString("hex");
  const invite = await prisma.organizationInvite.create({
    data: {
      organizationId: user.organizationId,
      invitedById: user.id,
      email,
      role: parsed.data.role,
      token,
      message: parsed.data.message || null,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)
    },
    include: {
      organization: true
    }
  });

  if (isEmailConfigured()) {
    const acceptUrl = `${env.APP_URL}/invite/${invite.token}`;
    try {
      await getEmailTransporter().sendMail({
        from: env.EMAIL_FROM,
        to: invite.email,
        subject: `Convite para acessar ${invite.organization.name} no HireFlow AI`,
        html: `<p>Ola,</p><p>Voce recebeu um convite para acessar o workspace <strong>${invite.organization.name}</strong> como <strong>${getRoleLabel(invite.role)}</strong>.</p><p><a href="${acceptUrl}">Aceitar convite</a></p><p>${invite.message ?? "Sem mensagem adicional."}</p><p>Este link expira em 7 dias.</p>`,
        text: `Voce recebeu um convite para acessar ${invite.organization.name} no HireFlow AI como ${getRoleLabel(invite.role)}.\nAceite aqui: ${acceptUrl}\n\n${invite.message ?? ""}\n\nEste link expira em 7 dias.`
      });
    } catch (error) {
      logError("Failed to send team invite email", error, { inviteId: invite.id }, "settings");
    }
  }

  await createAuditEvent({
    organizationId: user.organizationId,
    actorId: user.id,
    action: "organization.invite_created",
    entityType: "organization_invite",
    entityId: invite.id,
    summary: `Convite criado para ${invite.email} com papel ${invite.role}.`,
    metadata: {
      inviteId: invite.id,
      email: invite.email,
      role: invite.role
    }
  });

  revalidatePath("/settings");

  return {
    success: isEmailConfigured()
      ? "Convite enviado com sucesso."
      : "Convite criado. Configure SMTP para enviar por email e use o link exibido em convites pendentes."
  };
}

export async function updateTeamMemberRole(
  memberId: string,
  _previousState: TeamRoleState,
  formData: FormData
): Promise<TeamRoleState> {
  const user = await requirePermission("manage_team");

  const parsed = updateTeamMemberRoleSchema.safeParse({
    role: formData.get("role")
  });

  if (!parsed.success) {
    return {
      error: parsed.error.errors[0]?.message ?? "Nao foi possivel validar o novo papel."
    };
  }

  const member = await prisma.organizationMembership.findFirst({
    where: {
      userId: memberId,
      organizationId: user.organizationId
    },
    include: {
      user: true
    }
  });

  if (!member) {
    return {
      error: "Membro nao encontrado."
    };
  }

  if (member.userId === user.id && member.role !== parsed.data.role) {
    return {
      error: "Troca de proprio papel foi bloqueada para evitar lockout."
    };
  }

  if (!canManageTeamMember(user.role, member.role) || !canAssignRole(user.role, parsed.data.role)) {
    return {
      error: "Seu papel atual nao permite essa alteracao."
    };
  }

  if (member.role === UserRole.OWNER && parsed.data.role !== UserRole.OWNER) {
    const ownerCount = await prisma.user.count({
      where: {
        memberships: {
          some: {
            organizationId: user.organizationId,
            role: UserRole.OWNER
          }
        }
      }
    });

    if (ownerCount <= 1) {
      return {
        error: "A organizacao precisa manter pelo menos um owner."
      };
    }
  }

  await prisma.organizationMembership.update({
    where: { id: member.id },
    data: {
      role: parsed.data.role
    }
  });

  if (member.user.organizationId === user.organizationId) {
    await prisma.user.update({
      where: {
        id: member.user.id
      },
      data: {
        role: parsed.data.role
      }
    });
  }

  await createAuditEvent({
    organizationId: user.organizationId,
    actorId: user.id,
    action: "organization.member_role_updated",
    entityType: "user",
    entityId: member.user.id,
    summary: `Papel de ${member.user.email} alterado para ${parsed.data.role}.`,
    metadata: {
      previousRole: member.role,
      nextRole: parsed.data.role
    }
  });

  revalidatePath("/settings");

  return {
    success: "Papel atualizado."
  };
}

export async function revokePendingInvite(inviteId: string) {
  const user = await requirePermission("manage_team");

  const invite = await prisma.organizationInvite.findFirst({
    where: {
      id: inviteId,
      organizationId: user.organizationId
    }
  });

  if (!invite) {
    return;
  }

  if (!canAssignRole(user.role, invite.role)) {
    return;
  }

  await prisma.organizationInvite.update({
    where: {
      id: invite.id
    },
    data: {
      revokedAt: new Date()
    }
  });

  await createAuditEvent({
    organizationId: user.organizationId,
    actorId: user.id,
    action: "organization.invite_revoked",
    entityType: "organization_invite",
    entityId: invite.id,
    summary: `Convite revogado para ${invite.email}.`,
    metadata: {
      inviteId: invite.id,
      email: invite.email,
      role: invite.role
    }
  });

  revalidatePath("/settings");
}
