import { z } from "zod";

export const billingProfileSchema = z.object({
  billingLegalName: z.string().trim().min(2).max(120),
  billingTaxId: z.string().trim().min(4).max(40),
  billingBillingEmail: z.string().trim().email(),
  billingCountryCode: z.string().trim().min(2).max(8),
  billingAiOverageRateCents: z.coerce.number().int().min(0).max(100_000)
});
