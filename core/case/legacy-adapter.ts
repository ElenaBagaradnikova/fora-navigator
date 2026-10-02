import type { UserCase } from "@/lib/schemas";
import { CaseV3Schema, type CasePerson, type CaseV3 } from "@/core/case/schema";

const AGE_RANGE_MAP = {
  "0-5": "0-5",
  "6-11": "6-11",
  "12-17": "12-17",
  "18-25": "18-25",
  adult: "26-64",
} as const;

export const ASTURIAS_PACK = {
  countryCode: "ES",
  regionCode: "ASTURIAS",
  packId: "ES-ASTURIAS",
  packVersion: "0.1",
} as const;

export function userCaseToCaseV3(
  legacy: UserCase,
  now = new Date().toISOString(),
): CaseV3 {
  const people: CasePerson[] = legacy.household.map((person) => ({
    id: person.id,
    role: person.role,
    ageRange: AGE_RANGE_MAP[person.ageRange],
    supportNeeds: person.supportNeeds,
  }));

  const needs = [...new Set(legacy.needs.map((need) => need.category))];

  const unknowns = [
    ...(legacy.immigrationStatus === "unknown" ? ["immigration_status"] : []),
    ...(legacy.healthcareCoverage === "unknown" ? ["healthcare_coverage"] : []),
    ...(legacy.registeredAtAddress === "unknown" ? ["address_registration"] : []),
    ...(legacy.diagnosticDocuments === "unknown" ? ["diagnostic_documents"] : []),
  ];

  return CaseV3Schema.parse({
    id: legacy.id,
    schemaVersion: "3.0",
    version: 1,
    createdAt: now,
    updatedAt: now,
    currentLocation: {
      countryCode: legacy.country,
      region: legacy.region,
      municipality: legacy.municipality,
    },
    currentJurisdiction: {
      ...ASTURIAS_PACK,
      municipality: legacy.municipality,
    },
    preferredLanguages: [legacy.locale],
    people,
    needs,
    goals: [legacy.mainProblem],
    facts: [],
    unknowns,
    documentMetadata: [],
  });
}
