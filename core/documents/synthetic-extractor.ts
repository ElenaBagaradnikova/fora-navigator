import { z } from "zod";
import type {
  DocumentExtractionRequest,
  DocumentExtractor,
} from "@/core/documents/extractor";
import {
  DocumentMetadataSchema,
  ExtractionResultSchema,
  SourceLocatorSchema,
  ValidationWarningSchema,
  type ExtractionResult,
} from "@/core/documents/schema";

const SyntheticCandidateFactTemplateSchema = z.object({
  id: z.string().min(1).max(120),
  subjectId: z.string().min(1).max(120),
  type: z.string().min(2).max(120),
  value: z.unknown(),
  sourceLocator: SourceLocatorSchema.optional(),
  jurisdictionRelevance: z.array(z.string().min(2).max(120)).max(12).default([]),
}).strict();

export const SyntheticDocumentFixtureSchema = z.object({
  id: z.string().min(1).max(120),
  candidateFacts: z.array(SyntheticCandidateFactTemplateSchema).max(100),
  warnings: z.array(ValidationWarningSchema).max(100).default([]),
}).strict();

export const SyntheticExtractionPayloadSchema = z.object({
  fixtureId: z.string().min(1).max(120),
}).strict();

export type SyntheticDocumentFixture = z.infer<
  typeof SyntheticDocumentFixtureSchema
>;
export type SyntheticDocumentFixtureInput = z.input<
  typeof SyntheticDocumentFixtureSchema
>;
export type SyntheticExtractionPayload = z.infer<
  typeof SyntheticExtractionPayloadSchema
>;

export class SyntheticDocumentExtractor
implements DocumentExtractor<SyntheticExtractionPayload> {
  readonly id = "deterministic-synthetic";
  readonly version = "1.0";

  private readonly fixtures: ReadonlyMap<string, SyntheticDocumentFixture>;

  constructor(
    fixtures: readonly SyntheticDocumentFixtureInput[],
    private readonly now: () => string,
  ) {
    this.fixtures = new Map(
      fixtures.map((fixture) => {
        const parsed = SyntheticDocumentFixtureSchema.parse(fixture);
        return [parsed.id, parsed] as const;
      }),
    );
  }

  async extract(
    request: DocumentExtractionRequest<SyntheticExtractionPayload>,
  ): Promise<ExtractionResult> {
    const document = DocumentMetadataSchema.parse(request.document);
    const payload = SyntheticExtractionPayloadSchema.parse(request.payload);
    const fixture = this.fixtures.get(payload.fixtureId);

    if (!fixture) {
      return ExtractionResultSchema.parse({
        status: "failed",
        document: { ...document, extractionStatus: "failed" },
        candidateFacts: [],
        provenance: [],
        errors: [{
          severity: "error",
          code: "SYNTHETIC_FIXTURE_NOT_FOUND",
          message: `Synthetic fixture ${payload.fixtureId} was not found`,
          path: ["payload", "fixtureId"],
        }],
        warnings: [],
      });
    }

    const extractedAt = this.now();
    const provenance = fixture.candidateFacts.map((fact) => ({
      id: `${document.id}:${fact.id}:provenance`,
      sourceDocumentId: document.id,
      extractorId: this.id,
      extractorVersion: this.version,
      extractedAt,
      sourceLocator: fact.sourceLocator,
    }));
    const candidateFacts = fixture.candidateFacts.map((fact, index) => ({
      id: fact.id,
      subjectId: fact.subjectId,
      type: fact.type,
      value: fact.value,
      origin: "document" as const,
      verificationStatus: "extracted" as const,
      sourceDocumentId: document.id,
      provenanceId: provenance[index].id,
      capturedAt: extractedAt,
      jurisdictionRelevance: fact.jurisdictionRelevance,
    }));

    return ExtractionResultSchema.parse({
      status: "succeeded",
      document: {
        ...document,
        extractionStatus: "extracted",
        extractedFactIds: candidateFacts.map((fact) => fact.id),
      },
      candidateFacts,
      provenance,
      errors: [],
      warnings: fixture.warnings,
    });
  }
}
