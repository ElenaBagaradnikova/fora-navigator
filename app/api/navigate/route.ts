import { NextResponse } from "next/server";
import { generateNavigationPlan } from "@/lib/ai/generate-plan";
import { isLiveAiConsentCurrent } from "@/lib/ai/consent";
import {
  FinalNavigationPlanSchema,
  NavigationRequestSchema,
  type AppLocale,
} from "@/lib/schemas";
import { redactSensitiveText } from "@/lib/safety/redact";
import { assessRequestSafety, assessUrgency } from "@/lib/safety/triage";

export const runtime = "nodejs";

const MAX_REQUEST_BYTES = 64_000;
const responseHeaders = { "Cache-Control": "no-store, max-age=0" };

function json(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: responseHeaders });
}

function localizedSafetyNote(locale: AppLocale, kind: "guarantee" | "redaction") {
  const notes = {
    guarantee: {
      ru: "Система не может гарантировать выплату, статус или услугу. Решение принимает компетентный орган после проверки условий.",
      uk: "Система не може гарантувати виплату, статус або послугу. Рішення ухвалює компетентний орган після перевірки умов.",
      en: "The system cannot guarantee a benefit, status or service. The competent authority decides after checking the conditions.",
    },
    redaction: {
      ru: "Перед обращением к GPT-5.6 из описания автоматически скрыты возможные контакты или номера документов.",
      uk: "Перед зверненням до GPT-5.6 з опису автоматично приховано можливі контакти або номери документів.",
      en: "Possible contact details or document numbers were automatically hidden before the GPT-5.6 request.",
    },
  } as const;
  return notes[kind][locale];
}

export async function POST(request: Request) {
  // Fail closed before reading any request body when the competition-only live mode is off.
  if (process.env.ENABLE_LIVE_AI !== "true") {
    return json(
      {
        code: "LIVE_AI_DISABLED",
        message: "Live AI выключен. Можно безопасно создать локальный демонстрационный маршрут.",
      },
      503,
    );
  }

  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > MAX_REQUEST_BYTES) {
    return json({ code: "REQUEST_TOO_LARGE", message: "Запрос слишком большой." }, 413);
  }

  let body: unknown;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_REQUEST_BYTES) {
      return json({ code: "REQUEST_TOO_LARGE", message: "Запрос слишком большой." }, 413);
    }
    body = JSON.parse(raw) as unknown;
  } catch {
    return json({ code: "INVALID_JSON", message: "Не удалось прочитать запрос." }, 400);
  }

  const consent = (body as { consent?: unknown } | null)?.consent;
  if (!isLiveAiConsentCurrent(consent)) {
    return json(
      {
        code: "CONSENT_REQUIRED",
        message: "Для внешней AI-обработки нужно отдельное актуальное согласие.",
      },
      403,
    );
  }

  const parsedRequest = NavigationRequestSchema.safeParse(body);
  if (!parsedRequest.success) {
    return json(
      {
        code: "INVALID_CASE",
        message: "Не удалось проверить данные дела. Вернитесь и проверьте ответы.",
        issues: parsedRequest.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      400,
    );
  }

  const { userCase, consent: acceptedConsent } = parsedRequest.data;
  if (acceptedConsent.caseId !== userCase.id) {
    return json(
      {
        code: "CONSENT_CASE_MISMATCH",
        message: "Согласие относится к другому демонстрационному кейсу.",
      },
      403,
    );
  }

  try {
    const redactedNarrative = redactSensitiveText(userCase.narrative);
    const redactedProblem = redactSensitiveText(userCase.mainProblem);
    const safeCase = {
      ...userCase,
      narrative: redactedNarrative.text,
      mainProblem: redactedProblem.text,
    };

    const urgency = assessUrgency(
      `${safeCase.narrative} ${safeCase.mainProblem}`,
      safeCase.urgency.level,
      safeCase.locale,
    );
    if (urgency.stopNormalFlow) {
      return json({ code: "EMERGENCY_STOP", message: urgency.message, urgency }, 422);
    }

    const safety = assessRequestSafety(`${safeCase.narrative} ${safeCase.mainProblem}`);
    if (safety.illegalRequest) {
      return json(
        {
          code: "UNSAFE_REQUEST",
          message:
            "FORA Navigator не помогает подделывать документы, скрывать сведения или обходить закон. Можно запросить законный способ исправить документ или получить консультацию.",
        },
        422,
      );
    }

    const plan = await generateNavigationPlan({ ...safeCase, urgency });
    const priorityNotes: string[] = [];
    if (safety.guaranteeRequest) {
      priorityNotes.push(localizedSafetyNote(safeCase.locale, "guarantee"));
    }

    const redactionTypes = [...new Set([...redactedNarrative.detected, ...redactedProblem.detected])];
    if (redactionTypes.length > 0) {
      priorityNotes.push(localizedSafetyNote(safeCase.locale, "redaction"));
    }

    const finalPlan = FinalNavigationPlanSchema.parse({
      ...plan,
      safetyNotes: [...new Set([...priorityNotes, ...plan.safetyNotes])].slice(0, 12),
    });
    return json(finalPlan, 200);
  } catch {
    return json(
      {
        code: "NAVIGATION_FAILED",
        message:
          "Сейчас не удалось собрать безопасный маршрут. Ваши ответы сохранены в этом браузере — попробуйте ещё раз или выберите локальный режим.",
      },
      500,
    );
  }
}
