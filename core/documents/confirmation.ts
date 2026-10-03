import { CaseFactSchema, type CaseFact } from "@/core/case/schema";
import {
  CandidateFactSchema,
  UserConfirmationSchema,
  type CandidateFact,
  type UserConfirmation,
} from "@/core/documents/schema";

export class CandidateFactConfirmationError extends Error {
  constructor(status: CandidateFact["verificationStatus"]) {
    super(`Only an extracted candidate fact can be user-confirmed; received ${status}`);
    this.name = "CandidateFactConfirmationError";
  }
}

export function confirmCandidateFact(
  candidate: CandidateFact,
  confirmation: UserConfirmation,
): CaseFact {
  const parsed = CandidateFactSchema.parse(candidate);
  const parsedConfirmation = UserConfirmationSchema.parse(confirmation);

  if (parsed.verificationStatus !== "extracted") {
    throw new CandidateFactConfirmationError(parsed.verificationStatus);
  }
  if (parsedConfirmation.candidateFactId !== parsed.id) {
    throw new Error("User confirmation does not identify this candidate fact");
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
    candidateFactId: parsed.id,
    userConfirmation: parsedConfirmation,
    capturedAt: parsed.capturedAt,
    jurisdictionRelevance: parsed.jurisdictionRelevance,
  });
}
