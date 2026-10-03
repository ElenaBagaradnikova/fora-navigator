import { z } from "zod";
import { CaseV3Schema, type CaseV3 } from "@/core/case/schema";
import {
  evaluateFactRequirements,
  ruleScopeMatchesCase,
} from "@/core/routes/evaluation";
import {
  RouteRuleDefinitionSchema,
  type RouteRule,
  type RouteRuleDecision,
} from "@/core/routes/rule";
import {
  RouteV3Schema,
  type FactReference,
  type FactRequirement,
  type RouteRuleEvaluation,
  type RouteStep,
  type RouteUnresolvedItem,
  type RouteV3,
  type VerificationGap,
} from "@/core/routes/schema";

const RouteGenerationMetadataSchema = z.object({
  routeId: z.string().min(1).max(160),
  generatedAt: z.string().datetime(),
}).strict();

export type GenerateRouteInput = {
  caseValue: CaseV3;
  rules: readonly RouteRule[];
  routeId: string;
  generatedAt: string;
};

type EvaluatedRule = {
  evaluation: RouteRuleEvaluation;
  step: RouteStep;
  unresolvedItems: RouteUnresolvedItem[];
  factReferences: FactReference[];
};

function assertValidRuleSet(rules: readonly RouteRule[]): void {
  const ruleIds = new Set<string>();
  const stepIds = new Set<string>();

  for (const rule of rules) {
    const definition = RouteRuleDefinitionSchema.parse(rule.definition);
    if (ruleIds.has(definition.id)) {
      throw new Error(`Duplicate route rule id: ${definition.id}`);
    }
    if (stepIds.has(definition.step.id)) {
      throw new Error(`Duplicate route step id: ${definition.step.id}`);
    }
    ruleIds.add(definition.id);
    stepIds.add(definition.step.id);
  }

  const dependenciesByStep = new Map<string, readonly string[]>();
  rules.forEach((rule) => {
    dependenciesByStep.set(rule.definition.step.id, rule.definition.step.dependencies);
    rule.definition.step.dependencies.forEach((dependencyId) => {
      if (!stepIds.has(dependencyId)) {
        throw new Error(
          `Route step ${rule.definition.step.id} depends on unknown step ${dependencyId}`,
        );
      }
    });
  });

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (stepId: string) => {
    if (visiting.has(stepId)) {
      throw new Error(`Route step dependencies contain a cycle at ${stepId}`);
    }
    if (visited.has(stepId)) return;
    visiting.add(stepId);
    dependenciesByStep.get(stepId)?.forEach(visit);
    visiting.delete(stepId);
    visited.add(stepId);
  };
  stepIds.forEach(visit);
}

function unresolvedForMissingFacts(
  ruleId: string,
  stepId: string,
  missingFacts: readonly FactRequirement[],
): RouteUnresolvedItem[] {
  return missingFacts.map((requirement) => ({
    id: `${stepId}:missing:${requirement.factType}`,
    kind: "missing_fact",
    ruleId,
    stepId,
    factType: requirement.factType,
    dependencyStepIds: [],
    reason: requirement.reason,
  }));
}

function unresolvedForVerification(
  ruleId: string,
  stepId: string,
  gaps: readonly VerificationGap[],
): RouteUnresolvedItem[] {
  return gaps.map((gap) => ({
    id: `${stepId}:verification:${gap.factType}`,
    kind: "insufficient_verification",
    ruleId,
    stepId,
    factType: gap.factType,
    dependencyStepIds: [],
    reason: gap.reason,
  }));
}

