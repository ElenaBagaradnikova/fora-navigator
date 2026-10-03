import { z } from "zod";
import { CaseJurisdictionSchema } from "@/core/case/schema";
import { FactVerificationStatusSchema } from "@/core/case/verification";
import { GeneratedRouteStatusSchema } from "@/core/routes/state";

const IdentifierSchema = z.string().min(1).max(160);

export const RoutePhaseSchema = z.enum([
  "NOW",
  "PARALLEL",
  "AFTER",
  "NOT_NEEDED",
]);

export const RouteStepStatusSchema = z.enum([
  "ready",
  "blocked",
  "not_needed",
]);

export const AcceptedVerificationStatusSchema = FactVerificationStatusSchema.exclude([
  "disputed",
]);

export const FactRequirementSchema = z.object({
  factType: z.string().min(2).max(120),
  acceptedVerificationStatuses: z.array(AcceptedVerificationStatusSchema)
    .min(1)
    .max(4),
  reason: z.string().min(3).max(500),
}).strict();

export const FactReferenceSchema = z.object({
  factId: IdentifierSchema,
  factType: z.string().min(2).max(120),
  verificationStatus: FactVerificationStatusSchema,
  sourceDocumentId: IdentifierSchema.optional(),
  provenanceId: IdentifierSchema.optional(),
}).strict();

export const VerificationGapSchema = z.object({
  factType: z.string().min(2).max(120),
  factIds: z.array(IdentifierSchema).min(1).max(100),
  availableVerificationStatuses: z.array(FactVerificationStatusSchema)
    .min(1)
    .max(5),
  acceptedVerificationStatuses: z.array(AcceptedVerificationStatusSchema)
    .min(1)
    .max(4),
  reason: z.string().min(3).max(500),
}).strict();

export const RequiredDocumentReferenceSchema = z.object({
  documentType: z.string().min(2).max(120),
  reason: z.string().min(3).max(500),
}).strict();

export const RouteRuleReferenceSchema = z.object({
  ruleId: IdentifierSchema,
  version: z.string().min(1).max(40),
}).strict();

export const RouteStepSchema = z.object({
  id: IdentifierSchema,
  title: z.string().min(3).max(200),
  description: z.string().min(3).max(1200),
  phase: RoutePhaseSchema,
  status: RouteStepStatusSchema,
  dependencies: z.array(IdentifierSchema).max(24),
  requiredFacts: z.array(FactRequirementSchema).max(24),
  factReferences: z.array(FactReferenceSchema).max(100),
  missingFacts: z.array(FactRequirementSchema).max(24),
  verificationRequirements: z.array(VerificationGapSchema).max(24),
  requiredDocuments: z.array(RequiredDocumentReferenceSchema).max(24),
  destination: z.string().min(2).max(300).optional(),
  actor: z.string().min(2).max(120).optional(),
  expectedOutcome: z.string().min(3).max(700),
  evidenceReferences: z.array(IdentifierSchema).max(24),
  ruleReferences: z.array(RouteRuleReferenceSchema).min(1).max(8),
  reason: z.string().min(3).max(1000),
}).strict().superRefine((step, context) => {
  if ((step.phase === "NOT_NEEDED") !== (step.status === "not_needed")) {
    context.addIssue({
      code: "custom",
      path: ["status"],
      message: "NOT_NEEDED phase and not_needed status must be used together",
    });
  }
  if (step.phase === "AFTER" && step.status !== "blocked") {
    context.addIssue({
      code: "custom",
      path: ["status"],
      message: "An AFTER step must remain blocked until its dependency is resolved",
    });
  }
  if (
    step.phase === "AFTER"
    && step.dependencies.length === 0
    && step.missingFacts.length === 0
    && step.verificationRequirements.length === 0
  ) {
    context.addIssue({
      code: "custom",
      path: ["phase"],
      message: "An AFTER step must identify a dependency or blocking requirement",
    });
  }
});

