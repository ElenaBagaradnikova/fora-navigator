import { CaseFactSchema, type CaseFact } from "@/core/case/schema";
import {
  CandidateFactSchema,
  type CandidateFact,
} from "@/core/documents/schema";

export class CandidateFactConfirmationError extends Error {
  constructor(status: CandidateFact["verificationStatus"]) {
    super(`Only an extracted candidate fact can be user-confirmed; received ${status}`);
    this.name = "CandidateFactConfirmationError";
  }
}

export function confirmCandidateFact(
  candidate: CandidateFact,
): CaseFact {
  const parsed = CandidateFactSchema.parse(candidate);

  if (parsed.verificationStatus !== "extracted") {
    throw new CandidateFactConfirmationError(parsed.verificationStatus);
  }

  return CaseFactSchema.parse({
    id: parsed.id,
    subjectId: parsed.subjectId,
    type: parsed.type,
    value: parsed.value,
    origin: "document",
    verificationStatus: "user_confirmed",
    sourceDocumentId: parsed.sourceDocumentId,
    provenanceId: parsed.provenanceId,
    capturedAt: parsed.capturedAt,
    jurisdictionRelevance: parsed.jurisdictionRelevance,
  });
}
