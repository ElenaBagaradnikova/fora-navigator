import { describe, expect, it } from "vitest";
import { CaseV3Schema } from "@/core/case/schema";
import {
  ApplyUserConfirmationError,
  applyUserConfirmation,
} from "@/core/documents/apply-user-confirmation";
import { SyntheticDocumentExtractor } from "@/core/documents/synthetic-extractor";

const extractedAt = "2026-10-03T12:00:00.000Z";
const confirmedAt = "2026-10-03T13:00:00.000Z";

async function createSyntheticScenario() {
  const extractor = new SyntheticDocumentExtractor([{
    id: "fictional-ru-diagnostic-record",
    candidateFacts: [{
      id: "candidate-historical-diagnosis-1",
      subjectId: "synthetic-child-1",
      type: "historical_diagnosis_recorded",
      value: "autism",
      sourceLocator: { page: 1, section: "Synthetic diagnosis field" },
    }],
    warnings: [],
  }], () => extractedAt);

  const extraction = await extractor.extract({
    document: {
      id: "synthetic-ru-document-1",
      documentType: "diagnostic_report",
      originCountry: "RU",
      language: "ru",
      issuerType: "synthetic_specialist",
      issueDate: "2024-05-20",
      extractionStatus: "not_started",
      extractedFactIds: [],
      confirmedFactIds: [],
      sensitivity: "special_category",
    },
    payload: { fixtureId: "fictional-ru-diagnostic-record" },
  });
  const candidateFact = extraction.candidateFacts[0];
  const provenance = extraction.provenance[0];
  const confirmation = {
    candidateFactId: candidateFact.id,
    decision: "confirmed" as const,
    confirmedAt,
  };
  const caseValue = CaseV3Schema.parse({
    id: "synthetic-case-asturias-1",
    schemaVersion: "3.0",
    version: 7,
    createdAt: "2026-10-03T10:00:00.000Z",
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
    preferredLanguages: ["ru", "es"],
    people: [{
      id: "synthetic-child-1",
      role: "child",
      ageRange: "12-17",
      supportNeeds: [],
    }],
    needs: ["disability_recognition"],
    goals: ["understand administrative status"],
    facts: [],
    unknowns: ["Spanish disability recognition status"],
    documentMetadata: [extraction.document],
    documentProvenance: [],
    routeState: {
      status: "current",
      needsRecalculation: false,
    },
  });

  return {
    caseValue,
    candidateFact,
    confirmation,
    provenance,
  };
}

