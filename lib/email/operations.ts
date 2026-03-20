import { UserRole } from "@prisma/client";

import { createAuditEvent } from "@/lib/audit/events";
import { env } from "@/lib/env";
import { getEmailTransporter, isEmailConfigured } from "@/lib/email/transporter";
import { logError } from "@/lib/observability/logger";
import { prisma } from "@/lib/prisma/client";

type SendOperationalEmailInput = {
  organizationId: string;
  subject: string;
  html: string;
  text: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  recipients?: string[];
  roles?: UserRole[];
};

const DEFAULT_OPERATIONAL_ROLES: UserRole[] = [UserRole.OWNER, UserRole.ADMIN, UserRole.PEOPLE_ADMIN, UserRole.PEOPLE_OPS];

export async function getWorkspaceOperationalRecipients(organizationId: string, roles = DEFAULT_OPERATIONAL_ROLES) {
  const memberships = await prisma.organizationMembership.findMany({
    where: {
      organizationId,
      role: {
        in: roles
      }
    },
    include: {
      user: true
    }
  });

  return Array.from(new Set(memberships.map((membership) => membership.user.email).filter(Boolean)));
}

export async function sendOperationalEmail(input: SendOperationalEmailInput) {
  if (!isEmailConfigured()) {
    return {
      delivered: false,
      reason: "email-not-configured"
    };
  }

  const recipients =
    input.recipients?.length
      ? Array.from(new Set(input.recipients.filter(Boolean)))
      : await getWorkspaceOperationalRecipients(input.organizationId, input.roles);

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
      subject: input.subject,
      html: input.html,
      text: input.text
    });

    await createAuditEvent({
      organizationId: input.organizationId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      summary: `Email operacional enviado: ${input.subject}.`,
      metadata: {
        recipients,
        ...(input.metadata ?? {})
      }
    });

    return {
      delivered: true
    };
  } catch (error) {
    logError("Failed to send operational email", error, { organizationId: input.organizationId, action: input.action }, "email");
    return {
      delivered: false,
      reason: "send-failed"
    };
  }
}