export const RouteRuleEvaluationResultSchema = z.enum([
  "applicable",
  "not_applicable",
  "blocked_by_missing_fact",
  "blocked_by_dependency",
  "blocked_by_insufficient_verification",
]);

export const RouteRuleEvaluationSchema = z.object({
  rule: RouteRuleReferenceSchema,
  stepId: IdentifierSchema,
  result: RouteRuleEvaluationResultSchema,
  reason: z.string().min(3).max(1000),
  matchedFactIds: z.array(IdentifierSchema).max(100),
  missingFacts: z.array(FactRequirementSchema).max(24),
  verificationGaps: z.array(VerificationGapSchema).max(24),
  dependencyStepIds: z.array(IdentifierSchema).max(24),
}).strict();

export const RouteUnresolvedItemSchema = z.object({
  id: IdentifierSchema,
  kind: z.enum([
    "missing_fact",
    "insufficient_verification",
    "dependency",
  ]),
  ruleId: IdentifierSchema,
  stepId: IdentifierSchema,
  factType: z.string().min(2).max(120).optional(),
  dependencyStepIds: z.array(IdentifierSchema).max(24).default([]),
  reason: z.string().min(3).max(1000),
}).strict();

export const RouteProvenanceReferenceSchema = z.object({
  factId: IdentifierSchema,
  provenanceId: IdentifierSchema,
  sourceDocumentId: IdentifierSchema,
}).strict();

export const RouteV3Schema = z.object({
  id: IdentifierSchema,
  caseId: IdentifierSchema,
  caseVersion: z.number().int().positive(),
  jurisdiction: CaseJurisdictionSchema,
  generatedAt: z.string().datetime(),
  status: GeneratedRouteStatusSchema,
  needsRecalculation: z.boolean(),
  staleAt: z.string().datetime().optional(),
  staleReason: z.enum(["case_version_changed"]).optional(),
  steps: z.array(RouteStepSchema).max(200),
  unresolvedItems: z.array(RouteUnresolvedItemSchema).max(200),
  caseUnknowns: z.array(z.string().min(2).max(240)).max(100),
  provenanceReferences: z.array(RouteProvenanceReferenceSchema).max(500),
  ruleEvaluations: z.array(RouteRuleEvaluationSchema).max(200),
}).strict().superRefine((route, context) => {
  if (route.status === "current" && route.needsRecalculation) {
    context.addIssue({
      code: "custom",
      path: ["needsRecalculation"],
      message: "A current route cannot require recalculation",
    });
  }
  if (route.status === "stale") {
    if (!route.needsRecalculation || !route.staleAt || !route.staleReason) {
      context.addIssue({
        code: "custom",
        path: ["status"],
        message: "A stale route must record recalculation state, time, and reason",
      });
    }
  }

  const stepIds = new Set<string>();
  route.steps.forEach((step, index) => {
    if (stepIds.has(step.id)) {
      context.addIssue({
        code: "custom",
        path: ["steps", index, "id"],
        message: "Route step ids must be unique",
      });
    }
    stepIds.add(step.id);
  });

  route.steps.forEach((step, index) => {
    step.dependencies.forEach((dependencyId) => {
      if (dependencyId === step.id || !stepIds.has(dependencyId)) {
        context.addIssue({
          code: "custom",
          path: ["steps", index, "dependencies"],
          message: "Route step dependencies must reference another known step",
        });
      }
    });
  });
});

export type RoutePhase = z.infer<typeof RoutePhaseSchema>;
export type FactRequirement = z.infer<typeof FactRequirementSchema>;
export type FactReference = z.infer<typeof FactReferenceSchema>;
export type VerificationGap = z.infer<typeof VerificationGapSchema>;
export type RouteStep = z.infer<typeof RouteStepSchema>;
export type RouteRuleEvaluation = z.infer<typeof RouteRuleEvaluationSchema>;
export type RouteUnresolvedItem = z.infer<typeof RouteUnresolvedItemSchema>;
export type RouteV3 = z.infer<typeof RouteV3Schema>;
