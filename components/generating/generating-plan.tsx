"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, LoaderCircle, RotateCcw } from "lucide-react";
import { isLiveAiConsentCurrent } from "@/lib/ai/consent";
import { createFallbackPlan } from "@/lib/demo/fallback-plan";
import { FinalNavigationPlanSchema, type FinalNavigationPlan } from "@/lib/schemas";
import {
  clearLiveAiConsent,
  loadCase,
  loadLiveAiConsent,
  savePlan,
} from "@/lib/storage";
import { useLocale } from "@/components/locale-provider";
import { localize } from "@/lib/i18n";

type ApiErrorBody = { code?: string; message?: string };

export function GeneratingPlan() {
  const router = useRouter();
  const { locale } = useLocale();
  const copy = localize(locale, {
    ru: {
      stages: ["Проверяем согласие и срочность", "Скрываем лишние персональные данные", "Сопоставляем официальные источники", "Строим структурированный маршрут", "Проверяем схему ответа", "Проверяем источники и зависимости", "Готовим безопасный результат"],
      errorTitle: "Маршрут пока не готов",
      error: "Не удалось создать безопасный маршрут.",
      saved: "Ваши ответы сохранены в этом браузере.",
      retry: "Вернуться и проверить ответы",
      title: "Собираем понятный маршрут",
      localText: "Маршрут создаётся локально по проверенному демонстрационному шаблону. Сетевой AI-вызов не выполняется.",
      liveText: "Выполняется один согласованный запрос к GPT-5.6 Terra, затем результат проверяется локальными правилами FORA.",
      localReason: "Итерация 3: безопасный локальный режим без передачи данных во внешний AI-сервис.",
      liveFailureReason: "GPT-5.6 не был использован или не прошёл проверку; показан безопасный локальный маршрут.",
      localMode: "Локальный режим",
      liveMode: "GPT-5.6 Terra · защищённый запрос",
    },
    uk: {
      stages: ["Перевіряємо згоду й терміновість", "Приховуємо зайві персональні дані", "Зіставляємо офіційні джерела", "Будуємо структурований маршрут", "Перевіряємо схему відповіді", "Перевіряємо джерела й залежності", "Готуємо безпечний результат"],
      errorTitle: "Маршрут поки не готовий",
      error: "Не вдалося створити безпечний маршрут.",
      saved: "Ваші відповіді збережено у цьому браузері.",
      retry: "Повернутися й перевірити відповіді",
      title: "Складаємо зрозумілий маршрут",
      localText: "Маршрут створюється локально за перевіреним демонстраційним шаблоном. Мережевий AI-виклик не виконується.",
      liveText: "Виконується один погоджений запит до GPT-5.6 Terra, після чого результат перевіряють локальні правила FORA.",
      localReason: "Ітерація 3: безпечний локальний режим без передавання даних зовнішньому AI-сервісу.",
      liveFailureReason: "GPT-5.6 не використано або відповідь не пройшла перевірку; показано безпечний локальний маршрут.",
      localMode: "Локальний режим",
      liveMode: "GPT-5.6 Terra · захищений запит",
    },
    en: {
      stages: ["Checking consent and urgency", "Hiding unnecessary personal data", "Matching official sources", "Building a structured pathway", "Validating the response schema", "Auditing sources and dependencies", "Preparing the safe result"],
      errorTitle: "The pathway is not ready yet",
      error: "A safe pathway could not be created.",
      saved: "Your answers are saved in this browser.",
      retry: "Return and review answers",
      title: "Building a clear pathway",
      localText: "The pathway is created locally from a checked demonstration template. No network AI call is made.",
      liveText: "One consented request is made to GPT-5.6 Terra, then FORA's local rules audit the result.",
      localReason: "Iteration 3: safe local mode with no data sent to an external AI service.",
      liveFailureReason: "GPT-5.6 was not used or its response failed validation; a safe local pathway is shown.",
      localMode: "Local mode",
      liveMode: "GPT-5.6 Terra · protected request",
    },
  });
  const stages = copy.stages;
  const started = useRef(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [liveRequested, setLiveRequested] = useState(false);

  const run = useCallback(async () => {
    const userCase = loadCase();
    if (!userCase) {
      router.replace("/");
      return;
    }

    const wantsLive = new URLSearchParams(window.location.search).get("mode") === "live";
    setLiveRequested(wantsLive);
    setError(null);
    setStage(0);

    let plan: FinalNavigationPlan;
    try {
      for (let index = 0; index < stages.length; index += 1) {
        setStage(index);
        await new Promise<void>((resolve) => window.setTimeout(resolve, 140));
      }

      if (!wantsLive) {
        clearLiveAiConsent();
        plan = createFallbackPlan({ ...userCase, locale }, copy.localReason, locale);
      } else {
        const consent = loadLiveAiConsent();
        clearLiveAiConsent();
        if (!isLiveAiConsentCurrent(consent) || consent.caseId !== userCase.id) {
          router.replace("/review");
          return;
        }

        try {
          const response = await fetch("/api/navigate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
            body: JSON.stringify({ userCase: { ...userCase, locale }, consent }),
          });
          const responseBody: unknown = await response.json();
          const apiError = responseBody as ApiErrorBody;

          if (apiError.code === "EMERGENCY_STOP") {
            router.replace("/emergency");
            return;
          }
          if (apiError.code === "CONSENT_REQUIRED" || apiError.code === "CONSENT_CASE_MISMATCH") {
            router.replace("/review");
            return;
          }
          if (apiError.code === "UNSAFE_REQUEST") {
            setError(apiError.message || copy.error);
            return;
          }

          plan = response.ok
            ? FinalNavigationPlanSchema.parse(responseBody)
            : createFallbackPlan({ ...userCase, locale }, copy.liveFailureReason, locale);
        } catch {
          plan = createFallbackPlan({ ...userCase, locale }, copy.liveFailureReason, locale);
        }
      }

      savePlan(FinalNavigationPlanSchema.parse(plan));
      setStage(stages.length);
      router.replace("/plan");
    } catch {
      setError(copy.error);
    }
  }, [copy.error, copy.liveFailureReason, copy.localReason, locale, router, stages]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void run();
  }, [run]);

  return (
    <div className="mx-auto max-w-2xl py-16 sm:py-24">
      <div className="surface border-t-4 border-t-[var(--teal)] p-6 sm:p-10">
        {error ? (
          <div role="alert">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--danger-soft)] text-[var(--danger)]"><AlertCircle /></span>
            <h1 className="display-font mt-5 text-3xl">{copy.errorTitle}</h1>
            <p className="mt-3 leading-7 text-[var(--muted)]">{error}</p>
            <p className="mt-2 text-sm text-[var(--muted)]">{copy.saved}</p>
            <button className="button-primary mt-7" onClick={() => router.replace("/review")}><RotateCcw className="h-5 w-5" /> {copy.retry}</button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--teal)] text-white"><LoaderCircle className="animate-spin" /></span>
              <div><p className="eyebrow">FORA Navigator · {liveRequested ? copy.liveMode : copy.localMode}</p><h1 className="display-font mt-1 text-3xl">{copy.title}</h1></div>
            </div>
            <p className="mt-5 text-[var(--muted)]">{liveRequested ? copy.liveText : copy.localText}</p>
            <ol className="mt-8 space-y-3">
              {stages.map((label, index) => {
                const done = index < stage;
                const active = index === stage;
                return (
                  <li key={label} className={`flex items-center gap-3 border-l-2 py-2 pl-4 ${active ? "border-[var(--coral)] font-extrabold text-[var(--ink)]" : done ? "border-[var(--teal)] text-[var(--muted)]" : "border-[var(--line)] text-[#87958f]"}`}>
                    <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs ${done ? "bg-[var(--teal)] text-white" : active ? "bg-[var(--coral-soft)] text-[var(--coral)]" : "bg-[#e6ebe8]"}`}>{done ? <Check className="h-4 w-4" /> : index + 1}</span>
                    {label}
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </div>
    </div>
  );
}
