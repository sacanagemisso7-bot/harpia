import { z } from "zod";

const stringArrayFromField = z.union([z.string(), z.array(z.string()), z.undefined()]).transform((value) => {
  if (!value) {
    return [];
  }

  if (typeof value === "string") {
    return value
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  return value;
});

export const departmentPlaybookSchema = z.object({
  playbookId: z.string().optional(),
  department: z.string().min(2, "Informe o departamento do playbook."),
  title: z.string().min(2, "Dê um nome claro para o playbook."),
  screeningGuidance: z.string().min(20, "Descreva a orientacao de triagem com mais contexto."),
  interviewGuidance: z.string().min(20, "Descreva a orientacao de entrevista com mais contexto."),
  decisionGuidance: z.string().min(20, "Descreva a orientacao de decisao com mais contexto."),
  strongSignals: stringArrayFromField,
  riskSignals: stringArrayFromField
});

export type DepartmentPlaybookInput = z.infer<typeof departmentPlaybookSchema>;