function evaluateRule(caseValue: CaseV3, rule: RouteRule): EvaluatedRule {
  const definition = RouteRuleDefinitionSchema.parse(rule.definition);
  const scopeMatches = ruleScopeMatchesCase(caseValue, definition.scope);
  const factEvaluation = scopeMatches
    ? evaluateFactRequirements(caseValue, definition.inputs)
    : {
        matchedFacts: new Map(),
        factReferences: [],
        missingFacts: [],
        verificationGaps: [],
      };
  let result: RouteRuleEvaluation["result"];
  let reason: string;
  let decision: RouteRuleDecision | undefined;

  if (!scopeMatches) {
    result = "not_applicable";
    reason = "The rule scope does not match the Case jurisdiction.";
  } else if (factEvaluation.missingFacts.length > 0) {
    result = "blocked_by_missing_fact";
    reason = `Required facts are missing: ${factEvaluation.missingFacts
      .map((requirement) => requirement.factType)
      .join(", ")}.`;
  } else if (factEvaluation.verificationGaps.length > 0) {
    result = "blocked_by_insufficient_verification";
    reason = `Fact verification is insufficient: ${factEvaluation.verificationGaps
      .map((gap) => gap.factType)
      .join(", ")}.`;
  } else {
    decision = rule.evaluate({
      caseValue,
      matchedFacts: factEvaluation.matchedFacts,
    });
    if (decision.result === "not_applicable") {
      result = "not_applicable";
      reason = decision.reason;
    } else if (definition.step.dependencies.length > 0) {
      result = "blocked_by_dependency";
      reason = decision.reason;
    } else {
      result = "applicable";
      reason = decision.reason;
    }
  }

  const decisionMissingFacts = decision?.unresolvedFacts ?? [];
  const missingFacts = [
    ...factEvaluation.missingFacts,
    ...decisionMissingFacts,
  ];
  const ruleReference = {
    ruleId: definition.id,
    version: definition.version,
  };
  const phase = result === "not_applicable"
    ? "NOT_NEEDED" as const
    : result === "applicable"
      ? definition.step.phase
      : "AFTER" as const;
  const status = result === "not_applicable"
    ? "not_needed" as const
    : result === "applicable"
      ? "ready" as const
      : "blocked" as const;

  const evaluation: RouteRuleEvaluation = {
    rule: ruleReference,
    stepId: definition.step.id,
    result,
    reason,
    matchedFactIds: factEvaluation.factReferences.map((fact) => fact.factId),
    missingFacts,
    verificationGaps: factEvaluation.verificationGaps,
    dependencyStepIds: definition.step.dependencies,
  };
  const step: RouteStep = {
    id: definition.step.id,
    title: definition.step.title,
    description: definition.step.description,
    phase,
    status,
    dependencies: definition.step.dependencies,
    requiredFacts: definition.inputs,
    factReferences: factEvaluation.factReferences,
    missingFacts,
    verificationRequirements: factEvaluation.verificationGaps,
    requiredDocuments: definition.step.requiredDocuments,
    destination: definition.step.destination,
    actor: definition.step.actor,
    expectedOutcome: definition.step.expectedOutcome,
    evidenceReferences: definition.evidenceReferences,
    ruleReferences: [ruleReference],
    reason,
  };
  const unresolvedItems = [
    ...unresolvedForMissingFacts(
      definition.id,
      definition.step.id,
      missingFacts,
    ),
    ...unresolvedForVerification(
      definition.id,
      definition.step.id,
      factEvaluation.verificationGaps,
    ),
    ...(result === "blocked_by_dependency"
      ? [{
          id: `${definition.step.id}:dependency`,
          kind: "dependency" as const,
          ruleId: definition.id,
          stepId: definition.step.id,
          dependencyStepIds: definition.step.dependencies,
          reason: `Complete dependencies first: ${definition.step.dependencies.join(", ")}.`,
        }]
      : []),
  ];

  return {
    evaluation,
    step,
    unresolvedItems,
    factReferences: factEvaluation.factReferences,
  };
}

function provenanceReferences(facts: readonly FactReference[]) {
  const references = new Map<string, {
    factId: string;
    provenanceId: string;
    sourceDocumentId: string;
  }>();

  facts.forEach((fact) => {
    if (!fact.provenanceId || !fact.sourceDocumentId) return;
    const key = `${fact.factId}:${fact.provenanceId}:${fact.sourceDocumentId}`;
    references.set(key, {
      factId: fact.factId,
      provenanceId: fact.provenanceId,
      sourceDocumentId: fact.sourceDocumentId,
    });
  });

  return [...references.values()].sort((left, right) => (
    left.factId.localeCompare(right.factId)
  ));
}

export function generateRoute(input: GenerateRouteInput): RouteV3 {
  const caseValue = CaseV3Schema.parse(input.caseValue);
  const metadata = RouteGenerationMetadataSchema.parse({
    routeId: input.routeId,
    generatedAt: input.generatedAt,
  });
  const rules = [...input.rules].sort((left, right) => (
    left.definition.id.localeCompare(right.definition.id)
  ));
  assertValidRuleSet(rules);

  const evaluatedRules = rules.map((rule) => evaluateRule(caseValue, rule));

  return RouteV3Schema.parse({
    id: metadata.routeId,
    caseId: caseValue.id,
    caseVersion: caseValue.version,
    jurisdiction: caseValue.currentJurisdiction,
    generatedAt: metadata.generatedAt,
    status: "current",
    needsRecalculation: false,
    steps: evaluatedRules.map((item) => item.step),
    unresolvedItems: evaluatedRules.flatMap((item) => item.unresolvedItems),
    caseUnknowns: caseValue.unknowns,
    provenanceReferences: provenanceReferences(
      evaluatedRules.flatMap((item) => item.factReferences),
    ),
    ruleEvaluations: evaluatedRules.map((item) => item.evaluation),
  });
}

export function resolveRouteFreshness(
  routeInput: RouteV3,
  caseInput: CaseV3,
  checkedAt: string,
): RouteV3 {
  const route = RouteV3Schema.parse(routeInput);
  const caseValue = CaseV3Schema.parse(caseInput);
  const parsedCheckedAt = z.string().datetime().parse(checkedAt);

  if (route.caseId !== caseValue.id) {
    throw new Error("Route and Case ids do not match");
  }
  if (route.caseVersion === caseValue.version) return route;

  return RouteV3Schema.parse({
    ...route,
    status: "stale",
    needsRecalculation: true,
    staleAt: parsedCheckedAt,
    staleReason: "case_version_changed",
  });
}
