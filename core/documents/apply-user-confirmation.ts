import { z } from "zod";
import { CaseV3Schema, type CaseFact, type CaseV3 } from "@/core/case/schema";
import { confirmCandidateFact } from "@/core/documents/confirmation";
import {
  CandidateFactSchema,
  ProvenanceSchema,
  UserConfirmationSchema,
} from "@/core/documents/schema";

export const ApplyUserConfirmationInputSchema = z.object({
  caseValue: CaseV3Schema,
  candidateFact: CandidateFactSchema,
  confirmation: UserConfirmationSchema,
  provenance: ProvenanceSchema,
}).strict();

export type ApplyUserConfirmationResult = {
  caseValue: CaseV3;
  confirmedFact: CaseFact;
  changed: boolean;
};

export class ApplyUserConfirmationError extends Error {
  constructor(
    readonly code:
      | "CANDIDATE_NOT_EXTRACTED"
      | "CONFIRMATION_MISMATCH"
      | "SOURCE_DOCUMENT_NOT_FOUND"
      | "CANDIDATE_NOT_LINKED_TO_DOCUMENT"
      | "PROVENANCE_MISMATCH"
      | "CONFIRMATION_CONFLICT",
    message: string,
  ) {
    super(message);
    this.name = "ApplyUserConfirmationError";
  }
}

function sameUnknownValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function isSameConfirmedFact(existing: CaseFact, expected: CaseFact): boolean {
  return existing.verificationStatus === "user_confirmed"
    && existing.candidateFactId === expected.candidateFactId
    && existing.subjectId === expected.subjectId
    && existing.type === expected.type
    && sameUnknownValue(existing.value, expected.value)
    && existing.sourceDocumentId === expected.sourceDocumentId
    && existing.provenanceId === expected.provenanceId;
}

export function applyUserConfirmation(input: unknown): ApplyUserConfirmationResult {
  const {
    caseValue,
    candidateFact,
    confirmation,
    provenance,
  } = ApplyUserConfirmationInputSchema.parse(input);

  if (candidateFact.verificationStatus !== "extracted") {
    throw new ApplyUserConfirmationError(
      "CANDIDATE_NOT_EXTRACTED",
      "Only an extracted candidate fact can be user-confirmed",
    );
  }
  if (confirmation.candidateFactId !== candidateFact.id) {
    throw new ApplyUserConfirmationError(
      "CONFIRMATION_MISMATCH",
      "The explicit confirmation must identify the candidate fact",
    );
  }

  const matchingDocuments = caseValue.documentMetadata.filter(
    (document) => document.id === candidateFact.sourceDocumentId,
  );
  if (matchingDocuments.length !== 1) {
    throw new ApplyUserConfirmationError(
      "SOURCE_DOCUMENT_NOT_FOUND",
      "The candidate fact must identify exactly one source document in the case",
    );
  }

  const sourceDocument = matchingDocuments[0];
  if (!sourceDocument.extractedFactIds.includes(candidateFact.id)) {
    throw new ApplyUserConfirmationError(
      "CANDIDATE_NOT_LINKED_TO_DOCUMENT",
      "The source document does not identify this extracted candidate fact",
    );
  }
  if (
    provenance.id !== candidateFact.provenanceId
    || provenance.sourceDocumentId !== candidateFact.sourceDocumentId
  ) {
    throw new ApplyUserConfirmationError(
      "PROVENANCE_MISMATCH",
      "Candidate fact provenance must identify the same source document and extraction",
    );
  }

  const conflictingProvenance = caseValue.documentProvenance.find(
    (item) => item.id === provenance.id,
  );
  if (
    conflictingProvenance
    && JSON.stringify(conflictingProvenance) !== JSON.stringify(provenance)
  ) {
    throw new ApplyUserConfirmationError(
      "PROVENANCE_MISMATCH",
      "The case already contains different provenance with the same id",
    );
  }

  const confirmedFact = confirmCandidateFact(candidateFact, confirmation);
  const existingFact = caseValue.facts.find(
    (fact) => fact.candidateFactId === candidateFact.id || fact.id === confirmedFact.id,
  );

  if (existingFact) {
    if (!isSameConfirmedFact(existingFact, confirmedFact)) {
      throw new ApplyUserConfirmationError(
        "CONFIRMATION_CONFLICT",
        "The case already contains a conflicting fact for this candidate",
      );
    }

    return {
      caseValue,
      confirmedFact: existingFact,
      changed: false,
    };
  }

  const confirmedFactIds = [...new Set([
    ...sourceDocument.confirmedFactIds,
    confirmedFact.id,
  ])];
  const allExtractedFactsConfirmed = sourceDocument.extractedFactIds.every(
    (factId) => confirmedFactIds.includes(factId),
  );

  const nextCase = CaseV3Schema.parse({
    ...caseValue,
    version: caseValue.version + 1,
    updatedAt: confirmation.confirmedAt,
    facts: [...caseValue.facts, confirmedFact],
    documentMetadata: caseValue.documentMetadata.map((document) => (
      document.id === sourceDocument.id
        ? {
            ...document,
            confirmedFactIds,
            extractionStatus: allExtractedFactsConfirmed
              ? "confirmed" as const
              : document.extractionStatus,
          }
        : document
    )),
    documentProvenance: conflictingProvenance
      ? caseValue.documentProvenance
      : [...caseValue.documentProvenance, provenance],
    routeState: {
      status: "stale",
      needsRecalculation: true,
      invalidatedAt: confirmation.confirmedAt,
      invalidationReason: "case_fact_changed",
    },
  });

  return {
    caseValue: nextCase,
    confirmedFact,
    changed: true,
  };
}
