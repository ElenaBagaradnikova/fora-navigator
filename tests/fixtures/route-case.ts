import { CaseV3Schema, type CaseV3 } from "@/core/case/schema";

export const SYNTHETIC_ROUTE_GENERATED_AT = "2026-10-03T15:00:00.000Z";

export function createSyntheticRouteCase(): CaseV3 {
  return CaseV3Schema.parse({
    id: "synthetic-route-case-1",
    schemaVersion: "3.0",
    version: 8,
    createdAt: "2026-10-03T10:00:00.000Z",
    updatedAt: "2026-10-03T13:00:00.000Z",
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
    preferredLanguages: ["ru", "es"],
    people: [{
      id: "synthetic-child-1",
      role: "child",
      ageRange: "12-17",
      supportNeeds: [],
    }],
    needs: ["disability_recognition"],
    goals: ["understand synthetic route behavior"],
    facts: [{
      id: "candidate-historical-diagnosis-1",
      subjectId: "synthetic-child-1",
      type: "historical_diagnosis_recorded",
      value: "autism",
      origin: "document",
      verificationStatus: "user_confirmed",
      sourceDocumentId: "synthetic-ru-document-1",
      provenanceId: "synthetic-provenance-1",
      candidateFactId: "candidate-historical-diagnosis-1",
      userConfirmation: {
        candidateFactId: "candidate-historical-diagnosis-1",
        decision: "confirmed",
        confirmedAt: "2026-10-03T13:00:00.000Z",
      },
      capturedAt: "2026-10-03T12:00:00.000Z",
      jurisdictionRelevance: [],
    }],
    unknowns: ["Spanish disability recognition status"],
    documentMetadata: [{
      id: "synthetic-ru-document-1",
      documentType: "diagnostic_report",
      originCountry: "RU",
      language: "ru",
      issuerType: "synthetic_specialist",
      issueDate: "2024-05-20",
      extractionStatus: "confirmed",
      extractedFactIds: ["candidate-historical-diagnosis-1"],
      confirmedFactIds: ["candidate-historical-diagnosis-1"],
      sensitivity: "special_category",
    }],
    documentProvenance: [{
      id: "synthetic-provenance-1",
      sourceDocumentId: "synthetic-ru-document-1",
      extractorId: "deterministic-synthetic",
      extractorVersion: "1.0",
      extractedAt: "2026-10-03T12:00:00.000Z",
      sourceLocator: {
        page: 1,
        section: "Synthetic diagnosis field",
      },
    }],
    routeState: {
      status: "stale",
      needsRecalculation: true,
      invalidatedAt: "2026-10-03T13:00:00.000Z",
      invalidationReason: "case_fact_changed",
    },
  });
}
