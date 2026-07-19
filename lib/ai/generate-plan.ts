import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { createFallbackPlan } from "@/lib/demo/fallback-plan";
import { auditModelPlan } from "@/lib/ai/audit";
import { NAVIGATION_PIPELINE_VERSION } from "@/lib/ai/pipeline";
import { buildNavigationInput, buildNavigatorSystemPrompt } from "@/lib/ai/prompt";
import {
  FinalNavigationPlanSchema,
  ModelNavigationPlanSchema,
  type FinalNavigationPlan,
  type UserCase,
} from "@/lib/schemas";

export const DEFAULT_MODEL = "gpt-5.6-terra";

function repairInstruction(error: unknown) {
  if (error instanceof z.ZodError) return "the result did not match the required schema";
  if (error instanceof Error && /(?:Источник|источник|Шаг|шаг|Документ|документ|Зависимости|язык плана|фокус)/i.test(error.message)) {
    return error.message.slice(0, 500);
  }
  return "the previous response was incomplete or failed a safety check";
}

function safeFallbackReason(error: unknown) {
  if (error instanceof z.ZodError) return "Ответ GPT-5.6 не прошёл проверку структуры; использован локальный маршрут.";
  if (error instanceof Error && /(?:Источник|источник|Шаг|шаг|Документ|документ|Зависимости|фокус|контактные данные|обещание)/i.test(error.message)) {
    return "Ответ GPT-5.6 не прошёл проверку источников и безопасности; использован локальный маршрут.";
  }
  return "GPT-5.6 сейчас недоступен или вернул неполный ответ; использован локальный маршрут.";
}

async function requestStructuredPlan(userCase: UserCase, repairNote?: string) {
  const configuredModel = process.env.OPENAI_MODEL || DEFAULT_MODEL;
  if (configuredModel !== DEFAULT_MODEL) {
    throw new Error("Runtime model configuration is not approved for this MVP.");
  }

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    maxRetries: 0,
    timeout: 45_000,
  });

  const response = await client.responses.parse({
    model: configuredModel,
    reasoning: { effort: "medium" },
    store: false,
    // At Terra pricing, this cap keeps two full attempts inside the MVP's $0.30 output budget.
    max_output_tokens: 8_000,
    input: [
      { role: "system", content: buildNavigatorSystemPrompt(userCase) },
      {
        role: "user",
        content: `${buildNavigationInput(userCase)}${
          repairNote
            ? `\n\nREPAIR: the previous attempt failed validation: ${repairNote}. Rebuild the full result and satisfy every schema and safety rule.`
            : ""
        }`,
      },
    ],
    text: {
      format: zodTextFormat(ModelNavigationPlanSchema, "final_navigation_plan"),
      verbosity: "medium",
    },
  });

  const refusal = response.output
    .filter((item) => item.type === "message")
    .flatMap((item) => item.content)
    .find((content) => content.type === "refusal");
  if (refusal?.type === "refusal") {
    throw new Error("Модель отказалась формировать навигационный план.");
  }
  if (response.error) {
    throw new Error("OpenAI API не завершил формирование ответа.");
  }
  if (response.status && response.status !== "completed") {
    const reason = response.incomplete_details?.reason || response.status;
    throw new Error(`Ответ модели не завершён: ${reason}.`);
  }

  if (!response.output_parsed) {
    throw new Error("Модель не вернула структурированный план.");
  }

  return auditModelPlan(response.output_parsed, userCase);
}

export async function generateNavigationPlan(userCase: UserCase): Promise<FinalNavigationPlan> {
  if (process.env.ENABLE_LIVE_AI !== "true") {
    return createFallbackPlan(userCase, "Live AI закрыт feature gate; показан локальный Demo Mode.");
  }

  if (!process.env.OPENAI_API_KEY) {
    return createFallbackPlan(userCase, "API-ключ не настроен; показан проверяемый конкурсный пример.");
  }

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const parsed = await requestStructuredPlan(
        userCase,
        attempt === 1 ? repairInstruction(lastError) : undefined,
      );

      return FinalNavigationPlanSchema.parse({
        ...parsed,
        generatedAt: new Date().toISOString(),
        mode: "live",
      });
    } catch (error) {
      lastError = error;
    }
  }

  if (process.env.ENABLE_DEMO_FALLBACK !== "false") {
    return createFallbackPlan(
      userCase,
      `${safeFallbackReason(lastError)} Pipeline ${NAVIGATION_PIPELINE_VERSION}.`,
    );
  }

  throw lastError instanceof Error ? lastError : new Error("Не удалось создать безопасный план.");
}
