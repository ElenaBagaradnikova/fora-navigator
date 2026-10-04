import { z } from "zod";
import { CaseV3Schema, type CaseV3 } from "@/core/case/schema";
import {
  generateRoute,
  type GenerateRouteInput,
} from "@/core/routes/engine";
import {
  RouteRuleDefinitionSchema,
  type RouteRule,
} from "@/core/routes/rule";
import type { RouteV3 } from "@/core/routes/schema";

const IdentifierSchema = z.string().min(3).max(160);
const IsoDateSchema = z.string().date();

export const JurisdictionDomainSchema = z.enum([
  "healthcare",
  "disability_recognition",
  "education",
  "social",
  "documents",
  "migration",
]);

export const JurisdictionGeographicScopeSchema = z.object({
  countryCode: z.string().regex(/^[A-Z]{2}$/),
  regionCodes: z.array(z.string().min(2).max(80)).max(100).default([]),
  municipalities: z.array(z.string().min(2).max(120)).max(500).default([]),
}).strict();

export const JurisdictionPackLifecycleSchema = z.object({
  status: z.enum(["draft", "validated", "retired"]),
  effectiveFrom: IsoDateSchema.optional(),
  effectiveTo: IsoDateSchema.optional(),
  lastReviewedAt: IsoDateSchema.optional(),
  nextReviewAt: IsoDateSchema.optional(),
}).strict().superRefine((value, context) => {
  if (
    value.effectiveFrom
    && value.effectiveTo
    && value.effectiveTo < value.effectiveFrom
  ) {
    context.addIssue({
      code: "custom",
      path: ["effectiveTo"],
      message: "effectiveTo cannot precede effectiveFrom",
    });
  }
  if (
    value.lastReviewedAt
    && value.nextReviewAt
    && value.nextReviewAt < value.lastReviewedAt
  ) {
    context.addIssue({
      code: "custom",
      path: ["nextReviewAt"],
      message: "nextReviewAt cannot precede lastReviewedAt",
    });
  }
});

export const JurisdictionSourceReferenceSchema = z.object({
  id: IdentifierSchema,
  title: z.string().min(3).max(300),
  authority: z.string().min(2).max(200),
  url: z.string().url().optional(),
  effectiveFrom: IsoDateSchema.optional(),
  effectiveTo: IsoDateSchema.optional(),
  lastReviewedAt: IsoDateSchema,
  nextReviewAt: IsoDateSchema.optional(),
}).strict();

export const JurisdictionPackMetadataSchema = z.object({
  jurisdictionId: IdentifierSchema,
  version: z.string().min(1).max(40),
  displayName: z.string().min(2).max(160),
  geographicScope: JurisdictionGeographicScopeSchema,
  supportedDomains: z.array(JurisdictionDomainSchema).max(20).default([]),
  sourceReferences: z.array(JurisdictionSourceReferenceSchema).max(500).default([]),
  lifecycle: JurisdictionPackLifecycleSchema,
}).strict();

export const JurisdictionPackProvenanceSchema = z.object({
  jurisdictionId: IdentifierSchema,
  version: z.string().min(1).max(40),
}).strict();

export type JurisdictionDomain = z.infer<typeof JurisdictionDomainSchema>;
export type JurisdictionPackMetadata = z.infer<
  typeof JurisdictionPackMetadataSchema
>;
export type JurisdictionPackProvenance = z.infer<
  typeof JurisdictionPackProvenanceSchema
>;

export type JurisdictionPack = Readonly<JurisdictionPackMetadata & {
  routeRules: readonly RouteRule[];
  provenance: Readonly<JurisdictionPackProvenance>;
  appliesTo(caseValue: CaseV3): boolean;
}>;

export type DefineJurisdictionPackInput = JurisdictionPackMetadata & {
  routeRules: readonly RouteRule[];
};

function deepFreeze<T>(value: T): Readonly<T> {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach((child) => deepFreeze(child));
    Object.freeze(value);
  }
  return value;
}

function scopeMatchesCase(
  metadata: JurisdictionPackMetadata,
  caseValue: CaseV3,
): boolean {
  const jurisdiction = caseValue.currentJurisdiction;
  const scope = metadata.geographicScope;

  return jurisdiction.packId === metadata.jurisdictionId
    && jurisdiction.packVersion === metadata.version
    && jurisdiction.countryCode === scope.countryCode
    && (
      scope.regionCodes.length === 0
      || (jurisdiction.regionCode !== undefined
        && scope.regionCodes.includes(jurisdiction.regionCode))
    )
    && (
      scope.municipalities.length === 0
      || (jurisdiction.municipality !== undefined
        && scope.municipalities.includes(jurisdiction.municipality))
    );
}

export function defineJurisdictionPack(
  input: DefineJurisdictionPackInput,
): JurisdictionPack {
  const { routeRules, ...metadataInput } = input;
  const metadata = JurisdictionPackMetadataSchema.parse(metadataInput);
  const sourceIds = new Set(metadata.sourceReferences.map((source) => source.id));
  const ruleIds = new Set<string>();

  routeRules.forEach((rule) => {
    const definition = RouteRuleDefinitionSchema.parse(rule.definition);
    if (
      definition.scope.kind !== "jurisdiction"
      || definition.scope.jurisdictionId !== metadata.jurisdictionId
    ) {
      throw new Error(
        `Route rule ${definition.id} must be scoped to ${metadata.jurisdictionId}`,
      );
    }
    if (ruleIds.has(definition.id)) {
      throw new Error(`Duplicate jurisdiction RouteRule id: ${definition.id}`);
    }
    definition.evidenceReferences.forEach((sourceId) => {
      if (!sourceIds.has(sourceId)) {
        throw new Error(
          `Route rule ${definition.id} references unknown source ${sourceId}`,
        );
      }
    });
    ruleIds.add(definition.id);
  });

  const frozenMetadata = deepFreeze(metadata);
  const provenance = deepFreeze(JurisdictionPackProvenanceSchema.parse({
    jurisdictionId: metadata.jurisdictionId,
    version: metadata.version,
  }));

  return Object.freeze({
    ...frozenMetadata,
    routeRules: Object.freeze([...routeRules]),
    provenance,
    appliesTo(caseInput: CaseV3) {
      const caseValue = CaseV3Schema.parse(caseInput);
      return scopeMatchesCase(metadata, caseValue);
    },
  });
}

export type GenerateRouteFromJurisdictionPackInput = Omit<
  GenerateRouteInput,
  "rules"
> & {
  jurisdictionPack: JurisdictionPack;
  neutralRules?: readonly RouteRule[];
};

export function generateRouteFromJurisdictionPack(
  input: GenerateRouteFromJurisdictionPackInput,
): RouteV3 {
  if (!input.jurisdictionPack.appliesTo(input.caseValue)) {
    throw new Error(
      `Jurisdiction pack ${input.jurisdictionPack.jurisdictionId}@${input.jurisdictionPack.version} does not apply to the Case`,
    );
  }

  return generateRoute({
    caseValue: input.caseValue,
    rules: [
      ...(input.neutralRules ?? []),
      ...input.jurisdictionPack.routeRules,
    ],
    routeId: input.routeId,
    generatedAt: input.generatedAt,
  });
}
