import { PeopleWorkflowKind, PeopleWorkflowStepStatus } from "@prisma/client";
import { z } from "zod";

export const workflowRunFormSchema = z.object({
  employeeId: z.string().min(1),
  kind: z.nativeEnum(PeopleWorkflowKind),
  templateId: z.preprocess((value) => (value === "" ? undefined : value), z.string().optional())
});

export const workflowStepStatusSchema = z.object({
  stepId: z.string().min(1),
  status: z.nativeEnum(PeopleWorkflowStepStatus)
});
