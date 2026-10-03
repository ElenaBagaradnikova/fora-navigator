import { describe, expect, it } from "vitest";
import { UserCaseSchema } from "@/lib/schemas";
import { userCaseToCaseV3 } from "@/core/case/legacy-adapter";

const asturiasJurisdiction = {
  countryCode: "ES",
  regionCode: "ASTURIAS",
  municipality: "Oviedo",
  packId: "ES-ASTURIAS",
  packVersion: "0.1",
} as const;

const legacyCase = UserCaseSchema.parse({
  id: "legacy-001",
  locale: "ru",
  country: "ES",
  region: "Asturias",
  municipality: "Oviedo",
  narrative: "Нужна навигация по признанию инвалидности и документам в Астурии.",
  household: [{
    id: "child-1",
    role: "child",
    ageRange: "12-17",
    supportNeeds: ["communication"],
  }],
  immigrationStatus: "unknown",
  healthcareCoverage: "yes",
  registeredAtAddress: "yes",
  diagnosticDocuments: "copies",
  spanishLevel: "basic",
  mainProblem: "Понять следующие шаги в Астурии",
  needs: [{
    category: "disability_recognition",
    priority: "high",
    detail: "Нужно понять порядок действий",
  }],
  urgency: {
    level: "standard",
    signals: [],
    stopNormalFlow: false,
    message: "Нет признаков экстренной ситуации",
  },
});

describe("legacy UserCase -> CaseV3 adapter", () => {
  it("preserves the stable Asturias MVP while creating a v3 case", () => {
    const value = userCaseToCaseV3(
      legacyCase,
      asturiasJurisdiction,
      "2026-10-02T19:00:00.000Z",
    );

    expect(value.schemaVersion).toBe("3.0");
    expect(value.currentLocation).toEqual({
      countryCode: "ES",
      region: "Asturias",
      municipality: "Oviedo",
    });
    expect(value.currentJurisdiction.packId).toBe("ES-ASTURIAS");
    expect(value.preferredLanguages).toEqual(["ru"]);
    expect(value.people[0].ageRange).toBe("12-17");
    expect(value.needs).toContain("disability_recognition");
  });

  it("keeps unknown legacy answers explicit instead of inferring them", () => {
    const value = userCaseToCaseV3(
      legacyCase,
      asturiasJurisdiction,
      "2026-10-02T19:00:00.000Z",
    );

    expect(value.unknowns).toContain("immigration_status");
    expect(value.facts).toEqual([]);
    expect(value.documentMetadata).toEqual([]);
  });

  it("uses the supplied jurisdiction without inferring it from current location", () => {
    const value = userCaseToCaseV3(
      legacyCase,
      {
        countryCode: "ES",
        regionCode: "TEST-REGION",
        packId: "ES-TEST-REGION",
        packVersion: "0.1",
      },
      "2026-10-02T19:00:00.000Z",
    );

    expect(value.currentLocation.region).toBe("Asturias");
    expect(value.currentJurisdiction.packId).toBe("ES-TEST-REGION");
    expect(value.currentJurisdiction.municipality).toBeUndefined();
  });
});
