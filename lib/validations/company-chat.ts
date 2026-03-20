import { z } from "zod";

export const companyChatMessageSchema = z.object({
  message: z.string().min(2, "Digite uma mensagem para continuar.").max(4000),
  threadId: z.string().optional(),
  title: z.string().optional()
});
