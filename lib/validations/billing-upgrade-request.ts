import { BillingPlan } from "@prisma/client";
import { z } from "zod";

export const billingUpgradeRequestSchema = z.object({
  targetPlan: z.nativeEnum(BillingPlan),
  targetInterval: z.enum(["monthly", "annual"]),
  requestedExtraSeats: z.coerce.number().int().min(0).max(500),
  requestedAiAddonUnits: z.coerce.number().int().min(0).max(500),
  requestedContractedMrrCents: z.coerce.number().int().min(0).max(100_000_000).optional(),
  note: z.string().trim().max(2000).optional()
});

export const billingUpgradeReviewSchema = z.object({
  responseNote: z.string().trim().max(2000).optional()
});
