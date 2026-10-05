import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { GenerateAndPublishRouteUseCase } from "@/application/routes/generate-and-publish-route";
import { CaseV3Schema, type CaseV3 } from "@/core/case/schema";
import type { JurisdictionPack } from "@/core/jurisdictions/pack";
import { InMemoryRouteSnapshotRepository } from "@/core/routes/in-memory-repository";
import { createSyntheticJurisdictionPack } from "@/tests/fixtures/jurisdiction-pack";
import {
  createSyntheticRouteCase,
  SYNTHETIC_ROUTE_GENERATED_AT,
} from "@/tests/fixtures/route-case";

const ROUTE_ID = "synthetic-application-route-v8";

function createWorkflow(
  initialCase: CaseV3 = createSyntheticRouteCase(),
  pack: JurisdictionPack = createSyntheticJurisdictionPack(),
) {
  const repository = new InMemoryRouteSnapshotRepository([initialCase]);
  const useCase = new GenerateAndPublishRouteUseCase(repository);
  const input = {
    caseValue: initialCase,
    jurisdictionPack: pack,
    routeId: ROUTE_ID,
    generatedAt: SYNTHETIC_ROUTE_GENERATED_AT,
  };

  return { input, pack, repository, useCase };
}

function withExtractedHistoricalFact(caseValue: CaseV3): CaseV3 {
  const extractedFact = structuredClone(caseValue.facts[0]);
  extractedFact.verificationStatus = "extracted";
  delete extractedFact.userConfirmation;
  return CaseV3Schema.parse({
    ...caseValue,
    facts: [extractedFact],
  });
}

