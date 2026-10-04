import {
  defineJurisdictionPack,
  type JurisdictionPack,
} from "@/core/jurisdictions/pack";
import {
  defineRouteRule,
  missingFactRequirement,
} from "@/core/routes/rule";

const historicalRecordRequirement = missingFactRequirement(
  "historical_diagnosis_recorded",
  ["user_confirmed"],
  "This synthetic fixture requires an explicitly user-confirmed historical record.",
);

const administrativeStatusRequirement = missingFactRequirement(
  "administrative_recognition_status",
  ["authority_confirmed"],
  "Administrative recognition remains unknown and must not be inferred.",
);

export function createSyntheticJurisdictionPack(): JurisdictionPack {
  const clarifyUnknownStatus = defineRouteRule({
    id: "SYNTHETIC-PACK-RULE-001",
    version: "1.0-test",
    scope: {
      kind: "jurisdiction",
      jurisdictionId: "ES-ASTURIAS",
    },
    inputs: [historicalRecordRequirement],
    step: {
      id: "synthetic-pack-clarify-status",
      title: "Clarify synthetic administrative status",
      description: "Keep a missing administrative status unresolved without deriving it from a foreign document.",
      phase: "NOW",
      dependencies: [],
      requiredDocuments: [],
      expectedOutcome: "The synthetic status is supplied explicitly or remains unresolved.",
    },
    evidenceReferences: [],
  }, ({ caseValue }) => ({
    result: "applicable",
    reason: "A confirmed historical record exists while the separate administrative status remains unknown.",
    unresolvedFacts: caseValue.facts.some(
      (fact) => fact.type === administrativeStatusRequirement.factType,
    )
      ? []
      : [administrativeStatusRequirement],
  }));

  return defineJurisdictionPack({
    jurisdictionId: "ES-ASTURIAS",
    version: "0.1",
    displayName: "Synthetic Asturias contract fixture",
    geographicScope: {
      countryCode: "ES",
      regionCodes: ["ASTURIAS"],
      municipalities: [],
    },
    supportedDomains: ["documents"],
    sourceReferences: [],
    lifecycle: {
      status: "draft",
    },
    routeRules: [clarifyUnknownStatus],
  });
}
