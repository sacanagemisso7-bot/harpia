import { EmailTemplateType } from "@prisma/client";
import { z } from "zod";

export const emailTemplateFormSchema = z.object({
  type: z.nativeEnum(EmailTemplateType),
  name: z.string().min(2, "Informe um nome para o template."),
  subject: z.string().min(5, "Informe um assunto claro."),
  bodyHtml: z.string().min(20, "Informe um corpo HTML minimo."),
  bodyText: z.string().min(20, "Informe um corpo em texto.")
});

export type EmailTemplateFormInput = z.infer<typeof emailTemplateFormSchema>;
