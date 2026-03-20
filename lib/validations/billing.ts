import { z } from "zod";

export const billingCommercialTermsSchema = z.object({
  billingExtraSeats: z.coerce.number().int().min(0).max(500),
  billingAiAddonUnits: z.coerce.number().int().min(0).max(500),
  billingContractedMrrCents: z.coerce.number().int().min(0).max(100_000_000)
});
