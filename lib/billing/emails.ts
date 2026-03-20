import { UserRole } from "@prisma/client";

import { createAuditEvent } from "@/lib/audit/events";
import { env } from "@/lib/env";
import { getEmailTransporter, isEmailConfigured } from "@/lib/email/transporter";
import { logError } from "@/lib/observability/logger";
import { prisma } from "@/lib/prisma/client";

type BillingEmailKind =
  | "trial_ending"
  | "trial_expired"
  | "past_due_day_0"
  | "past_due_day_3"
  | "past_due_day_7";

type SendBillingEmailParams = {
  organizationId: string;
  kind: BillingEmailKind;
  subject: string;
  html: string;
  text: string;
};

const EMAIL_ACTIONS: Record<BillingEmailKind, string> = {
  trial_ending: "billing.email_trial_ending_sent",
  trial_expired: "billing.email_trial_expired_sent",
  past_due_day_0: "billing.email_past_due_day_0_sent",
  past_due_day_3: "billing.email_past_due_day_3_sent",
  past_due_day_7: "billing.email_past_due_day_7_sent"
};

async function shouldSendBillingEmail(organizationId: string, kind: BillingEmailKind, hoursWindow: number) {
  const recentEmail = await prisma.auditEvent.findFirst({
    where: {
      organizationId,
      action: EMAIL_ACTIONS[kind],
      createdAt: {
        gte: new Date(Date.now() - hoursWindow * 60 * 60 * 1000)
      }
    }
  });

  return !recentEmail;
}

export async function sendBillingEmailToWorkspaceAdmins({
  organizationId,
  kind,
  subject,
  html,
  text
}: SendBillingEmailParams) {
  if (!isEmailConfigured()) {
    return {
      delivered: false,
      reason: "email-not-configured"
    };
  }

  const shouldSend = await shouldSendBillingEmail(
    organizationId,
    kind,
    kind.startsWith("past_due") ? 24 : 72
  );

  if (!shouldSend) {
    return {
      delivered: false,
      reason: "already-sent"
    };
  }

  const memberships = await prisma.organizationMembership.findMany({
    where: {
      organizationId,
      role: {
        in: [UserRole.OWNER, UserRole.ADMIN]
      }
    },
    include: {
      user: true,
      organization: true
    }
  });

  const recipients = Array.from(new Set(memberships.map((membership) => membership.user.email).filter(Boolean)));

  if (!recipients.length) {
    return {
      delivered: false,
      reason: "no-recipients"
    };
  }

  try {
    await getEmailTransporter().sendMail({
      from: env.EMAIL_FROM,
      to: recipients.join(", "),
      subject,
      html,
      text
    });

    await createAuditEvent({
      organizationId,
      action: EMAIL_ACTIONS[kind],
      entityType: "organization",
      entityId: organizationId,
      summary: `Email de billing enviado para ${memberships[0]?.organization.name ?? "workspace"}.`,
      metadata: {
        kind,
        recipients
      }
    });

    return {
      delivered: true
    };
  } catch (error) {
    logError("Failed to send billing email", error, { organizationId, kind, recipients }, "billing");
    return {
      delivered: false,
      reason: "send-failed"
    };
  }
}
