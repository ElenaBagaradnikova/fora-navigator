import { describe, expect, it } from "vitest";
import { CaseV3Schema } from "@/core/case/schema";
import {
  CandidateFactConfirmationError,
  confirmCandidateFact,
} from "@/core/documents/confirmation";
import {
  DocumentMetadataSchema,
  ExtractionResultSchema,
} from "@/core/documents/schema";
import { SyntheticDocumentExtractor } from "@/core/documents/synthetic-extractor";

const extractedAt = "2026-10-03T12:00:00.000Z";
const documentMetadata = DocumentMetadataSchema.parse({
  id: "synthetic-ru-document-1",
  documentType: "diagnostic_report",
  originCountry: "RU",
  language: "ru",
  issuerType: "synthetic_specialist",
  issueDate: "2024-05-20",
  extractionStatus: "not_started",
  sensitivity: "special_category",
});

const extractor = new SyntheticDocumentExtractor([
  {
    id: "fictional-ru-diagnostic-record",
    candidateFacts: [{
      id: "candidate-historical-diagnosis-1",
      subjectId: "synthetic-child-1",
      type: "historical_diagnosis_recorded",
      value: "autism",
      sourceLocator: { page: 1, section: "Synthetic diagnosis field" },
    }],
    warnings: [{
      severity: "warning",
      code: "SYNTHETIC_INPUT_ONLY",
      message: "This fixture is synthetic and is not a real medical record",
      path: [],
    }],
  },
], () => extractedAt);

describe("Document Intelligence contracts", () => {
  it("extracts a foreign historical fact without creating Spanish administrative status", async () => {
    const extraction = await extractor.extract({
      document: documentMetadata,
      payload: { fixtureId: "fictional-ru-diagnostic-record" },
    });

    expect(extraction.status).toBe("succeeded");
    expect(extraction.document.originCountry).toBe("RU");
    expect(extraction.document.language).toBe("ru");
    expect(extraction.candidateFacts).toHaveLength(1);
    expect(extraction.candidateFacts[0]).toMatchObject({
      type: "historical_diagnosis_recorded",
      value: "autism",
      verificationStatus: "extracted",
      sourceDocumentId: documentMetadata.id,
    });
    expect(extraction.candidateFacts.some(
      (fact) => fact.type === "spanish_disability_recognition",
    )).toBe(false);
    expect(extraction.warnings[0].code).toBe("SYNTHETIC_INPUT_ONLY");
  });

  it("links every candidate fact to deterministic provenance", async () => {
    const extraction = await extractor.extract({
      document: documentMetadata,
      payload: { fixtureId: "fictional-ru-diagnostic-record" },
    });

    expect(extraction.provenance).toEqual([{
      id: "synthetic-ru-document-1:candidate-historical-diagnosis-1:provenance",
      sourceDocumentId: "synthetic-ru-document-1",
      extractorId: "deterministic-synthetic",
      extractorVersion: "1.0",
      extractedAt,
      sourceLocator: { page: 1, section: "Synthetic diagnosis field" },
    }]);
    expect(extraction.candidateFacts[0].provenanceId).toBe(
      extraction.provenance[0].id,
    );
  });

  it("requires an explicit operation before a candidate becomes user-confirmed", async () => {
    const extraction = await extractor.extract({
      document: documentMetadata,
      payload: { fixtureId: "fictional-ru-diagnostic-record" },
    });

    const confirmedFact = confirmCandidateFact(extraction.candidateFacts[0]);

    expect(extraction.candidateFacts[0].verificationStatus).toBe("extracted");
    expect(confirmedFact.verificationStatus).toBe("user_confirmed");
    expect(confirmedFact.verificationStatus).not.toBe("authority_confirmed");
    expect(confirmedFact.provenanceId).toBe(extraction.provenance[0].id);
  });

  it("preserves unknown Spanish administrative status after confirmation", async () => {
    const extraction = await extractor.extract({
      document: documentMetadata,
      payload: { fixtureId: "fictional-ru-diagnostic-record" },
    });
    const confirmedFact = confirmCandidateFact(extraction.candidateFacts[0]);
    const caseValue = CaseV3Schema.parse({
      id: "synthetic-case-asturias-1",
      schemaVersion: "3.0",
      version: 1,
      createdAt: extractedAt,
      updatedAt: extractedAt,
      currentLocation: {
        countryCode: "ES",
        region: "Asturias",
      },
      currentJurisdiction: {
        countryCode: "ES",
        regionCode: "ASTURIAS",
        packId: "ES-ASTURIAS",
        packVersion: "0.1",
      },
      preferredLanguages: ["ru"],
      people: [{
        id: "synthetic-child-1",
        role: "child",
        ageRange: "12-17",
        supportNeeds: [],
      }],
      needs: ["disability_recognition"],
      goals: ["understand administrative status"],
      facts: [confirmedFact],
      unknowns: ["Spanish disability recognition status"],
      documentMetadata: [{
        ...extraction.document,
        confirmedFactIds: [confirmedFact.id],
        extractionStatus: "confirmed",
      }],
    });

    expect(caseValue.currentJurisdiction.packId).toBe("ES-ASTURIAS");
    expect(caseValue.unknowns).toContain("Spanish disability recognition status");
    expect(caseValue.facts).toHaveLength(1);
    expect(caseValue.facts[0].type).toBe("historical_diagnosis_recorded");
    expect(caseValue.facts.some(
      (fact) => fact.verificationStatus === "authority_confirmed",
    )).toBe(false);
  });

  it("rejects invalid metadata and invalid extraction results with Zod", () => {
    expect(DocumentMetadataSchema.safeParse({
      ...documentMetadata,
      originCountry: "Russia",
    }).success).toBe(false);

    expect(ExtractionResultSchema.safeParse({
      status: "succeeded",
      document: { ...documentMetadata, extractionStatus: "extracted" },
      candidateFacts: [{
        id: "candidate-1",
        subjectId: "synthetic-child-1",
        type: "historical_diagnosis_recorded",
        value: "autism",
        origin: "document",
        verificationStatus: "authority_confirmed",
        sourceDocumentId: documentMetadata.id,
        provenanceId: "missing-provenance",
        capturedAt: extractedAt,
        jurisdictionRelevance: [],
      }],
      provenance: [],
      errors: [],
      warnings: [],
    }).success).toBe(false);
  });

  it("returns a validation error for an unknown synthetic fixture", async () => {
    const extraction = await extractor.extract({
      document: documentMetadata,
      payload: { fixtureId: "missing-fixture" },
    });

    expect(extraction.status).toBe("failed");
    expect(extraction.errors[0]).toMatchObject({
      severity: "error",
      code: "SYNTHETIC_FIXTURE_NOT_FOUND",
    });
    expect(extraction.candidateFacts).toEqual([]);
  });

  it("does not allow repeated confirmation to elevate a fact", async () => {
    const extraction = await extractor.extract({
      document: documentMetadata,
      payload: { fixtureId: "fictional-ru-diagnostic-record" },
    });
    const confirmedFact = confirmCandidateFact(extraction.candidateFacts[0]);

    expect(() => confirmCandidateFact({
      ...extraction.candidateFacts[0],
      verificationStatus: confirmedFact.verificationStatus,
    })).toThrow(CandidateFactConfirmationError);
  });
});
