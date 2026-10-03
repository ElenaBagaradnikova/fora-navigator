import {
  defineRouteRule,
  missingFactRequirement,
  type RouteRule,
} from "@/core/routes/rule";

const historicalDiagnosisInput = missingFactRequirement(
  "historical_diagnosis_recorded",
  ["user_confirmed"],
  "A user-confirmed synthetic historical record is required by this fixture.",
);

const administrativeStatusInput = missingFactRequirement(
  "administrative_recognition_status",
  ["authority_confirmed"],
  "Administrative recognition status is unknown and must not be guessed.",
);

function fixtureRule(
  id: string,
  step: {
    id: string;
    title: string;
    description: string;
    phase: "NOW" | "PARALLEL" | "AFTER";
    dependencies?: string[];
    expectedOutcome: string;
  },
  options: {
    inputs?: typeof historicalDiagnosisInput[];
    result?: "applicable" | "not_applicable";
    reason: string;
  },
): RouteRule {
  return defineRouteRule({
    id,
    version: "1.0-test",
    scope: { kind: "neutral" },
    inputs: options.inputs ?? [historicalDiagnosisInput],
    step: {
      ...step,
      dependencies: step.dependencies ?? [],
      requiredDocuments: [],
    },
    evidenceReferences: [],
  }, () => ({
    result: options.result ?? "applicable",
    reason: options.reason,
    unresolvedFacts: [],
  }));
}

export function createSyntheticRouteRules(): RouteRule[] {
  const clarifyAdministrativeStatus = defineRouteRule({
    id: "SYNTHETIC-RULE-001",
    version: "1.0-test",
    scope: { kind: "neutral" },
    inputs: [historicalDiagnosisInput],
    step: {
      id: "synthetic-clarify-administrative-status",
      title: "Clarify administrative recognition status",
      description: "Record the currently unknown administrative status without inferring it from a foreign historical document.",
      phase: "NOW",
      dependencies: [],
      requiredDocuments: [],
      expectedOutcome: "The missing administrative status is explicitly collected or remains unresolved.",
    },
    evidenceReferences: [],
  }, ({ caseValue }) => {
    const administrativeStatusExists = caseValue.facts.some(
      (fact) => fact.type === administrativeStatusInput.factType,
    );
    return administrativeStatusExists
      ? {
          result: "not_applicable",
          reason: "The synthetic administrative status fact is already present.",
          unresolvedFacts: [],
        }
      : {
          result: "applicable",
          reason: "A user-confirmed historical record exists, while administrative recognition remains explicitly unknown.",
          unresolvedFacts: [administrativeStatusInput],
        };
  });

  return [
    clarifyAdministrativeStatus,
    fixtureRule("SYNTHETIC-RULE-002", {
      id: "synthetic-parallel-step-a",
      title: "Synthetic independent preparation A",
      description: "A test-only independent step used to verify parallel route semantics.",
      phase: "PARALLEL",
      expectedOutcome: "Synthetic preparation A is complete.",
    }, {
      reason: "This fixture is independent and can run in parallel.",
    }),
    fixtureRule("SYNTHETIC-RULE-003", {
      id: "synthetic-parallel-step-b",
      title: "Synthetic independent preparation B",
      description: "A second test-only independent step used to verify parallel route semantics.",
      phase: "PARALLEL",
      expectedOutcome: "Synthetic preparation B is complete.",
    }, {
      reason: "This fixture is independent and can run in parallel.",
    }),
    fixtureRule("SYNTHETIC-RULE-004", {
      id: "synthetic-after-step",
      title: "Synthetic dependent follow-up",
      description: "A test-only step that must wait for its declared dependency.",
      phase: "AFTER",
      dependencies: ["synthetic-parallel-step-a"],
      expectedOutcome: "The synthetic follow-up is ready after its dependency.",
    }, {
      reason: "This fixture is applicable only after the declared synthetic dependency.",
    }),
    fixtureRule("SYNTHETIC-RULE-005", {
      id: "synthetic-not-needed-step",
      title: "Synthetic action not needed",
      description: "A test-only action retained to explain a not-applicable rule.",
      phase: "NOW",
      expectedOutcome: "The reason for omitting the synthetic action remains visible.",
    }, {
      result: "not_applicable",
      reason: "The synthetic condition is false, so this action is not needed.",
    }),
    fixtureRule("SYNTHETIC-RULE-006", {
      id: "synthetic-missing-fact-step",
      title: "Synthetic step blocked by missing fact",
      description: "A test-only step that cannot be evaluated without a synthetic input fact.",
      phase: "NOW",
      expectedOutcome: "The missing synthetic fact is supplied before evaluation.",
    }, {
      inputs: [missingFactRequirement(
        "synthetic_missing_input",
        ["user_confirmed"],
        "The synthetic input is missing and must not be guessed.",
      )],
      reason: "This evaluation must not run while its input is missing.",
    }),
    fixtureRule("SYNTHETIC-RULE-007", {
      id: "synthetic-verification-step",
      title: "Synthetic step blocked by verification",
      description: "A test-only step requiring an explicitly different verification status.",
      phase: "NOW",
      expectedOutcome: "The synthetic verification requirement is met explicitly.",
    }, {
      inputs: [missingFactRequirement(
        "historical_diagnosis_recorded",
        ["authority_confirmed"],
        "This synthetic fixture explicitly requires authority confirmation.",
      )],
      reason: "This evaluation must not run with insufficient verification.",
    }),
  ];
}
