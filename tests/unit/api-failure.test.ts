import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFallbackPlan } from "@/lib/demo/fallback-plan";
import { demoCases } from "@/lib/demo/cases";
import { ModelNavigationPlanSchema } from "@/lib/schemas";

const { parseMock } = vi.hoisted(() => ({ parseMock: vi.fn() }));

vi.mock("openai", () => ({
  default: class MockOpenAI {
    responses = { parse: parseMock };
  },
}));

vi.mock("openai/helpers/zod", () => ({ zodTextFormat: vi.fn(() => ({ type: "json_schema" })) }));

function modelOutput() {
  return ModelNavigationPlanSchema.parse(createFallbackPlan(demoCases[0].userCase));
}

function completedResponse(output: unknown) {
  return {
    output_parsed: output,
    output: [],
    error: null,
    status: "completed",
    incomplete_details: null,
  };
}

describe("OpenAI structured generation contract", () => {
  const original = {
    live: process.env.ENABLE_LIVE_AI,
    key: process.env.OPENAI_API_KEY,
    fallback: process.env.ENABLE_DEMO_FALLBACK,
    model: process.env.OPENAI_MODEL,
  };

  beforeEach(() => {
    parseMock.mockReset();
    process.env.ENABLE_LIVE_AI = "true";
    process.env.OPENAI_API_KEY = "test-key";
    process.env.ENABLE_DEMO_FALLBACK = "true";
    process.env.OPENAI_MODEL = "gpt-5.6-terra";
  });

  afterEach(() => {
    for (const [key, value] of Object.entries({
      ENABLE_LIVE_AI: original.live,
      OPENAI_API_KEY: original.key,
      ENABLE_DEMO_FALLBACK: original.fallback,
      OPENAI_MODEL: original.model,
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("uses Terra, Structured Outputs, medium reasoning and store:false", async () => {
    parseMock.mockResolvedValueOnce(completedResponse(modelOutput()));
    const { generateNavigationPlan } = await import("@/lib/ai/generate-plan");
    const plan = await generateNavigationPlan(demoCases[0].userCase);

    expect(plan.mode).toBe("live");
    expect(parseMock).toHaveBeenCalledTimes(1);
    expect(parseMock.mock.calls[0][0]).toMatchObject({
      model: "gpt-5.6-terra",
      reasoning: { effort: "medium" },
      store: false,
      max_output_tokens: 8_000,
      text: { verbosity: "medium" },
    });
  });

  it("repairs one schema-invalid response and accepts the second audited response", async () => {
    parseMock
      .mockResolvedValueOnce(completedResponse({}))
      .mockResolvedValueOnce(completedResponse(modelOutput()));
    const { generateNavigationPlan } = await import("@/lib/ai/generate-plan");
    const plan = await generateNavigationPlan(demoCases[0].userCase);

    expect(plan.mode).toBe("live");
    expect(parseMock).toHaveBeenCalledTimes(2);
    const secondInput = parseMock.mock.calls[1][0].input as Array<{ role: string; content: string }>;
    expect(secondInput.find((item) => item.role === "user")?.content).toContain("REPAIR:");
  });

  it("retries an API outage and returns a marked fallback without leaking the raw error", async () => {
    parseMock.mockRejectedValue(new Error("simulated API outage"));
    const { generateNavigationPlan } = await import("@/lib/ai/generate-plan");
    const plan = await generateNavigationPlan(demoCases[0].userCase);

    expect(parseMock).toHaveBeenCalledTimes(2);
    expect(plan.mode).toBe("demo");
    expect(plan.safetyNotes.join(" ")).toContain("GPT-5.6 сейчас недоступен");
    expect(plan.safetyNotes.join(" ")).not.toContain("simulated API outage");
  });

  it("treats a refusal as a failed response and falls back safely", async () => {
    parseMock.mockResolvedValue({
      output_parsed: null,
      output: [{ type: "message", content: [{ type: "refusal", refusal: "internal refusal text" }] }],
      error: null,
      status: "completed",
      incomplete_details: null,
    });
    const { generateNavigationPlan } = await import("@/lib/ai/generate-plan");
    const plan = await generateNavigationPlan(demoCases[0].userCase);

    expect(plan.mode).toBe("demo");
    expect(plan.safetyNotes.join(" ")).not.toContain("internal refusal text");
  });

  it("fails closed when runtime is configured with a model other than Terra", async () => {
    process.env.OPENAI_MODEL = "gpt-unapproved";
    const { generateNavigationPlan } = await import("@/lib/ai/generate-plan");
    const plan = await generateNavigationPlan(demoCases[0].userCase);

    expect(parseMock).not.toHaveBeenCalled();
    expect(plan.mode).toBe("demo");
  });
});
