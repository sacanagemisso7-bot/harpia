import { z } from "zod";

export const hiringNoteSchema = z.object({
  content: z.string().min(6, "Escreva uma nota com pelo menos 6 caracteres.")
});

export type HiringNoteInput = z.infer<typeof hiringNoteSchema>;