describe("GenerateAndPublishRouteUseCase", () => {
  it("runs the complete deterministic generation and atomic publication workflow", async () => {
    const caseValue = createSyntheticRouteCase();
    const { input, repository, useCase } = createWorkflow(caseValue);

    const result = await useCase.execute(input);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.message);
    expect(result.created).toBe(true);
    expect(result.routeSnapshot).toMatchObject({
      id: ROUTE_ID,
      caseId: caseValue.id,
      caseVersion: caseValue.version,
      status: "current",
      needsRecalculation: false,
    });
    expect(result.caseValue.routeState).toEqual({
      status: "current",
      needsRecalculation: false,
    });
    expect(await repository.getRouteSnapshot(ROUTE_ID)).toEqual(
      result.routeSnapshot,
    );
    expect(await repository.getCase(caseValue.id)).toEqual(result.caseValue);
  });

  it("returns a typed error for an inapplicable jurisdiction pack", async () => {
    const caseValue = CaseV3Schema.parse({
      ...createSyntheticRouteCase(),
      currentJurisdiction: {
        ...createSyntheticRouteCase().currentJurisdiction,
        packVersion: "different-version",
      },
    });
    const { input, repository, useCase } = createWorkflow(caseValue);

    const result = await useCase.execute(input);

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "JURISDICTION_PACK_NOT_APPLICABLE",
        caseId: caseValue.id,
      },
    });
    expect(await repository.getRouteSnapshot(ROUTE_ID)).toBeNull();
    expect(await repository.getCase(caseValue.id)).toEqual(caseValue);
  });

  it("uses current jurisdiction rather than foreign document origin", async () => {
    const caseValue = createSyntheticRouteCase();
    const { input, useCase } = createWorkflow(caseValue);

    const result = await useCase.execute(input);

    expect(caseValue.currentJurisdiction).toMatchObject({
      countryCode: "ES",
      packId: "ES-ASTURIAS",
    });
    expect(caseValue.documentMetadata[0]).toMatchObject({
      originCountry: "RU",
      language: "ru",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.message);
    expect(result.routeSnapshot.jurisdiction).toEqual(
      caseValue.currentJurisdiction,
    );
  });

  it("does not convert an extracted foreign diagnosis into Spanish recognition", async () => {
    const caseValue = withExtractedHistoricalFact(createSyntheticRouteCase());
    const { input, useCase } = createWorkflow(caseValue);

    const result = await useCase.execute(input);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.message);
    expect(result.routeSnapshot.ruleEvaluations[0].result).toBe(
      "blocked_by_insufficient_verification",
    );
    expect(result.caseValue.facts.some((fact) => [
      "spanish_disability_recognition",
      "grado_de_discapacidad",
      "entitlement",
    ].includes(fact.type))).toBe(false);
    expect(result.caseValue.unknowns).toContain(
      "Spanish disability recognition status",
    );
  });

  it("keeps missing facts unresolved and blocks their rules", async () => {
    const caseValue = CaseV3Schema.parse({
      ...createSyntheticRouteCase(),
      facts: [],
    });
    const { input, useCase } = createWorkflow(caseValue);

    const result = await useCase.execute(input);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.message);
    expect(result.routeSnapshot.ruleEvaluations[0].result).toBe(
      "blocked_by_missing_fact",
    );
    expect(result.routeSnapshot.unresolvedItems).toContainEqual(
      expect.objectContaining({
        kind: "missing_fact",
        factType: "historical_diagnosis_recorded",
      }),
    );
    expect(result.caseValue.facts).toEqual([]);
  });

  it("preserves selected pack id and version in Route provenance", async () => {
    const { input, pack, useCase } = createWorkflow();

    const result = await useCase.execute(input);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.message);
    expect(result.jurisdictionPackProvenance).toEqual(pack.provenance);
    expect(result.routeSnapshot.jurisdiction).toMatchObject({
      packId: pack.jurisdictionId,
      packVersion: pack.version,
    });
  });

  it("returns an optimistic concurrency error without partial publication", async () => {
    const inputCase = createSyntheticRouteCase();
    const newerStoredCase = CaseV3Schema.parse({
      ...inputCase,
      version: inputCase.version + 1,
      updatedAt: "2026-10-04T10:00:00.000Z",
    });
    const repository = new InMemoryRouteSnapshotRepository([newerStoredCase]);
    const useCase = new GenerateAndPublishRouteUseCase(repository);

    const result = await useCase.execute({
      caseValue: inputCase,
      jurisdictionPack: createSyntheticJurisdictionPack(),
      routeId: ROUTE_ID,
      generatedAt: SYNTHETIC_ROUTE_GENERATED_AT,
    });

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "ROUTE_PUBLICATION_REJECTED",
        repositoryCode: "CASE_VERSION_CONFLICT",
      },
    });
    expect(await repository.getRouteSnapshot(ROUTE_ID)).toBeNull();
    expect(await repository.getCase(inputCase.id)).toEqual(newerStoredCase);
  });

  it("is idempotent for the same Case version and deterministic Route", async () => {
    const caseValue = createSyntheticRouteCase();
    const { input, repository, useCase } = createWorkflow(caseValue);

    const first = await useCase.execute(input);
    const second = await useCase.execute(input);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) throw new Error("Expected successful results");
    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.routeSnapshot).toEqual(first.routeSnapshot);
    expect(await repository.listRouteSnapshots(caseValue.id)).toHaveLength(1);
  });

  it("does not mutate input Case or selected pack RouteRule data", async () => {
    const caseValue = createSyntheticRouteCase();
    const pack = createSyntheticJurisdictionPack();
    const caseBefore = structuredClone(caseValue);
    const ruleDefinitionsBefore = pack.routeRules.map(
      (rule) => structuredClone(rule.definition),
    );
    const { input, useCase } = createWorkflow(caseValue, pack);

    const result = await useCase.execute(input);

    expect(result.ok).toBe(true);
    expect(caseValue).toEqual(caseBefore);
    expect(pack.routeRules.map((rule) => rule.definition)).toEqual(
      ruleDefinitionsBefore,
    );
  });

  it("does not escalate facts or verification statuses", async () => {
    const caseValue = createSyntheticRouteCase();
    const factsBefore = structuredClone(caseValue.facts);
    const { input, repository, useCase } = createWorkflow(caseValue);

    const result = await useCase.execute(input);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.message);
    expect(result.caseValue.facts).toEqual(factsBefore);
    expect((await repository.getCase(caseValue.id))?.facts).toEqual(factsBefore);
    expect(result.caseValue.facts.some((fact) => [
      "professional_confirmed",
      "authority_confirmed",
    ].includes(fact.verificationStatus))).toBe(false);
  });

  it("keeps the application layer free of concrete Asturias dependencies", () => {
    const source = readFileSync(resolve(
      process.cwd(),
      "application/routes/generate-and-publish-route.ts",
    ), "utf8");

    expect(source).not.toContain("@/jurisdictions/es/asturias");
    expect(source).not.toContain("ES-ASTURIAS");
  });
});
