import { describe, expect, it } from "vitest";
import {
  createLiveAiConsent,
  isLiveAiConsentCurrent,
  LIVE_AI_CONSENT_MAX_AGE_MS,
} from "@/lib/ai/consent";
import { LiveAiConsentSchema } from "@/lib/schemas";

describe("live AI consent", () => {
  const now = new Date("2026-07-19T12:00:00.000Z");

  it("creates a versioned consent bound to one case", () => {
    const consent = createLiveAiConsent("demo-case", now);
    expect(consent).toMatchObject({
      caseId: "demo-case",
      decision: "accepted",
      dataKind: "fictional",
      acceptedAt: now.toISOString(),
    });
    expect(isLiveAiConsentCurrent(consent, now.getTime())).toBe(true);
  });

  it("rejects expired and implausibly future consent", () => {
    const expired = createLiveAiConsent(
      "demo-case",
      new Date(now.getTime() - LIVE_AI_CONSENT_MAX_AGE_MS - 1),
    );
    const future = createLiveAiConsent("demo-case", new Date(now.getTime() + 6 * 60 * 1000));
    expect(isLiveAiConsentCurrent(expired, now.getTime())).toBe(false);
    expect(isLiveAiConsentCurrent(future, now.getTime())).toBe(false);
  });

  it("rejects a stale version, non-fictional data and extra fields", () => {
    const consent = createLiveAiConsent("demo-case", now);
    expect(isLiveAiConsentCurrent({ ...consent, version: "old" }, now.getTime())).toBe(false);
    expect(isLiveAiConsentCurrent({ ...consent, dataKind: "real" }, now.getTime())).toBe(false);
    expect(LiveAiConsentSchema.safeParse({ ...consent, unexpected: true }).success).toBe(false);
  });
});
