import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/lib/auth/current-user";
import { env } from "@/lib/env";

export function canAccessRevenueOps(email?: string | null) {
  if (!email || !env.REVENUE_OPS_EMAILS) {
    return false;
  }

  const allowedEmails = env.REVENUE_OPS_EMAILS.split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return allowedEmails.includes(email.toLowerCase());
}

export async function requireRevenueOpsAccess() {
  const user = await requireCurrentUser();

  if (!canAccessRevenueOps(user.email)) {
    redirect("/dashboard");
  }

  return user;
}
