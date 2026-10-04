import { readFileSync, readdirSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CaseV3Schema } from "@/core/case/schema";
import {
  generateRouteFromJurisdictionPack,
  JurisdictionPackMetadataSchema,
} from "@/core/jurisdictions/pack";
import { AsturiasJurisdictionPack } from "@/jurisdictions/es/asturias";
import { AsturiasRules } from "@/jurisdictions/es/asturias/rules";
import { createSyntheticJurisdictionPack } from "@/tests/fixtures/jurisdiction-pack";
import {
  createSyntheticRouteCase,
  SYNTHETIC_ROUTE_GENERATED_AT,
} from "@/tests/fixtures/route-case";

function typescriptFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return typescriptFiles(path);
    return extname(entry.name).startsWith(".ts") ? [path] : [];
  });
}

describe("ES-ASTURIAS jurisdiction pack boundary", () => {
  it("exposes only validated skeleton metadata and no production rules or sources", () => {
    const {
      routeRules,
      provenance,
      appliesTo,
      ...metadata
    } = AsturiasJurisdictionPack;

    expect(JurisdictionPackMetadataSchema.safeParse(metadata).success).toBe(true);
    expect(AsturiasJurisdictionPack).toMatchObject({
      jurisdictionId: "ES-ASTURIAS",
      version: "0.1",
      geographicScope: {
        countryCode: "ES",
        regionCodes: ["ASTURIAS"],
      },
      supportedDomains: [],
      sourceReferences: [],
      lifecycle: { status: "draft" },
      provenance: {
        jurisdictionId: "ES-ASTURIAS",
        version: "0.1",
      },
    });
    expect(routeRules).toEqual([]);
    expect(provenance).toEqual({
      jurisdictionId: "ES-ASTURIAS",
      version: "0.1",
    });
    expect(typeof appliesTo).toBe("function");
    expect(AsturiasRules).toEqual([]);
  });

  it("determines applicability only from the explicit Case jurisdiction", () => {
    const caseValue = createSyntheticRouteCase();
    const before = structuredClone(caseValue);

    expect(AsturiasJurisdictionPack.appliesTo(caseValue)).toBe(true);
    expect(caseValue.documentMetadata[0]).toMatchObject({
      originCountry: "RU",
      language: "ru",
    });

    const differentPackVersion = CaseV3Schema.parse({
      ...caseValue,
      currentJurisdiction: {
        ...caseValue.currentJurisdiction,
        packVersion: "different-version",
      },
    });
    expect(AsturiasJurisdictionPack.appliesTo(differentPackVersion)).toBe(false);
    expect(caseValue).toEqual(before);
  });

  it("records selected pack provenance in the existing Route jurisdiction", () => {
    const caseValue = createSyntheticRouteCase();
    const pack = createSyntheticJurisdictionPack();
    const route = generateRouteFromJurisdictionPack({
      caseValue,
      jurisdictionPack: pack,
      routeId: "synthetic-pack-route-v8",
      generatedAt: SYNTHETIC_ROUTE_GENERATED_AT,
    });

    expect(route.jurisdiction).toMatchObject({
      packId: pack.provenance.jurisdictionId,
      packVersion: pack.provenance.version,
    });
    expect(route.ruleEvaluations).toContainEqual(expect.objectContaining({
      rule: {
        ruleId: "SYNTHETIC-PACK-RULE-001",
        version: "1.0-test",
      },
      result: "applicable",
    }));
    expect(route.provenanceReferences).toContainEqual({
      factId: "candidate-historical-diagnosis-1",
      provenanceId: "synthetic-provenance-1",
      sourceDocumentId: "synthetic-ru-document-1",
    });
  });

  it("keeps foreign historical evidence separate from administrative recognition", () => {
    const caseValue = createSyntheticRouteCase();
    const route = generateRouteFromJurisdictionPack({
      caseValue,
      jurisdictionPack: createSyntheticJurisdictionPack(),
      routeId: "synthetic-pack-route-v8",
      generatedAt: SYNTHETIC_ROUTE_GENERATED_AT,
    });
    const step = route.steps[0];

    expect(step).toMatchObject({
      id: "synthetic-pack-clarify-status",
      missingFacts: [{ factType: "administrative_recognition_status" }],
    });
    expect(route.unresolvedItems).toContainEqual(expect.objectContaining({
      kind: "missing_fact",
      factType: "administrative_recognition_status",
    }));
    expect(caseValue.unknowns).toContain("Spanish disability recognition status");
    expect(caseValue.facts.some((fact) => [
      "spanish_disability_recognition",
      "grado_de_discapacidad",
      "entitlement",
      "residencia_status",
      "prestaciones",
    ].includes(fact.type))).toBe(false);
  });

  it("blocks a pack rule when fact verification is insufficient", () => {
    const baseCase = createSyntheticRouteCase();
    const extractedFact = structuredClone(baseCase.facts[0]);
    extractedFact.verificationStatus = "extracted";
    delete extractedFact.userConfirmation;
    const caseValue = CaseV3Schema.parse({
      ...baseCase,
      facts: [extractedFact],
    });
    const route = generateRouteFromJurisdictionPack({
      caseValue,
      jurisdictionPack: createSyntheticJurisdictionPack(),
      routeId: "synthetic-pack-route-v8",
      generatedAt: SYNTHETIC_ROUTE_GENERATED_AT,
    });

    expect(route.ruleEvaluations[0].result).toBe(
      "blocked_by_insufficient_verification",
    );
    expect(route.steps[0]).toMatchObject({
      status: "blocked",
      verificationRequirements: [{
        factType: "historical_diagnosis_recorded",
        availableVerificationStatuses: ["extracted"],
        acceptedVerificationStatuses: ["user_confirmed"],
      }],
    });
    expect(caseValue.facts[0].verificationStatus).toBe("extracted");
  });

  it("keeps missing inputs unresolved instead of guessing them", () => {
    const caseValue = CaseV3Schema.parse({
      ...createSyntheticRouteCase(),
      facts: [],
    });
    const route = generateRouteFromJurisdictionPack({
      caseValue,
      jurisdictionPack: createSyntheticJurisdictionPack(),
      routeId: "synthetic-pack-route-v8",
      generatedAt: SYNTHETIC_ROUTE_GENERATED_AT,
    });

    expect(route.ruleEvaluations[0].result).toBe("blocked_by_missing_fact");
    expect(route.unresolvedItems).toContainEqual(expect.objectContaining({
      kind: "missing_fact",
      factType: "historical_diagnosis_recorded",
    }));
    expect(caseValue.facts).toEqual([]);
  });

  it("keeps neutral core free of Asturias imports and identifiers", () => {
    const coreDirectory = resolve(process.cwd(), "core");
    const coreSource = typescriptFiles(coreDirectory)
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");

    expect(coreSource).not.toContain("@/jurisdictions/es/asturias");
    expect(coreSource).not.toContain("ES-ASTURIAS");
  });
});
