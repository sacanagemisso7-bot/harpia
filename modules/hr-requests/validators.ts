import { HrRequestCategory, HrRequestStatus, PeopleTaskPriority } from "@prisma/client";
import { z } from "zod";

import { parseDateInputValue } from "@/lib/dates/parse-date-input";

const blankToUndefined = (value: unknown) => (value === "" ? undefined : value);

export const hrRequestFormSchema = z.object({
  requesterEmployeeId: z.preprocess(blankToUndefined, z.string().optional()),
  assigneeUserId: z.preprocess(blankToUndefined, z.string().optional()),
  title: z.string().min(3, "Informe um titulo para a solicitacao."),
  description: z.string().min(5, "Descreva a solicitacao."),
  category: z.nativeEnum(HrRequestCategory),
  priority: z.nativeEnum(PeopleTaskPriority),
  dueAt: z.preprocess(
    (value) => parseDateInputValue(value),
    z.date().optional()
  )
});

export const hrRequestStatusSchema = z.object({
  requestId: z.string().min(1),
  status: z.nativeEnum(HrRequestStatus)
});

export const hrRequestCommentSchema = z.object({
  requestId: z.string().min(1),
  message: z.string().min(2, "Escreva um comentario curto."),
  isInternal: z.boolean().default(false)
});

export type HrRequestFormInput = z.infer<typeof hrRequestFormSchema>;
