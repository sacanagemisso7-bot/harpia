import { CandidateSource } from "@prisma/client";
import { z } from "zod";

export const candidateFormSchema = z.object({
  fullName: z.string().min(2, "Informe o nome completo do candidato."),
  email: z.string().email("Informe um email valido.").optional().or(z.literal("")),
  phone: z.string().optional(),
  linkedinUrl: z.string().url("Informe uma URL valida do LinkedIn.").optional().or(z.literal("")),
  portfolioUrl: z.string().url("Informe uma URL valida do portfolio.").optional().or(z.literal("")),
  location: z.string().optional(),
  summary: z.string().optional(),
  yearsExperience: z.coerce.number().min(0).max(60).optional(),
  highestEducation: z.string().optional(),
  currentTitle: z.string().optional(),
  currentCompany: z.string().optional(),
  source: z.nativeEnum(CandidateSource)
});

export type CandidateFormInput = z.infer<typeof candidateFormSchema>;

export const resumeUploadSchema = z.object({
  candidateId: z.string().min(1),
  fileName: z.string().min(1),
  mimeType: z.string().refine((value) => value === "application/pdf", {
    message: "Apenas curriculos em PDF sao suportados no MVP."
  }),
  sizeBytes: z.number().int().positive().max(8 * 1024 * 1024, {
    message: "O arquivo precisa ter no maximo 8MB."
  })
});
