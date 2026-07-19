import type { ConsultationConsent } from "@/lib/schemas";

export const CONSULTATION_CONSENT_VERSION = "2026-07-19.v1" as const;
export const CONSULTATION_PRIVACY_VERSION = "2026-07-19.v1" as const;

export const CONSULTATION_CONSENT_MAX_AGE_MS = 15 * 60 * 1000;
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

export function createConsultationConsent(
  dataKind: ConsultationConsent["dataKind"],
  now = new Date(),
): ConsultationConsent {
  return {
    version: CONSULTATION_CONSENT_VERSION,
    privacyNoticeVersion: CONSULTATION_PRIVACY_VERSION,
    decision: "accepted",
    dataKind,
    confirmedAdult: true,
    authorizedToShare: true,
    acceptedAt: now.toISOString(),
  };
}

export function isConsultationConsentCurrent(value: unknown, now = Date.now()): value is ConsultationConsent {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const consent = value as Record<string, unknown>;
  const expectedKeys = ["version", "privacyNoticeVersion", "decision", "dataKind", "confirmedAdult", "authorizedToShare", "acceptedAt"];
  if (Object.keys(consent).length !== expectedKeys.length || expectedKeys.some((key) => !(key in consent))) return false;
  if (
    consent.version !== CONSULTATION_CONSENT_VERSION ||
    consent.privacyNoticeVersion !== CONSULTATION_PRIVACY_VERSION ||
    consent.decision !== "accepted" ||
    (consent.dataKind !== "fictional" && consent.dataKind !== "real") ||
    consent.confirmedAdult !== true ||
    consent.authorizedToShare !== true ||
    typeof consent.acceptedAt !== "string"
  ) return false;

  const acceptedAt = new Date(consent.acceptedAt).getTime();
  if (!Number.isFinite(acceptedAt)) return false;
  return acceptedAt <= now + MAX_CLOCK_SKEW_MS && now - acceptedAt <= CONSULTATION_CONSENT_MAX_AGE_MS;
}
