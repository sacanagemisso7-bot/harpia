import { EmployeeCheckInType } from "@prisma/client";
import { z } from "zod";

import { parseDateInputValue } from "@/lib/dates/parse-date-input";

const blankToUndefined = (value: unknown) => (value === "" ? undefined : value);

export const employeeCheckInSchema = z.object({
  employeeId: z.string().min(1),
  type: z.nativeEnum(EmployeeCheckInType),
  title: z.string().min(2, "Informe um titulo curto para o registro."),
  summary: z.preprocess(blankToUndefined, z.string().max(4000).optional()),
  followUpAt: z.preprocess(
    (value) => parseDateInputValue(value),
    z.date().optional()
  )
});

export type EmployeeCheckInInput = z.infer<typeof employeeCheckInSchema>;
