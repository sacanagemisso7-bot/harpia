"use server";

import { SavedViewType } from "@prisma/client";
import { revalidatePath } from "next/cache";

import type { SavedViewState } from "@/components/saved-views/saved-view-form";
import { requirePermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma/client";
import { getSavedViewBasePath } from "@/lib/saved-views/config";
import { savedViewSchema } from "@/lib/validations/saved-view";

async function persistSavedView(
  user: { id: string; organizationId: string },
  formData: FormData
): Promise<SavedViewState> {
  const parsed = savedViewSchema.safeParse({
    name: formData.get("name"),
    query: formData.get("query"),
    type: formData.get("type")
  });

  if (!parsed.success) {
    return {
      error: parsed.error.errors[0]?.message ?? "Não foi possível salvar a vista."
    };
  }

  try {
    await prisma.savedView.upsert({
      where: {
        userId_type_name: {
          userId: user.id,
          type: parsed.data.type,
          name: parsed.data.name
        }
      },
      update: {
        query: parsed.data.query
      },
      create: {
        organizationId: user.organizationId,
        userId: user.id,
        type: parsed.data.type,
        name: parsed.data.name,
        query: parsed.data.query
      }
    });
  } catch (error) {
    console.error("Failed to persist saved view", error);
    return {
      error: "Não foi possível salvar essa vista agora."
    };
  }

  revalidatePath(getSavedViewBasePath(parsed.data.type));

  return {
    success: "Vista salva com sucesso."
  };
}

export async function createSavedView(
  _previousState: SavedViewState,
  formData: FormData
): Promise<SavedViewState> {
  const user = await requirePermission("save_views");
  return persistSavedView(user, formData);
}

export async function saveWorkspaceViewAction(formData: FormData): Promise<SavedViewState> {
  const user = await requirePermission("save_views");
  return persistSavedView(user, formData);
}

export async function deleteSavedViewAction(formData: FormData): Promise<void> {
  const user = await requirePermission("save_views");
  const savedViewId = String(formData.get("savedViewId") ?? "");
  const type = String(formData.get("type") ?? "") as SavedViewType;

  if (!savedViewId || !Object.values(SavedViewType).includes(type)) {
    return;
  }

  await prisma.savedView.deleteMany({
    where: {
      id: savedViewId,
      userId: user.id,
      organizationId: user.organizationId,
      type
    }
  });

  revalidatePath(getSavedViewBasePath(type));
}
