import { SavedViewType } from "@prisma/client";

import { prisma } from "@/lib/prisma/client";

export async function getSavedViews(userId: string, organizationId: string, type: SavedViewType) {
  return prisma.savedView.findMany({
    where: {
      userId,
      organizationId,
      type
    },
    orderBy: { createdAt: "desc" }
  });
}
