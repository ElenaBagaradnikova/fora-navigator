import {
  LIVE_AI_CONSENT_VERSION,
  LiveAiConsentSchema,
  type LiveAiConsent,
} from "@/lib/schemas";

export const LIVE_AI_CONSENT_MAX_AGE_MS = 15 * 60 * 1000;
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

export function createLiveAiConsent(caseId: string, now = new Date()): LiveAiConsent {
  return LiveAiConsentSchema.parse({
    version: LIVE_AI_CONSENT_VERSION,
    decision: "accepted",
    dataKind: "fictional",
    caseId,
    acceptedAt: now.toISOString(),
  });
}

export function isLiveAiConsentCurrent(value: unknown, now = Date.now()): value is LiveAiConsent {
  const parsed = LiveAiConsentSchema.safeParse(value);
  if (!parsed.success) return false;

  const acceptedAt = new Date(parsed.data.acceptedAt).getTime();
  if (!Number.isFinite(acceptedAt)) return false;
  return acceptedAt <= now + MAX_CLOCK_SKEW_MS && now - acceptedAt <= LIVE_AI_CONSENT_MAX_AGE_MS;
}
