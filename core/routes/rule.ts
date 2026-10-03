import { z } from "zod";
import type { CaseFact, CaseV3 } from "@/core/case/schema";
import {
  FactRequirementSchema,
  RequiredDocumentReferenceSchema,
  RoutePhaseSchema,
  type FactRequirement,
} from "@/core/routes/schema";

export const RouteRuleScopeSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("neutral") }).strict(),
  z.object({
    kind: z.literal("jurisdiction"),
    jurisdictionId: z.string().min(3).max(120),
  }).strict(),
]);

export const RouteStepTemplateSchema = z.object({
  id: z.string().min(1).max(160),
  title: z.string().min(3).max(200),
  description: z.string().min(3).max(1200),
  phase: RoutePhaseSchema.exclude(["NOT_NEEDED"]),
  dependencies: z.array(z.string().min(1).max(160)).max(24).default([]),
  requiredDocuments: z.array(RequiredDocumentReferenceSchema).max(24).default([]),
  destination: z.string().min(2).max(300).optional(),
  actor: z.string().min(2).max(120).optional(),
  expectedOutcome: z.string().min(3).max(700),
}).strict().superRefine((step, context) => {
  if ((step.phase === "AFTER") !== (step.dependencies.length > 0)) {
    context.addIssue({
      code: "custom",
      path: ["dependencies"],
      message: "Only AFTER templates may declare step dependencies",
    });
  }
});

export const RouteRuleDefinitionSchema = z.object({
  id: z.string().min(1).max(160),
  version: z.string().min(1).max(40),
  scope: RouteRuleScopeSchema,
  inputs: z.array(FactRequirementSchema).max(24),
  step: RouteStepTemplateSchema,
  evidenceReferences: z.array(z.string().min(1).max(160)).max(24).default([]),
}).strict();

export const RouteRuleDecisionSchema = z.object({
  result: z.enum(["applicable", "not_applicable"]),
  reason: z.string().min(3).max(1000),
  unresolvedFacts: z.array(FactRequirementSchema).max(24).default([]),
}).strict();

export type RouteRuleDefinition = z.infer<typeof RouteRuleDefinitionSchema>;
export type RouteRuleDecision = z.infer<typeof RouteRuleDecisionSchema>;

export type RouteRuleContext = {
  caseValue: CaseV3;
  matchedFacts: ReadonlyMap<string, readonly CaseFact[]>;
};

export interface RouteRule {
  readonly definition: RouteRuleDefinition;
  evaluate(context: RouteRuleContext): RouteRuleDecision;
}

export function defineRouteRule(
  definition: RouteRuleDefinition,
  evaluate: RouteRule["evaluate"],
): RouteRule {
  const parsedDefinition = RouteRuleDefinitionSchema.parse(definition);
  return {
    definition: parsedDefinition,
    evaluate(context) {
      return RouteRuleDecisionSchema.parse(evaluate(context));
    },
  };
}

export function missingFactRequirement(
  factType: string,
  acceptedVerificationStatuses: FactRequirement["acceptedVerificationStatuses"],
  reason: string,
): FactRequirement {
  return FactRequirementSchema.parse({
    factType,
    acceptedVerificationStatuses,
    reason,
  });
}
