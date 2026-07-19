import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/consultation/route";
import { createConsultationConsent } from "@/lib/consultation/consent";
import { resetConsultationRateLimitForTests } from "@/lib/consultation/rate-limit";
import { ConsultationReceiptSchema } from "@/lib/schemas";

const preview = {
  route: "peer_consultant",
  category: "social_support",
  country: "ES",
  region: "Asturias",
  preferredLanguage: "ru",
  contactChannel: "email",
  contact: "demo.user@example.test",
  summary: "A fictional request about local support.",
} as const;

function request(body: unknown, ip = "198.51.100.10") {
  return new Request("http://localhost/api/consultation", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

function payload(dataKind: "fictional" | "real" = "fictional", overrides: Record<string, unknown> = {}) {
  return {
    preview,
    consent: createConsultationConsent(dataKind),
    website: "",
    ...overrides,
  };
}

describe("/api/consultation", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.ENABLE_CONSULTATION_HANDOFF = "false";
    delete process.env.RESEND_API_KEY;
    delete process.env.CONSULTATION_EMAIL_FROM;
    process.env.CONSULTATION_EMAIL_TO = "fora.disability@gmail.com";
    resetConsultationRateLimitForTests();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("announces no-store demo mode and accepts only fictional data", async () => {
    const config = await GET();
    expect(await config.json()).toMatchObject({ mode: "demo", acceptsRealData: false });
    expect(config.headers.get("cache-control")).toContain("no-store");

    const response = await POST(request(payload()));
    const receipt = ConsultationReceiptSchema.parse(await response.json());
    expect(receipt).toMatchObject({ status: "demo", delivered: false });
    expect(receipt.receiptId).toMatch(/^FORA-\d{8}-[A-F0-9]{8}$/);

    const realData = await POST(request(payload("real"), "198.51.100.11"));
    expect(realData.status).toBe(403);
    expect((await realData.json()).code).toBe("DATA_MODE_MISMATCH");
  });

  it("rejects expired consent and sensitive details in the summary", async () => {
    const expired = createConsultationConsent("fictional", new Date(Date.now() - 16 * 60 * 1000));
    const consentResponse = await POST(request(payload("fictional", { consent: expired })));
    expect(consentResponse.status).toBe(403);
    expect((await consentResponse.json()).code).toBe("CONSENT_REQUIRED");

    const unsafe = await POST(request(payload("fictional", {
      preview: { ...preview, summary: "Call +34 612 345 678 about NIE X1234567L." },
    }), "198.51.100.12"));
    expect(unsafe.status).toBe(422);
    expect((await unsafe.json()).code).toBe("SUMMARY_CONTAINS_CONTACT_OR_ID");
  });

  it("rate-limits repeated accepted requests without storing raw IPs", async () => {
    for (let index = 0; index < 3; index += 1) {
      expect((await POST(request(payload(), "203.0.113.20"))).status).toBe(200);
    }
    const response = await POST(request(payload(), "203.0.113.20"));
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBeTruthy();
  });

  it("sends exactly one protected email only when every live gate is configured", async () => {
    process.env.ENABLE_CONSULTATION_HANDOFF = "true";
    process.env.RESEND_API_KEY = "test-key";
    process.env.CONSULTATION_EMAIL_FROM = "FORA <requests@example.org>";
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(request(payload("real"), "198.51.100.13"));
    const result = ConsultationReceiptSchema.parse(await response.json());
    expect(result).toMatchObject({ status: "sent", delivered: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const email = JSON.parse(String(options.body)) as { to: string[]; subject: string; text: string };
    expect(email.to).toEqual(["fora.disability@gmail.com"]);
    expect(email.subject).not.toContain(preview.summary);
    expect(email.text).toContain(preview.contact);
    expect(email.text).not.toContain("chat history:");
  });

  it("does not call the email provider when the honeypot is filled", async () => {
    process.env.ENABLE_CONSULTATION_HANDOFF = "true";
    process.env.RESEND_API_KEY = "test-key";
    process.env.CONSULTATION_EMAIL_FROM = "FORA <requests@example.org>";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(request(payload("real", { website: "spam.example" }), "198.51.100.14"));
    expect(response.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
