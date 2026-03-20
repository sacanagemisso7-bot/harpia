import { PeopleTaskPriority, PeopleTaskStatus } from "@prisma/client";
import { z } from "zod";

import { parseDateInputValue } from "@/lib/dates/parse-date-input";

const blankToUndefined = (value: unknown) => (value === "" ? undefined : value);

export const peopleTaskFormSchema = z.object({
  title: z.string().min(3, "Informe um titulo para a tarefa."),
  description: z.preprocess(blankToUndefined, z.string().max(4000).optional()),
  assigneeUserId: z.preprocess(blankToUndefined, z.string().optional()),
  assigneeEmployeeId: z.preprocess(blankToUndefined, z.string().optional()),
  relatedEmployeeId: z.preprocess(blankToUndefined, z.string().optional()),
  priority: z.nativeEnum(PeopleTaskPriority),
  dueAt: z.preprocess(
    (value) => parseDateInputValue(value),
    z.date().optional()
  ),
  sourceType: z.string().default("manual"),
  sourceId: z.preprocess(blankToUndefined, z.string().optional())
});

export const peopleTaskStatusSchema = z.object({
  taskId: z.string().min(1),
  status: z.nativeEnum(PeopleTaskStatus)
});

export const peopleTaskCommentSchema = z.object({
  taskId: z.string().min(1),
  message: z.string().min(2, "Escreva um comentario curto.")
});

export type PeopleTaskFormInput = z.infer<typeof peopleTaskFormSchema>;
