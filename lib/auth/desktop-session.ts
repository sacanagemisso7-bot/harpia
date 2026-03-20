import { createHmac, timingSafeEqual } from "node:crypto";

import { auth } from "@/auth";
import { verifyPassword } from "@/lib/auth/password";
import { hasPermission, type AppPermission } from "@/lib/auth/permission-matrix";
import { prisma } from "@/lib/prisma/client";

const DESKTOP_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14;

type DesktopSessionPayload = {
  userId: string;
  organizationId: string;
  issuedAt: number;
  expiresAt: number;
};

function getSignature(value: string) {
  return createHmac("sha256", process.env.AUTH_SECRET || "desktop-secret").update(value).digest("base64url");
}

export function issueDesktopSessionToken(input: { userId: string; organizationId: string }) {
  const payload: DesktopSessionPayload = {
    userId: input.userId,
    organizationId: input.organizationId,
    issuedAt: Date.now(),
    expiresAt: Date.now() + DESKTOP_SESSION_TTL_MS
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = getSignature(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifyDesktopSessionToken(token: string) {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = getSignature(encodedPayload);

  if (signature.length !== expectedSignature.length) {
    return null;
  }

  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return null;
  }

  const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as DesktopSessionPayload;

  if (payload.expiresAt < Date.now()) {
    return null;
  }

  return payload;
}

export async function authenticateDesktopUser(input: { email: string; password: string; organizationId?: string }) {
  const user = await prisma.user.findUnique({
    where: {
      email: input.email.toLowerCase()
    },
    include: {
      memberships: {
        include: {
          organization: true
        },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }]
      }
    }
  });

  if (!user) {
    return null;
  }

  const isValidPassword = await verifyPassword(input.password, user.passwordHash);

  if (!isValidPassword) {
    return null;
  }

  const membership =
    user.memberships.find((item) => item.organizationId === input.organizationId) ??
    user.memberships.find((item) => item.organizationId === user.organizationId) ??
    user.memberships[0];

  if (!membership) {
    return null;
  }

  return {
    token: issueDesktopSessionToken({
      userId: user.id,
      organizationId: membership.organizationId
    }),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: membership.role,
      organizationId: membership.organizationId,
      organizationName: membership.organization.name
    },
    memberships: user.memberships.map((item) => ({
      organizationId: item.organizationId,
      organizationName: item.organization.name,
      role: item.role,
      isDefault: item.isDefault
    }))
  };
}

export async function requireDesktopApiUser(request: Request, permission?: AppPermission) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : null;

  if (!token) {
    const webSession = await auth();

    if (!webSession?.user?.id) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: {
        id: webSession.user.id
      },
      include: {
        organization: true
      }
    });

    if (!user) {
      return null;
    }

    if (permission && !hasPermission(user.role, permission)) {
      return null;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      organizationName: user.organization.name
    };
  }

  const payload = verifyDesktopSessionToken(token);

  if (!payload) {
    return null;
  }

  const membership = await prisma.organizationMembership.findFirst({
    where: {
      userId: payload.userId,
      organizationId: payload.organizationId
    },
    include: {
      user: true,
      organization: true
    }
  });

  if (!membership) {
    return null;
  }

  if (permission && !hasPermission(membership.role, permission)) {
    return null;
  }

  return {
    id: membership.user.id,
    name: membership.user.name,
    email: membership.user.email,
    role: membership.role,
    organizationId: membership.organizationId,
    organizationName: membership.organization.name
  };
}
