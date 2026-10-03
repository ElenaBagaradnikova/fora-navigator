import type { CaseFact, CaseV3 } from "@/core/case/schema";
import type {
  FactReference,
  FactRequirement,
  VerificationGap,
} from "@/core/routes/schema";

export type FactRequirementEvaluation = {
  matchedFacts: ReadonlyMap<string, readonly CaseFact[]>;
  factReferences: FactReference[];
  missingFacts: FactRequirement[];
  verificationGaps: VerificationGap[];
};

export function evaluateFactRequirements(
  caseValue: CaseV3,
  requirements: readonly FactRequirement[],
): FactRequirementEvaluation {
  const matchedFacts = new Map<string, readonly CaseFact[]>();
  const factReferences: FactReference[] = [];
  const missingFacts: FactRequirement[] = [];
  const verificationGaps: VerificationGap[] = [];

  for (const requirement of requirements) {
    const facts = caseValue.facts
      .filter((fact) => fact.type === requirement.factType)
      .sort((left, right) => left.id.localeCompare(right.id));

    if (facts.length === 0) {
      missingFacts.push(requirement);
      continue;
    }

    const acceptedFacts = facts.filter((fact) => (
      requirement.acceptedVerificationStatuses.includes(
        fact.verificationStatus as Exclude<typeof fact.verificationStatus, "disputed">,
      )
    ));

    if (acceptedFacts.length === 0) {
      verificationGaps.push({
        factType: requirement.factType,
        factIds: facts.map((fact) => fact.id),
        availableVerificationStatuses: [
          ...new Set(facts.map((fact) => fact.verificationStatus)),
        ],
        acceptedVerificationStatuses: requirement.acceptedVerificationStatuses,
        reason: requirement.reason,
      });
      continue;
    }

    matchedFacts.set(requirement.factType, acceptedFacts);
    factReferences.push(...acceptedFacts.map((fact) => ({
      factId: fact.id,
      factType: fact.type,
      verificationStatus: fact.verificationStatus,
      sourceDocumentId: fact.sourceDocumentId,
      provenanceId: fact.provenanceId,
    })));
  }

  return {
    matchedFacts,
    factReferences,
    missingFacts,
    verificationGaps,
  };
}

export function ruleScopeMatchesCase(
  caseValue: CaseV3,
  scope: { kind: "neutral" } | { kind: "jurisdiction"; jurisdictionId: string },
): boolean {
  return scope.kind === "neutral"
    || scope.jurisdictionId === caseValue.currentJurisdiction.packId;
}
