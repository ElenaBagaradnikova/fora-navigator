import { describe, expect, it } from "vitest";
import { CaseV3Schema } from "@/core/case/schema";

describe("Case v3 cross-border semantics", () => {
  it("keeps current jurisdiction separate from document origin", () => {
    const value = CaseV3Schema.parse({
      id: "case-asturias-001",
      schemaVersion: "3.0",
      version: 1,
      createdAt: "2026-10-02T18:00:00.000Z",
      updatedAt: "2026-10-02T18:00:00.000Z",
      currentLocation: {
        countryCode: "ES",
        region: "Asturias",
        municipality: "Oviedo",
      },
      currentJurisdiction: {
        countryCode: "ES",
        regionCode: "ASTURIAS",
        municipality: "Oviedo",
        packId: "ES-ASTURIAS",
        packVersion: "0.1",
      },
      preferredLanguages: ["ru", "es"],
      people: [{
        id: "child-1",
        role: "child",
        ageRange: "12-17",
        supportNeeds: ["communication"],
      }],
      needs: ["disability_recognition"],
      goals: ["understand next steps in Asturias"],
      facts: [{
        id: "fact-1",
        subjectId: "child-1",
        type: "historical_diagnosis_recorded",
        value: "autism",
        origin: "document",
        verificationStatus: "extracted",
        sourceDocumentId: "doc-ru-1",
        capturedAt: "2026-10-02T18:00:00.000Z",
        jurisdictionRelevance: ["ES-ASTURIAS"],
      }],
      unknowns: ["Spanish disability recognition status"],
      documentMetadata: [{
        id: "doc-ru-1",
        documentType: "diagnostic_report",
        originCountry: "RU",
        language: "ru",
        issuerType: "specialist",
        issueDate: "2024-05-20",
        extractionStatus: "extracted",
        extractedFactIds: ["fact-1"],
        confirmedFactIds: [],
        sensitivity: "special_category",
      }],
    });

    expect(value.currentJurisdiction.packId).toBe("ES-ASTURIAS");
    expect(value.documentMetadata[0].originCountry).toBe("RU");
    expect(value.facts[0].verificationStatus).toBe("extracted");
    expect(value.unknowns).toContain("Spanish disability recognition status");
  });

  it("does not permit an extracted document fact to masquerade as authority-confirmed", () => {
    const extracted = {
      id: "fact-1",
      subjectId: "child-1",
      type: "historical_diagnosis_recorded",
      value: "autism",
      origin: "document" as const,
      verificationStatus: "extracted" as const,
      sourceDocumentId: "doc-1",
      capturedAt: "2026-10-02T18:00:00.000Z",
      jurisdictionRelevance: ["ES-ASTURIAS"],
    };

    expect(extracted.verificationStatus).not.toBe("authority_confirmed");
  });
});
