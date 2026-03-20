import { InterviewStatus } from "@prisma/client";
import { z } from "zod";

export const interviewFormSchema = z
  .object({
    title: z.string().min(2, "Informe um titulo para a entrevista."),
    startsAt: z.string().min(1, "Informe o inicio."),
    endsAt: z.string().min(1, "Informe o fim."),
    location: z.string().optional(),
    meetingUrl: z.string().url("Informe uma URL valida.").optional().or(z.literal("")),
    notes: z.string().optional(),
    status: z.nativeEnum(InterviewStatus).default(InterviewStatus.SCHEDULED)
  })
  .refine((data) => new Date(data.endsAt).getTime() > new Date(data.startsAt).getTime(), {
    message: "O fim precisa ser posterior ao inicio.",
    path: ["endsAt"]
  });

export type InterviewFormInput = z.infer<typeof interviewFormSchema>;