describe("applyUserConfirmation", () => {
  it("atomically confirms a synthetic foreign-document fact and preserves its provenance", async () => {
    const scenario = await createSyntheticScenario();

    const result = applyUserConfirmation(scenario);

    expect(result.changed).toBe(true);
    expect(result.caseValue.version).toBe(scenario.caseValue.version + 1);
    expect(result.caseValue.updatedAt).toBe(confirmedAt);
    expect(result.confirmedFact).toMatchObject({
      type: "historical_diagnosis_recorded",
      value: "autism",
      verificationStatus: "user_confirmed",
      sourceDocumentId: "synthetic-ru-document-1",
      provenanceId: scenario.provenance.id,
      candidateFactId: scenario.candidateFact.id,
      userConfirmation: scenario.confirmation,
    });
    expect(result.caseValue.documentProvenance).toEqual([scenario.provenance]);
    expect(result.caseValue.documentMetadata[0]).toMatchObject({
      originCountry: "RU",
      language: "ru",
      confirmedFactIds: [scenario.candidateFact.id],
      extractionStatus: "confirmed",
    });
    expect(result.caseValue.routeState).toEqual({
      status: "stale",
      needsRecalculation: true,
      invalidatedAt: confirmedAt,
      invalidationReason: "case_fact_changed",
    });
    expect(result.caseValue.unknowns).toContain(
      "Spanish disability recognition status",
    );
    expect(result.caseValue.facts.some(
      (fact) => [
        "spanish_disability_recognition",
        "grado_de_discapacidad",
        "entitlement",
      ].includes(fact.type),
    )).toBe(false);
    expect(result.caseValue.facts.some(
      (fact) => ["authority_confirmed", "professional_confirmed"].includes(
        fact.verificationStatus,
      ),
    )).toBe(false);
  });

  it("requires an explicit user confirmation", async () => {
    const scenario = await createSyntheticScenario();
    const before = structuredClone(scenario.caseValue);

    expect(() => applyUserConfirmation({
      caseValue: scenario.caseValue,
      candidateFact: scenario.candidateFact,
      provenance: scenario.provenance,
    })).toThrow();
    expect(scenario.caseValue).toEqual(before);
  });

  it("rejects an invalid candidate fact without changing the case", async () => {
    const scenario = await createSyntheticScenario();
    const before = structuredClone(scenario.caseValue);

    expect(() => applyUserConfirmation({
      ...scenario,
      candidateFact: { ...scenario.candidateFact, subjectId: "" },
    })).toThrow();
    expect(scenario.caseValue).toEqual(before);
  });

  it("rejects missing provenance without changing the case", async () => {
    const scenario = await createSyntheticScenario();
    const before = structuredClone(scenario.caseValue);

    expect(() => applyUserConfirmation({
      caseValue: scenario.caseValue,
      candidateFact: scenario.candidateFact,
      confirmation: scenario.confirmation,
    })).toThrow();
    expect(scenario.caseValue).toEqual(before);
  });

  it("is idempotent for the same confirmation", async () => {
    const scenario = await createSyntheticScenario();
    const first = applyUserConfirmation(scenario);
    const second = applyUserConfirmation({
      ...scenario,
      caseValue: first.caseValue,
    });

    expect(first.changed).toBe(true);
    expect(second.changed).toBe(false);
    expect(second.caseValue.version).toBe(first.caseValue.version);
    expect(second.caseValue.facts).toHaveLength(1);
    expect(second.caseValue.documentProvenance).toHaveLength(1);
    expect(second.caseValue.documentMetadata[0].confirmedFactIds).toEqual([
      scenario.candidateFact.id,
    ]);
  });

  it("fails atomically when provenance points to another document", async () => {
    const scenario = await createSyntheticScenario();
    const before = structuredClone(scenario.caseValue);

    expect(() => applyUserConfirmation({
      ...scenario,
      provenance: {
        ...scenario.provenance,
        sourceDocumentId: "different-document",
      },
    })).toThrow(ApplyUserConfirmationError);
    expect(scenario.caseValue).toEqual(before);
  });

  it("rejects a candidate whose source document is not in the case", async () => {
    const scenario = await createSyntheticScenario();
    const before = structuredClone(scenario.caseValue);

    expect(() => applyUserConfirmation({
      ...scenario,
      caseValue: {
        ...scenario.caseValue,
        documentMetadata: [],
      },
    })).toThrow(ApplyUserConfirmationError);
    expect(scenario.caseValue).toEqual(before);
  });

  it("rejects a candidate not linked by the source document", async () => {
    const scenario = await createSyntheticScenario();
    const before = structuredClone(scenario.caseValue);

    expect(() => applyUserConfirmation({
      ...scenario,
      caseValue: {
        ...scenario.caseValue,
        documentMetadata: scenario.caseValue.documentMetadata.map((document) => ({
          ...document,
          extractedFactIds: [],
        })),
      },
    })).toThrow(ApplyUserConfirmationError);
    expect(scenario.caseValue).toEqual(before);
  });

  it.each(["professional_confirmed", "authority_confirmed"] as const)(
    "cannot elevate or re-confirm a %s candidate fact",
    async (verificationStatus) => {
      const scenario = await createSyntheticScenario();
      const before = structuredClone(scenario.caseValue);

      expect(() => applyUserConfirmation({
        ...scenario,
        candidateFact: { ...scenario.candidateFact, verificationStatus },
      })).toThrow(ApplyUserConfirmationError);
      expect(scenario.caseValue).toEqual(before);
    },
  );

  it("increments the case version exactly once for a real change", async () => {
    const scenario = await createSyntheticScenario();
    const result = applyUserConfirmation(scenario);

    expect(result.caseValue.version).toBe(8);
    expect(scenario.caseValue.version).toBe(7);
  });

  it("invalidates a current route without constructing a new route", async () => {
    const scenario = await createSyntheticScenario();
    const result = applyUserConfirmation(scenario);

    expect(result.caseValue.routeState.status).toBe("stale");
    expect(result.caseValue.routeState.needsRecalculation).toBe(true);
    expect(result.caseValue.routeState.invalidatedAt).toBe(confirmedAt);
  });
});
