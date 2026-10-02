import { z } from "zod";

export const JurisdictionRuleSchema = z.object({
  id: z.string().min(3).max(160),
  packId: z.string().min(3).max(120),
  version: z.string().min(1).max(40),
  domain: z.enum([
    "healthcare",
    "disability_recognition",
    "education",
    "social",
    "documents",
    "migration",
  ]),
  status: z.enum(["draft", "validated", "retired"]),
  effectiveFrom: z.string().date().optional(),
  effectiveTo: z.string().date().optional(),
  sourceIds: z.array(z.string().min(1).max(120)).max(12).default([]),
}).strict();

export type JurisdictionRule = z.infer<typeof JurisdictionRuleSchema>;

/**
 * Deliberately empty until Asturias procedures are encoded from reviewed
 * official sources. Product v3 must not manufacture administrative rules.
 */
export const AsturiasRules: JurisdictionRule[] = [];
