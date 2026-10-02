import { z } from "zod";

export const CaseJurisdictionSchema = z.object({
  countryCode: z.string().length(2),
  regionCode: z.string().min(2).max(80).optional(),
  municipality: z.string().min(2).max(120).optional(),
  packId: z.string().min(3).max(120),
  packVersion: z.string().min(1).max(40),
}).strict();

export const CaseLocationSchema = z.object({
  countryCode: z.string().length(2),
  region: z.string().min(2).max(120).optional(),
  municipality: z.string().min(2).max(120).optional(),
}).strict();

export const FactVerificationStatusSchema = z.enum([
  "extracted",
  "user_confirmed",
  "professional_confirmed",
  "authority_confirmed",
  "disputed",
]);

export const FactOriginSchema = z.enum([
  "user",
  "document",
  "professional",
  "authority",
  "system",
]);

export const CaseFactSchema = z.object({
  id: z.string().min(1).max(120),
  subjectId: z.string().min(1).max(120),
  type: z.string().min(2).max(120),
  value: z.unknown(),
  origin: FactOriginSchema,
  verificationStatus: FactVerificationStatusSchema,
  sourceDocumentId: z.string().min(1).max(120).optional(),
  capturedAt: z.string().datetime(),
  validFrom: z.string().date().optional(),
  validTo: z.string().date().optional(),
  jurisdictionRelevance: z.array(z.string().min(2).max(120)).max(12).default([]),
}).strict();

export const CaseDocumentSchema = z.object({
  id: z.string().min(1).max(120),
  documentType: z.string().min(2).max(120),
  originCountry: z.string().length(2),
  originJurisdiction: z.string().min(2).max(120).optional(),
  language: z.string().min(2).max(20),
  issuerType: z.string().min(2).max(120),
  issueDate: z.string().date().optional(),
  expiryDate: z.string().date().optional(),
  extractionStatus: z.enum(["not_started", "processing", "extracted", "confirmed", "failed"]),
  extractedFactIds: z.array(z.string().min(1).max(120)).max(100).default([]),
  confirmedFactIds: z.array(z.string().min(1).max(120)).max(100).default([]),
  storageReference: z.string().max(500).optional(),
  sensitivity: z.enum(["standard", "personal", "special_category"]),
}).strict();

export const CasePersonSchema = z.object({
  id: z.string().min(1).max(120),
  role: z.enum(["child", "young_adult", "adult", "caregiver", "other"]),
  ageRange: z.enum(["0-5", "6-11", "12-17", "18-25", "26-64", "65+"]).optional(),
  supportNeeds: z.array(z.string().min(2).max(120)).max(12).default([]),
}).strict();

export const CaseV3Schema = z.object({
  id: z.string().min(1).max(120),
  schemaVersion: z.literal("3.0"),
  version: z.number().int().positive(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  currentLocation: CaseLocationSchema,
  currentJurisdiction: CaseJurisdictionSchema,
  preferredLanguages: z.array(z.string().min(2).max(20)).min(1).max(6),
  people: z.array(CasePersonSchema).min(1).max(12),
  needs: z.array(z.string().min(2).max(120)).max(24).default([]),
  goals: z.array(z.string().min(2).max(240)).max(24).default([]),
  facts: z.array(CaseFactSchema).max(500).default([]),
  unknowns: z.array(z.string().min(2).max(240)).max(100).default([]),
  documentMetadata: z.array(CaseDocumentSchema).max(100).default([]),
}).strict();

export type CaseJurisdiction = z.infer<typeof CaseJurisdictionSchema>;
export type CaseLocation = z.infer<typeof CaseLocationSchema>;
export type CaseFact = z.infer<typeof CaseFactSchema>;
export type CaseDocument = z.infer<typeof CaseDocumentSchema>;
export type CasePerson = z.infer<typeof CasePersonSchema>;
export type CaseV3 = z.infer<typeof CaseV3Schema>;
