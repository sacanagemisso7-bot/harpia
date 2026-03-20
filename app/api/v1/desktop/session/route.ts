import { NextResponse } from "next/server";
import { z } from "zod";

import { authenticateDesktopUser } from "@/lib/auth/desktop-session";

const desktopSessionSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  organizationId: z.string().optional()
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = desktopSessionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid credentials payload" }, { status: 400 });
  }

  const session = await authenticateDesktopUser(parsed.data);

  if (!session) {
    return NextResponse.json({ ok: false, error: "Invalid email or password" }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    token: session.token,
    user: session.user,
    memberships: session.memberships
  });
}
