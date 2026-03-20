import { EmployeeStatus } from "@prisma/client";
import { z } from "zod";

import { parseDateInputValue } from "@/lib/dates/parse-date-input";

const blankToUndefined = (value: unknown) => (value === "" ? undefined : value);

const optionalString = () => z.preprocess(blankToUndefined, z.string().optional());
const optionalEmail = () => z.preprocess(blankToUndefined, z.string().email().optional());
const optionalDate = () => z.preprocess((value) => parseDateInputValue(value), z.date().optional());

export const employeeFormSchema = z.object({
  fullName: z.string().min(2, "Informe o nome completo do colaborador."),
  preferredName: optionalString(),
  workEmail: optionalEmail(),
  personalEmail: optionalEmail(),
  phone: optionalString(),
  title: z.string().min(2, "Informe o cargo."),
  department: z.string().min(2, "Informe o time ou area."),
  managerEmployeeId: optionalString(),
  location: optionalString(),
  employmentType: optionalString(),
  status: z.nativeEnum(EmployeeStatus).default(EmployeeStatus.ONBOARDING),
  startDate: optionalDate(),
  endDate: optionalDate(),
  notes: optionalString(),
  linkedUserId: optionalString(),
  sourceApplicationId: optionalString()
});

export type EmployeeFormInput = z.infer<typeof employeeFormSchema>;
