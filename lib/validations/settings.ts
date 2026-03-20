import { z } from "zod";

export const organizationSettingsSchema = z.object({
  name: z.string().min(2, "Informe o nome da organizacao."),
  slug: z
    .string()
    .min(2, "Informe um slug.")
    .regex(/^[a-z0-9-]+$/, "Use apenas letras minusculas, numeros e hifens."),
  sizeRange: z.string().min(2, "Informe a faixa de tamanho.")
});

export type OrganizationSettingsInput = z.infer<typeof organizationSettingsSchema>;
