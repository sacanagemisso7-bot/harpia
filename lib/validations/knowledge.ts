import { KnowledgeDocumentType } from "@prisma/client";
import { z } from "zod";

export const knowledgeDocumentUploadSchema = z.object({
  title: z.string().min(3, "Informe um titulo com pelo menos 3 caracteres."),
  description: z.string().max(1000).optional().or(z.literal("")),
  type: z.nativeEnum(KnowledgeDocumentType),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive().max(20 * 1024 * 1024)
});

const blankToUndefined = (value: unknown) => (value === "" ? undefined : value);

export const publishPolicyDocumentSchema = z.object({
  documentId: z.string().min(1, "Selecione uma policy pronta para publicar."),
  versionLabel: z.preprocess(blankToUndefined, z.string().min(2, "Informe uma versao como v2.0.").optional()),
  supersedesDocumentId: z.preprocess(blankToUndefined, z.string().optional()),
  requiresAcknowledgement: z
    .preprocess((value) => value === "on" || value === true, z.boolean())
    .default(true)
});
