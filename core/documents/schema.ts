import { z } from "zod";
import { FactVerificationStatusSchema } from "@/core/case/verification";

const IdentifierSchema = z.string().min(1).max(120);

export const DocumentMetadataSchema = z.object({
  id: IdentifierSchema,
  documentType: z.string().min(2).max(120),
  originCountry: z.string().regex(/^[A-Z]{2}$/, "Use an ISO 3166-1 alpha-2 country code"),
  originJurisdiction: z.string().min(2).max(120).optional(),
  language: z.string().min(2).max(20),
  issuerType: z.string().min(2).max(120),
  issueDate: z.string().date().optional(),
  expiryDate: z.string().date().optional(),
  extractionStatus: z.enum([
    "not_started",
    "processing",
    "extracted",
    "confirmed",
    "failed",
  ]),
  extractedFactIds: z.array(IdentifierSchema).max(100).default([]),
  confirmedFactIds: z.array(IdentifierSchema).max(100).default([]),
  storageReference: z.string().max(500).optional(),
  sensitivity: z.enum(["standard", "personal", "special_category"]),
}).strict();

export const SourceLocatorSchema = z.object({
  page: z.number().int().positive().optional(),
  section: z.string().min(1).max(160).optional(),
  field: z.string().min(1).max(160).optional(),
}).strict();

export const ProvenanceSchema = z.object({
  id: IdentifierSchema,
  sourceDocumentId: IdentifierSchema,
  extractorId: IdentifierSchema,
  extractorVersion: z.string().min(1).max(40),
  extractedAt: z.string().datetime(),
  sourceLocator: SourceLocatorSchema.optional(),
}).strict();

export const CandidateFactSchema = z.object({
  id: IdentifierSchema,
  subjectId: IdentifierSchema,
  type: z.string().min(2).max(120),
  value: z.unknown(),
  origin: z.literal("document"),
  verificationStatus: FactVerificationStatusSchema,
  sourceDocumentId: IdentifierSchema,
  provenanceId: IdentifierSchema,
  capturedAt: z.string().datetime(),
  jurisdictionRelevance: z.array(z.string().min(2).max(120)).max(12).default([]),
}).strict();

const ValidationIssueFields = {
  code: z.string().regex(/^[A-Z][A-Z0-9_]*$/).max(80),
  message: z.string().min(1).max(500),
  path: z.array(z.union([z.string(), z.number().int().nonnegative()])).max(20).default([]),
};

export const ValidationErrorSchema = z.object({
  severity: z.literal("error"),
  ...ValidationIssueFields,
}).strict();

export const ValidationWarningSchema = z.object({
  severity: z.literal("warning"),
  ...ValidationIssueFields,
}).strict();

export const ExtractionResultSchema = z.object({
  status: z.enum(["succeeded", "partial", "failed"]),
  document: DocumentMetadataSchema,
  candidateFacts: z.array(CandidateFactSchema).max(100),
  provenance: z.array(ProvenanceSchema).max(100),
  errors: z.array(ValidationErrorSchema).max(100).default([]),
  warnings: z.array(ValidationWarningSchema).max(100).default([]),
}).strict().superRefine((result, context) => {
  const provenanceById = new Map(result.provenance.map((item) => [item.id, item]));

  result.candidateFacts.forEach((fact, index) => {
    if (fact.verificationStatus !== "extracted") {
      context.addIssue({
        code: "custom",
        path: ["candidateFacts", index, "verificationStatus"],
        message: "An extractor may only emit candidate facts with extracted status",
      });
    }

    const provenance = provenanceById.get(fact.provenanceId);
    if (!provenance) {
      context.addIssue({
        code: "custom",
        path: ["candidateFacts", index, "provenanceId"],
        message: "Candidate fact must reference provenance in this result",
      });
      return;
    }

    if (
      fact.sourceDocumentId !== result.document.id
      || provenance.sourceDocumentId !== result.document.id
    ) {
      context.addIssue({
        code: "custom",
        path: ["candidateFacts", index, "sourceDocumentId"],
        message: "Candidate fact and provenance must reference the extracted document",
      });
    }
  });

  if (result.status === "failed" && result.errors.length === 0) {
    context.addIssue({
      code: "custom",
      path: ["errors"],
      message: "A failed extraction must include at least one validation error",
    });
  }

  if (result.status === "succeeded" && result.errors.length > 0) {
    context.addIssue({
      code: "custom",
      path: ["errors"],
      message: "A successful extraction cannot include validation errors",
    });
  }
});

export type DocumentMetadata = z.infer<typeof DocumentMetadataSchema>;
export type Provenance = z.infer<typeof ProvenanceSchema>;
export type CandidateFact = z.infer<typeof CandidateFactSchema>;
export type ValidationError = z.infer<typeof ValidationErrorSchema>;
export type ValidationWarning = z.infer<typeof ValidationWarningSchema>;
export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;
