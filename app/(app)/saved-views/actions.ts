"use server";

import { SavedViewType } from "@prisma/client";
import { revalidatePath } from "next/cache";

import type { SavedViewState } from "@/components/saved-views/saved-view-form";
import { requirePermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma/client";
import { savedViewSchema } from "@/lib/validations/saved-view";

export async function createSavedView(
  _previousState: SavedViewState,
  formData: FormData
): Promise<SavedViewState> {
  const user = await requirePermission("save_views");

  const parsed = savedViewSchema.safeParse({
    name: formData.get("name"),
    query: formData.get("query"),
    type: formData.get("type")
  });

  if (!parsed.success) {
    return {
      error: parsed.error.errors[0]?.message ?? "Nao foi possivel salvar a view."
    };
  }

  try {
    await prisma.savedView.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        type: parsed.data.type,
        name: parsed.data.name,
        query: parsed.data.query
      }
    });
  } catch (error) {
    console.error("Failed to create saved view", error);
    return {
      error: "Ja existe uma view com esse nome nesse contexto."
    };
  }

  const path =
    parsed.data.type === SavedViewType.JOBS
      ? "/jobs"
      : parsed.data.type === SavedViewType.CANDIDATES
        ? "/candidates"
        : "/pipeline";

  revalidatePath(path);

  return {
    success: "View salva com sucesso."
  };
}
