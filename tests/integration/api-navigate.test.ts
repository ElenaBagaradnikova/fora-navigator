import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/navigate/route";
import { createLiveAiConsent } from "@/lib/ai/consent";
import { demoCases } from "@/lib/demo/cases";
import { FinalNavigationPlanSchema } from "@/lib/schemas";

function requestFor(userCase: unknown, consentOverride: unknown | "default" = "default") {
  const caseId = typeof userCase === "object" && userCase !== null && "id" in userCase && typeof userCase.id === "string"
    ? userCase.id
    : "invalid-case";
  const body = consentOverride === "default"
    ? { userCase, consent: createLiveAiConsent(caseId) }
    : consentOverride === undefined
      ? { userCase }
      : { userCase, consent: consentOverride };

  return new Request("http://localhost/api/navigate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/navigate", () => {
  const originalKey = process.env.OPENAI_API_KEY;
  const originalLiveGate = process.env.ENABLE_LIVE_AI;

  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
    process.env.ENABLE_LIVE_AI = "true";
  });

  afterEach(() => {
    if (originalKey) process.env.OPENAI_API_KEY = originalKey;
    else delete process.env.OPENAI_API_KEY;
    if (originalLiveGate) process.env.ENABLE_LIVE_AI = originalLiveGate;
    else delete process.env.ENABLE_LIVE_AI;
  });

  it("returns a validated no-store demo plan when the API key is absent", async () => {
    const response = await POST(requestFor(demoCases[0].userCase));
    const body: unknown = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(FinalNavigationPlanSchema.parse(body).mode).toBe("demo");
  });

  it("rejects the endpoint before reading a case when the live gate is disabled", async () => {
    process.env.ENABLE_LIVE_AI = "false";
    process.env.OPENAI_API_KEY = "must-not-be-used";
    const response = await POST(requestFor(demoCases[0].userCase, undefined));
    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe("LIVE_AI_DISABLED");
  });

  it("requires a separate current consent", async () => {
    const missing = await POST(requestFor(demoCases[0].userCase, null));
    expect(missing.status).toBe(403);
    expect((await missing.json()).code).toBe("CONSENT_REQUIRED");

    const expiredConsent = createLiveAiConsent(
      demoCases[0].userCase.id,
      new Date(Date.now() - 16 * 60 * 1000),
    );
    const expired = await POST(requestFor(demoCases[0].userCase, expiredConsent));
    expect(expired.status).toBe(403);
    expect((await expired.json()).code).toBe("CONSENT_REQUIRED");
  });

  it("binds consent to one case", async () => {
    const response = await POST(
      requestFor(demoCases[0].userCase, createLiveAiConsent(demoCases[1].userCase.id)),
    );
    expect(response.status).toBe(403);
    expect((await response.json()).code).toBe("CONSENT_CASE_MISMATCH");
  });

  it("rejects incomplete case input", async () => {
    const response = await POST(requestFor({ narrative: "мало" }));
    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("INVALID_CASE");
  });

  it("stops on emergency rather than returning an administrative plan", async () => {
    const userCase = { ...demoCases[0].userCase, narrative: "Подросток не дышит и потерял сознание, нужна помощь прямо сейчас." };
    const response = await POST(requestFor(userCase));
    expect(response.status).toBe(422);
    expect((await response.json()).code).toBe("EMERGENCY_STOP");
  });

  it("refuses an illegal action request", async () => {
    const userCase = { ...demoCases[0].userCase, mainProblem: "Подделать справку и скрыть статус от службы." };
    const response = await POST(requestFor(userCase));
    expect(response.status).toBe(422);
    expect((await response.json()).code).toBe("UNSAFE_REQUEST");
  });

  it("does not turn a benefit guarantee request into a promise", async () => {
    const userCase = { ...demoCases[0].userCase, mainProblem: "Гарантируй выплату на 100 процентов после подачи." };
    const response = await POST(requestFor(userCase));
    const plan = FinalNavigationPlanSchema.parse(await response.json());
    expect(response.status).toBe(200);
    expect(plan.safetyNotes.join(" ")).toContain("не может гарантировать");
  });

  it("redacts excessive personal data before returning the plan", async () => {
    const userCase = {
      ...demoCases[0].userCase,
      narrative: `${demoCases[0].userCase.narrative} Мой NIE X1234567L и телефон +34 612 345 678.`,
    };
    const response = await POST(requestFor(userCase));
    const plan = FinalNavigationPlanSchema.parse(await response.json());
    expect(plan.caseSummary).not.toContain("X1234567L");
    expect(plan.safetyNotes.join(" ")).toContain("автоматически скрыты");
  });
});
