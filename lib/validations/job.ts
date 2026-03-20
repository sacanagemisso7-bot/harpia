import { AutomationTrigger, CriterionType, JobStatus } from "@prisma/client";
import { z } from "zod";

export const jobCriterionSchema = z.object({
  id: z.string().optional(),
  type: z.nativeEnum(CriterionType),
  label: z.string().min(2, "Defina um criterio claro."),
  weight: z.coerce.number().int().min(1).max(10),
  notes: z.string().optional(),
  order: z.coerce.number().int().min(0)
});

export const jobScorecardItemSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(2, "Defina um item claro para o scorecard."),
  category: z.string().min(2, "Informe a categoria do item."),
  description: z.string().optional(),
  weight: z.coerce.number().int().min(1).max(10),
  isRequired: z.boolean(),
  order: z.coerce.number().int().min(0)
});

export const jobAutomationRuleSchema = z.object({
  id: z.string().optional(),
  trigger: z.nativeEnum(AutomationTrigger),
  targetStageId: z.string().min(1, "Selecione uma etapa de destino."),
  enabled: z.boolean(),
  notes: z.string().optional()
});

export const jobFormSchema = z.object({
  title: z.string().min(2, "Informe o titulo da vaga."),
  department: z.string().min(2, "Informe a area."),
  location: z.string().min(2, "Informe a localizacao."),
  employmentType: z.string().min(2, "Informe o tipo de contratacao."),
  seniority: z.string().min(2, "Informe a senioridade."),
  summary: z.string().min(20, "Escreva um resumo mais objetivo da vaga."),
  description: z.string().min(50, "Descreva melhor o contexto da vaga."),
  educationLevel: z.string().optional(),
  minExperienceYears: z.coerce.number().int().min(0).max(50).optional(),
  status: z.nativeEnum(JobStatus),
  criteria: z
    .array(jobCriterionSchema)
    .min(1, "Inclua pelo menos um criterio obrigatorio ou desejavel."),
  scorecardItems: z
    .array(jobScorecardItemSchema)
    .min(1, "Inclua pelo menos um item no scorecard da vaga."),
  automationRules: z.array(jobAutomationRuleSchema)
}).superRefine((value, context) => {
  const seenTriggers = new Set<AutomationTrigger>();

  for (const [index, rule] of value.automationRules.entries()) {
    if (seenTriggers.has(rule.trigger)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["automationRules", index, "trigger"],
        message: "Use no maximo uma automacao por trigger."
      });
    }

    seenTriggers.add(rule.trigger);
  }
});

export type JobFormInput = z.infer<typeof jobFormSchema>;
