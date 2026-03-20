import { z } from "zod";

export const demoRequestSchema = z.object({
  name: z.string().min(2, "Informe seu nome."),
  email: z.string().email("Informe um email valido."),
  company: z.string().min(2, "Informe o nome da empresa."),
  role: z.string().optional(),
  teamSize: z.string().optional(),
  message: z.string().optional(),
  sourcePage: z.string().optional()
});

export type DemoRequestInput = z.infer<typeof demoRequestSchema>;
