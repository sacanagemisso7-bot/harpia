import { SavedViewType } from "@prisma/client";
import { z } from "zod";

export const savedViewSchema = z.object({
  name: z.string().min(2, "Informe um nome para a view."),
  query: z.string(),
  type: z.nativeEnum(SavedViewType)
});

export type SavedViewInput = z.infer<typeof savedViewSchema>;
