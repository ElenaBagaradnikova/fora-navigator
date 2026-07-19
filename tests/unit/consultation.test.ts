import { describe, expect, it } from "vitest";
import { createConsultationConsent, isConsultationConsentCurrent } from "@/lib/consultation/consent";
import { consultationEmailSubject, formatConsultationEmail } from "@/lib/consultation/email";
import { ConsultationPreviewSchema } from "@/lib/schemas";

const preview = ConsultationPreviewSchema.parse({
  route: "peer_consultant",
  category: "social_support",
  country: "ES",
  region: "Asturias",
  preferredLanguage: "uk",
  contactChannel: "email",
  contact: "demo.user@example.test",
  summary: "A short user-edited note.",
});

describe("consultation contract", () => {
  it("validates the closed preview and rejects an invalid contact", () => {
    expect(preview.region).toBe("Asturias");
    expect(ConsultationPreviewSchema.safeParse({ ...preview, contact: "not-an-email" }).success).toBe(false);
    expect(ConsultationPreviewSchema.safeParse({ ...preview, category: "medical_diagnosis" }).success).toBe(false);
  });

  it("requires recent, versioned, one-time consent", () => {
    const now = new Date("2026-07-19T12:00:00.000Z");
    const current = createConsultationConsent("fictional", now);
    expect(isConsultationConsentCurrent(current, now.getTime())).toBe(true);
    expect(isConsultationConsentCurrent(current, now.getTime() + 16 * 60 * 1000)).toBe(false);
    expect(isConsultationConsentCurrent({ ...current, authorizedToShare: false }, now.getTime())).toBe(false);
  });

  it("formats a neutral email containing the preview but no full case fields", () => {
    const consent = createConsultationConsent("real", new Date("2026-07-19T12:00:00.000Z"));
    const subject = consultationEmailSubject("FORA-20260719-A1B2C3D4", preview);
    const body = formatConsultationEmail("FORA-20260719-A1B2C3D4", preview, consent);

    expect(subject).toContain("peer_consultant | social_support");
    expect(subject).not.toContain(preview.summary);
    expect(body).toContain(preview.contact);
    expect(body).toContain(preview.summary);
    expect(body).toContain("No full Case");
    expect(body).not.toContain("narrative");
  });
});
