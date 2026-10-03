import { describe, expect, it } from "vitest";
import {
  generateRoute,
  resolveRouteFreshness,
} from "@/core/routes/engine";
import { RouteV3Schema } from "@/core/routes/schema";
import {
  createSyntheticRouteCase,
  SYNTHETIC_ROUTE_GENERATED_AT,
} from "@/tests/fixtures/route-case";
import { createSyntheticRouteRules } from "@/tests/fixtures/route-rules";

function generateSyntheticRoute() {
  return generateRoute({
    caseValue: createSyntheticRouteCase(),
    rules: createSyntheticRouteRules(),
    routeId: "synthetic-route-v8",
    generatedAt: SYNTHETIC_ROUTE_GENERATED_AT,
  });
}

describe("Route Engine v3", () => {
  it("builds an explainable route from a user-confirmed historical fact", () => {
    const caseValue = createSyntheticRouteCase();
    const route = generateSyntheticRoute();
    const step = route.steps.find(
      (item) => item.id === "synthetic-clarify-administrative-status",
    );

    expect(RouteV3Schema.safeParse(route).success).toBe(true);
    expect(route).toMatchObject({
      caseId: caseValue.id,
      caseVersion: caseValue.version,
      jurisdiction: caseValue.currentJurisdiction,
      status: "current",
      needsRecalculation: false,
    });
    expect(step).toMatchObject({
      title: "Clarify administrative recognition status",
      phase: "NOW",
      status: "ready",
      factReferences: [{
        factId: "candidate-historical-diagnosis-1",
        factType: "historical_diagnosis_recorded",
        verificationStatus: "user_confirmed",
        sourceDocumentId: "synthetic-ru-document-1",
        provenanceId: "synthetic-provenance-1",
      }],
      missingFacts: [{ factType: "administrative_recognition_status" }],
      ruleReferences: [{
        ruleId: "SYNTHETIC-RULE-001",
        version: "1.0-test",
      }],
    });
    expect(step?.reason).toContain("administrative recognition remains explicitly unknown");
    expect(route.provenanceReferences).toContainEqual({
      factId: "candidate-historical-diagnosis-1",
      provenanceId: "synthetic-provenance-1",
      sourceDocumentId: "synthetic-ru-document-1",
    });
    expect(route.unresolvedItems).toContainEqual(expect.objectContaining({
      kind: "missing_fact",
      factType: "administrative_recognition_status",
      stepId: "synthetic-clarify-administrative-status",
    }));
  });

  it("represents NOW, PARALLEL, AFTER, and NOT_NEEDED explicitly", () => {
    const route = generateSyntheticRoute();
    const byId = new Map(route.steps.map((step) => [step.id, step]));

    expect(byId.get("synthetic-clarify-administrative-status")).toMatchObject({
      phase: "NOW",
      status: "ready",
    });
    expect(byId.get("synthetic-parallel-step-a")).toMatchObject({
      phase: "PARALLEL",
      status: "ready",
      dependencies: [],
    });
    expect(byId.get("synthetic-parallel-step-b")).toMatchObject({
      phase: "PARALLEL",
      status: "ready",
      dependencies: [],
    });
    expect(byId.get("synthetic-after-step")).toMatchObject({
      phase: "AFTER",
      status: "blocked",
      dependencies: ["synthetic-parallel-step-a"],
    });
    expect(byId.get("synthetic-not-needed-step")).toMatchObject({
      phase: "NOT_NEEDED",
      status: "not_needed",
      reason: "The synthetic condition is false, so this action is not needed.",
    });
  });

  it("blocks missing facts without guessing values", () => {
    const caseValue = createSyntheticRouteCase();
    const before = structuredClone(caseValue);
    const route = generateRoute({
      caseValue,
      rules: createSyntheticRouteRules(),
      routeId: "synthetic-route-v8",
      generatedAt: SYNTHETIC_ROUTE_GENERATED_AT,
    });
    const evaluation = route.ruleEvaluations.find(
      (item) => item.rule.ruleId === "SYNTHETIC-RULE-006",
    );
    const step = route.steps.find(
      (item) => item.id === "synthetic-missing-fact-step",
    );

    expect(evaluation?.result).toBe("blocked_by_missing_fact");
    expect(step).toMatchObject({
      phase: "AFTER",
      status: "blocked",
      missingFacts: [{ factType: "synthetic_missing_input" }],
    });
    expect(caseValue).toEqual(before);
    expect(caseValue.facts.some(
      (fact) => fact.type === "synthetic_missing_input",
    )).toBe(false);
  });

  it("blocks insufficient verification without privilege escalation", () => {
    const route = generateSyntheticRoute();
    const evaluation = route.ruleEvaluations.find(
      (item) => item.rule.ruleId === "SYNTHETIC-RULE-007",
    );
    const step = route.steps.find(
      (item) => item.id === "synthetic-verification-step",
    );

    expect(evaluation?.result).toBe("blocked_by_insufficient_verification");
    expect(step).toMatchObject({
      phase: "AFTER",
      status: "blocked",
      verificationRequirements: [{
        factType: "historical_diagnosis_recorded",
        availableVerificationStatuses: ["user_confirmed"],
        acceptedVerificationStatuses: ["authority_confirmed"],
      }],
    });
    expect(route.steps.flatMap((item) => item.factReferences).some(
      (fact) => ["authority_confirmed", "professional_confirmed"].includes(
        fact.verificationStatus,
      ),
    )).toBe(false);
  });

  it("marks an older route stale without mutating its historical version", () => {
    const route = generateSyntheticRoute();
    const newerCase = {
      ...createSyntheticRouteCase(),
      version: route.caseVersion + 1,
      updatedAt: "2026-10-03T16:00:00.000Z",
    };

    const staleRoute = resolveRouteFreshness(
      route,
      newerCase,
      "2026-10-03T16:01:00.000Z",
    );

    expect(route.status).toBe("current");
    expect(route.needsRecalculation).toBe(false);
    expect(staleRoute).toMatchObject({
      id: route.id,
      caseVersion: route.caseVersion,
      status: "stale",
      needsRecalculation: true,
      staleAt: "2026-10-03T16:01:00.000Z",
      staleReason: "case_version_changed",
    });
  });

  it("is deterministic for the same Case, metadata, and rule set", () => {
    const caseValue = createSyntheticRouteCase();
    const rules = createSyntheticRouteRules();
    const first = generateRoute({
      caseValue,
      rules,
      routeId: "synthetic-route-v8",
      generatedAt: SYNTHETIC_ROUTE_GENERATED_AT,
    });
    const second = generateRoute({
      caseValue,
      rules: [...rules].reverse(),
      routeId: "synthetic-route-v8",
      generatedAt: SYNTHETIC_ROUTE_GENERATED_AT,
    });

    expect(second).toEqual(first);
  });

  it("preserves cross-border and administrative safety boundaries", () => {
    const caseValue = createSyntheticRouteCase();
    const before = structuredClone(caseValue);
    const route = generateSyntheticRoute();

    expect(caseValue.currentJurisdiction.packId).toBe("ES-ASTURIAS");
    expect(caseValue.documentMetadata[0]).toMatchObject({
      originCountry: "RU",
      language: "ru",
    });
    expect(caseValue.unknowns).toContain("Spanish disability recognition status");
    expect(caseValue.facts).toHaveLength(1);
    expect(caseValue.facts[0]).toMatchObject({
      type: "historical_diagnosis_recorded",
      verificationStatus: "user_confirmed",
    });
    expect(caseValue.facts.some((fact) => [
      "spanish_disability_recognition",
      "grado_de_discapacidad",
      "entitlement",
    ].includes(fact.type))).toBe(false);
    expect(route.steps.every(
      (step) => step.ruleReferences.every(
        (rule) => rule.ruleId.startsWith("SYNTHETIC-RULE-"),
      ),
    )).toBe(true);
    expect(route.steps.every((step) => step.evidenceReferences.length === 0)).toBe(true);
    expect(caseValue).toEqual(before);
  });

  it("retains a not-applicable rule as an explainable NOT_NEEDED result", () => {
    const route = generateSyntheticRoute();
    const evaluation = route.ruleEvaluations.find(
      (item) => item.rule.ruleId === "SYNTHETIC-RULE-005",
    );

    expect(evaluation).toMatchObject({
      result: "not_applicable",
      reason: "The synthetic condition is false, so this action is not needed.",
      stepId: "synthetic-not-needed-step",
    });
    expect(route.steps).toContainEqual(expect.objectContaining({
      id: "synthetic-not-needed-step",
      phase: "NOT_NEEDED",
      status: "not_needed",
    }));
  });
});
