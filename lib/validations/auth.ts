import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().email("Informe um email valido."),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres.")
});

export type SignInInput = z.infer<typeof signInSchema>;
