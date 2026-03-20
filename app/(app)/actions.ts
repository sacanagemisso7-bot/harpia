"use server";

import { revalidatePath } from "next/cache";

import { requireCurrentUser } from "@/lib/auth/current-user";
import { setActiveOrganizationCookie } from "@/lib/auth/organization-context";

export async function switchActiveOrganization(formData: FormData) {
  const user = await requireCurrentUser();
  const organizationId = String(formData.get("organizationId") ?? "");

  const membership = user.memberships.find((item) => item.organizationId === organizationId);

  if (!membership) {
    return;
  }

  await setActiveOrganizationCookie(organizationId);
  revalidatePath("/dashboard");
  revalidatePath("/people/command-center");
  revalidatePath("/employees");
  revalidatePath("/requests");
  revalidatePath("/people/tasks");
  revalidatePath("/people/onboarding");
  revalidatePath("/people/offboarding");
  revalidatePath("/people/calendar");
  revalidatePath("/people/compliance");
  revalidatePath("/hiring");
  revalidatePath("/jobs");
  revalidatePath("/candidates");
  revalidatePath("/pipeline");
  revalidatePath("/interviews");
  revalidatePath("/analytics");
  revalidatePath("/communications");
  revalidatePath("/settings");
}
