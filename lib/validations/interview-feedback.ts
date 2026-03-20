import { InterviewRecommendation } from "@prisma/client";
import { z } from "zod";

const scoreField = z.coerce.number().int().min(1, "Use notas de 1 a 5.").max(5, "Use notas de 1 a 5.");
const scorecardRatingSchema = z.object({
  scorecardItemId: z.string().min(1),
  score: scoreField
});

export const interviewFeedbackSchema = z.object({
  overallScore: scoreField,
  communicationScore: scoreField,
  roleFitScore: scoreField,
  technicalScore: z.union([scoreField, z.literal("")]).transform((value) => (value === "" ? undefined : value)),
  recommendation: z.nativeEnum(InterviewRecommendation),
  strengths: z.string().min(10, "Descreva os pontos fortes com mais contexto."),
  concerns: z.string().optional(),
  notes: z.string().optional(),
  scorecardRatings: z
    .union([z.string(), z.array(scorecardRatingSchema), z.undefined()])
    .transform((value) => {
      if (!value) {
        return [];
      }

      if (typeof value === "string") {
        const parsed = JSON.parse(value) as unknown;
        return z.array(scorecardRatingSchema).parse(parsed);
      }

      return value;
    })
});

export type InterviewFeedbackInput = z.infer<typeof interviewFeedbackSchema>;
