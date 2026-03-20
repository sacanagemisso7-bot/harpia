"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import { auth, signIn } from "@/auth";
import type { AcceptInviteState } from "@/components/auth/accept-invite-form";
import { createAuditEvent } from "@/lib/audit/events";
import { setActiveOrganizationCookie } from "@/lib/auth/organization-context";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma/client";
import { acceptInviteSchema } from "@/lib/validations/team";

export async function acceptInvite(
  token: string,
  _previousState: AcceptInviteState,
  formData: FormData
): Promise<AcceptInviteState> {
  const parsed = acceptInviteSchema.safeParse({
    name: formData.get("name"),
    password: formData.get("password")
  });

  if (!parsed.success) {
    return {
      error: parsed.error.errors[0]?.message ?? "Nao foi possivel validar seus dados."
    };
  }

  const invite = await prisma.organizationInvite.findUnique({
    where: {
      token
    }
  });

  if (!invite || invite.revokedAt || invite.acceptedAt || invite.expiresAt <= new Date()) {
    return {
      error: "Esse convite nao esta mais disponivel."
    };
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email: invite.email
    }
  });

  if (existingUser) {
    return {
      error: "Ja existe uma conta com esse email. Entre normalmente ou use outro convite."
    };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const [user] = await prisma.$transaction([
    prisma.user.create({
      data: {
        organizationId: invite.organizationId,
        email: invite.email,
        name: parsed.data.name,
        passwordHash,
        emailVerified: new Date(),
        role: invite.role,
        memberships: {
          create: {
            organizationId: invite.organizationId,
            role: invite.role,
            isDefault: true
          }
        }
      }
    }),
    prisma.organizationInvite.update({
      where: {
        id: invite.id
      },
      data: {
        acceptedAt: new Date()
      }
    })
  ]);

  await createAuditEvent({
    organizationId: invite.organizationId,
    actorId: user.id,
    action: "organization.invite_accepted",
    entityType: "organization_invite",
    entityId: invite.id,
    summary: `${invite.email} aceitou o convite e ativou o acesso.`,
    metadata: {
      inviteId: invite.id,
      email: invite.email,
      role: invite.role
    }
  });

  try {
    await signIn("credentials", {
      email: invite.email,
      password: parsed.data.password,
      redirectTo: "/dashboard"
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        error: "Convite aceito, mas nao foi possivel autenticar automaticamente."
      };
    }

    throw error;
  }

  return {};
}

export async function acceptInviteWithExistingAccount(token: string) {
  const session = await auth();

  if (!session?.user?.id || !session.user.email) {
    redirect(`/login`);
  }

  const invite = await prisma.organizationInvite.findUnique({
    where: {
      token
    }
  });

  if (!invite || invite.revokedAt || invite.acceptedAt || invite.expiresAt <= new Date()) {
    redirect("/login");
  }

  if (session.user.email.toLowerCase() !== invite.email.toLowerCase()) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id
    },
    include: {
      memberships: {
        where: {
          organizationId: invite.organizationId
        }
      }
    }
  });

  if (!user) {
    redirect("/login");
  }

  if (!user.memberships.length) {
    await prisma.$transaction([
      prisma.organizationMembership.create({
        data: {
          organizationId: invite.organizationId,
          userId: user.id,
          role: invite.role
        }
      }),
      prisma.organizationInvite.update({
        where: {
          id: invite.id
        },
        data: {
          acceptedAt: new Date()
        }
      })
    ]);
  }

  await createAuditEvent({
    organizationId: invite.organizationId,
    actorId: user.id,
    action: "organization.invite_accepted",
    entityType: "organization_invite",
    entityId: invite.id,
    summary: `${invite.email} aceitou o convite com conta existente.`,
    metadata: {
      inviteId: invite.id,
      email: invite.email,
      role: invite.role,
      existingAccount: true
    }
  });

  await setActiveOrganizationCookie(invite.organizationId);
  redirect("/dashboard");
}
