"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Edit3,
  ExternalLink,
  FileLock2,
  Laptop,
  Sparkles,
} from "lucide-react";
import type { UserCase } from "@/lib/schemas";
import { createLiveAiConsent } from "@/lib/ai/consent";
import { redactSensitiveText } from "@/lib/safety/redact";
import { getCaseWarnings } from "@/lib/safety/triage";
import {
  clearLiveAiConsent,
  loadCase,
  saveLiveAiConsent,
} from "@/lib/storage";
import { useLocale } from "@/components/locale-provider";
import { localize } from "@/lib/i18n";

export function ReviewCase() {
  const router = useRouter();
  const { locale } = useLocale();
  const copy = localize(locale, {
    ru: {
      done: "Интервью завершено",
      title: "Проверьте, правильно ли мы поняли",
      intro: "Исправьте неточности сейчас. Маршрут будет строиться только по этим данным и официальной базе знаний.",
      attention: "Нужно обратить внимание",
      pii: "В тексте найден возможный контакт или номер документа. Он будет скрыт перед обработкой; лучше удалить его вручную.",
      summary: "Краткое резюме",
      edit: "Изменить",
      fields: ["Возраст", "Потребности", "Статус проживания / защиты", "Медицинское покрытие", "Empadronamiento", "Медицинские документы", "Испанский язык", "Срочность"],
      main: "Главная задача",
      back: "Назад к ответам",
      loading: "Проверяем сохранённые ответы…",
      yes: "Есть",
      no: "Нет",
      unknown: "Неизвестно",
      originals: "Оригиналы",
      copies: "Копии / выписки",
      none: "Нет",
      basic: "Базовый",
      conversational: "Разговорный",
      noSpanish: "Не говорит",
      urgent: "Нужна помощь скоро",
      standard: "Обычный маршрут",
      statuses: ["Гражданство ЕС / ЕЭЗ / Швейцарии", "Виза или разрешение на проживание", "Заявление на международную защиту", "Предоставлена международная защита", "Временная защита", "Нет действующего разрешения", "Неизвестно"],
      choose: "Как создать маршрут",
      chooseHelp: "Оба варианта используют одну официальную базу знаний. Внешний AI-вызов — только по отдельному выбору.",
      localTitle: "Локально в браузере",
      localText: "Проверенный демонстрационный шаблон. Ответы не отправляются в OpenAI или другой внешний AI-сервис.",
      localButton: "Создать мой маршрут локально",
      aiTitle: "GPT-5.6 Terra",
      aiText: "Один запрос создаст персонализированный маршрут по этому вымышленному кейсу. Сначала система скроет обнаруженные контакты и номера документов.",
      dataDetails: "Что важно о данных",
      dataFacts: [
        "FORA отправляет запрос с параметром store:false и не просит OpenAI сохранять состояние ответа.",
        "По правилам OpenAI данные API не используются для обучения по умолчанию.",
        "Журналы контроля злоупотреблений OpenAI могут храниться до 30 дней. Это не Zero Data Retention.",
        "Детектор может не распознать имя или адрес — используйте здесь только вымышленные данные.",
      ],
      policy: "Официальные правила обработки данных OpenAI",
      consent: "Я понимаю условия и разрешаю один раз отправить этот вымышленный кейс в OpenAI API.",
      aiButton: "Создать с GPT-5.6 Terra",
      removePii: "Сначала удалите найденные контакты или номера документов — тогда AI-вариант станет доступен.",
    },
    uk: {
      done: "Інтерв'ю завершено",
      title: "Перевірте, чи правильно ми зрозуміли",
      intro: "Виправте неточності зараз. Маршрут будуватиметься лише за цими даними й офіційною базою знань.",
      attention: "Потрібно звернути увагу",
      pii: "У тексті знайдено можливий контакт або номер документа. Його буде приховано перед обробкою; краще видалити вручну.",
      summary: "Коротке резюме",
      edit: "Змінити",
      fields: ["Вік", "Потреби", "Статус проживання / захисту", "Медичне покриття", "Empadronamiento", "Медичні документи", "Іспанська мова", "Терміновість"],
      main: "Головне завдання",
      back: "Назад до відповідей",
      loading: "Перевіряємо збережені відповіді…",
      yes: "Є",
      no: "Немає",
      unknown: "Невідомо",
      originals: "Оригінали",
      copies: "Копії / виписки",
      none: "Немає",
      basic: "Базовий",
      conversational: "Розмовний",
      noSpanish: "Не розмовляє",
      urgent: "Допомога потрібна скоро",
      standard: "Звичайний маршрут",
      statuses: ["Громадянство ЄС / ЄЕЗ / Швейцарії", "Віза або дозвіл на проживання", "Заява на міжнародний захист", "Надано міжнародний захист", "Тимчасовий захист", "Немає чинного дозволу", "Невідомо"],
      choose: "Як створити маршрут",
      chooseHelp: "Обидва варіанти використовують одну офіційну базу знань. Зовнішній AI-виклик — лише за окремим вибором.",
      localTitle: "Локально у браузері",
      localText: "Перевірений демонстраційний шаблон. Відповіді не надсилаються до OpenAI або іншого зовнішнього AI-сервісу.",
      localButton: "Створити мій маршрут локально",
      aiTitle: "GPT-5.6 Terra",
      aiText: "Один запит створить персоналізований маршрут за цим вигаданим кейсом. Спочатку система приховає виявлені контакти й номери документів.",
      dataDetails: "Що важливо про дані",
      dataFacts: [
        "FORA надсилає запит із параметром store:false і не просить OpenAI зберігати стан відповіді.",
        "За правилами OpenAI дані API не використовуються для навчання за замовчуванням.",
        "Журнали контролю зловживань OpenAI можуть зберігатися до 30 днів. Це не Zero Data Retention.",
        "Детектор може не розпізнати ім'я або адресу — використовуйте тут лише вигадані дані.",
      ],
      policy: "Офіційні правила обробки даних OpenAI",
      consent: "Я розумію умови й дозволяю один раз надіслати цей вигаданий кейс до OpenAI API.",
      aiButton: "Створити з GPT-5.6 Terra",
      removePii: "Спочатку видаліть знайдені контакти або номери документів — тоді AI-варіант стане доступним.",
    },
    en: {
      done: "Interview complete",
      title: "Check that we understood correctly",
      intro: "Correct anything inaccurate now. The pathway will use only this information and the official knowledge base.",
      attention: "Needs attention",
      pii: "The text may contain contact details or an identity number. It will be hidden before processing; removing it manually is safer.",
      summary: "Case summary",
      edit: "Edit",
      fields: ["Age", "Support needs", "Residence / protection status", "Healthcare coverage", "Empadronamiento", "Medical documents", "Spanish level", "Urgency"],
      main: "Main goal",
      back: "Back to answers",
      loading: "Checking saved answers…",
      yes: "Yes",
      no: "No",
      unknown: "Unknown",
      originals: "Originals",
      copies: "Copies / extracts",
      none: "None",
      basic: "Basic",
      conversational: "Conversational",
      noSpanish: "None",
      urgent: "Help is needed soon",
      standard: "Standard pathway",
      statuses: ["EU / EEA / Swiss citizen", "Visa or residence permit", "International-protection applicant", "International protection granted", "Temporary protection", "No current authorisation", "Unknown"],
      choose: "How to create the pathway",
      chooseHelp: "Both options use the same official knowledge base. An external AI call happens only after a separate choice.",
      localTitle: "Local in this browser",
      localText: "A checked demonstration template. Answers are not sent to OpenAI or another external AI service.",
      localButton: "Create my pathway locally",
      aiTitle: "GPT-5.6 Terra",
      aiText: "One request will create a tailored pathway for this fictitious case. Detected contact details and document numbers are hidden first.",
      dataDetails: "What matters about the data",
      dataFacts: [
        "FORA sends store:false and does not ask OpenAI to retain response state.",
        "Under OpenAI policy, API data is not used for training by default.",
        "OpenAI abuse-monitoring logs may be retained for up to 30 days. This is not Zero Data Retention.",
        "The detector may miss a name or address — use fictitious data here only.",
      ],
      policy: "Official OpenAI data controls",
      consent: "I understand the terms and allow this fictitious case to be sent once to the OpenAI API.",
      aiButton: "Create with GPT-5.6 Terra",
      removePii: "Remove the detected contact details or document numbers first; the AI option will then become available.",
    },
  });

  const statusValues: UserCase["immigrationStatus"][] = ["eu_eea_swiss", "residence_or_visa", "asylum_applicant", "international_protection", "temporary_protection", "no_current_authorization", "unknown"];
  const statusLabels = Object.fromEntries(statusValues.map((status, index) => [status, copy.statuses[index]])) as Record<UserCase["immigrationStatus"], string>;
  const labels = {
    immigrationStatus: statusLabels,
    healthcareCoverage: { yes: copy.yes, no: copy.no, unknown: copy.unknown },
    registeredAtAddress: { yes: copy.yes, no: copy.no, unknown: copy.unknown },
    diagnosticDocuments: { originals: copy.originals, copies: copy.copies, none: copy.none, unknown: copy.unknown },
    spanishLevel: { none: copy.noSpanish, basic: copy.basic, conversational: copy.conversational },
  };
  const [userCase, setUserCase] = useState<UserCase | null>(null);
  const [aiConsentChecked, setAiConsentChecked] = useState(false);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      const stored = loadCase();
      if (!stored) router.replace("/");
      else setUserCase(stored);
    });
    return () => {
      active = false;
    };
  }, [router]);

  const warnings = useMemo(() => (userCase ? getCaseWarnings(userCase) : []), [userCase]);
  const pii = useMemo(() => (userCase ? redactSensitiveText(`${userCase.narrative} ${userCase.mainProblem}`) : null), [userCase]);

  if (!userCase) return <div className="py-24 text-center text-[var(--muted)]">{copy.loading}</div>;

  const supported = userCase.household.find((member) => member.role !== "caregiver")!;
  const piiDetected = Boolean(pii && pii.detected.length > 0);

  function createLocalPlan() {
    clearLiveAiConsent();
    router.push("/generating?mode=local");
  }

  function createLivePlan() {
    if (!aiConsentChecked || piiDetected) return;
    saveLiveAiConsent(createLiveAiConsent(userCase!.id));
    router.push("/generating?mode=live");
  }

  return (
    <div className="mx-auto max-w-4xl py-8 sm:py-12">
      <div className="flex items-center gap-3 text-sm font-bold text-[var(--teal)]">
        <CheckCircle2 className="h-5 w-5" /> {copy.done}
      </div>
      <h1 className="display-font mt-3 text-4xl sm:text-5xl">{copy.title}</h1>
      <p className="mt-4 max-w-2xl text-[var(--muted)]">{copy.intro}</p>

      {warnings.length > 0 && (
        <section className="notice mt-7" aria-labelledby="warnings-title">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#8b5c00]" />
            <div><h2 id="warnings-title" className="font-extrabold">{copy.attention}</h2><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div>
          </div>
        </section>
      )}

      {piiDetected && (
        <div className="danger-notice mt-4 flex gap-3 text-sm">
          <FileLock2 className="h-5 w-5 shrink-0" />
          {copy.pii}
        </div>
      )}

      <section className="surface mt-8 overflow-hidden">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] p-5 sm:p-7">
          <div><p className="eyebrow">{copy.summary}</p><h2 className="display-font mt-2 text-2xl">{userCase.municipality}, Asturias</h2></div>
          <Link href="/intake?step=0" className="button-quiet min-h-10 px-3 py-2 text-sm"><Edit3 className="h-4 w-4" /> {copy.edit}</Link>
        </div>
        <div className="p-5 sm:p-7">
          <p className="text-lg leading-8">{userCase.narrative}</p>
          <div className="mt-7 grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {[
              [copy.fields[0], supported.ageRange],
              [copy.fields[1], supported.supportNeeds.join(", ")],
              [copy.fields[2], labels.immigrationStatus[userCase.immigrationStatus]],
              [copy.fields[3], labels.healthcareCoverage[userCase.healthcareCoverage]],
              [copy.fields[4], labels.registeredAtAddress[userCase.registeredAtAddress]],
              [copy.fields[5], labels.diagnosticDocuments[userCase.diagnosticDocuments]],
              [copy.fields[6], labels.spanishLevel[userCase.spanishLevel]],
              [copy.fields[7], userCase.urgency.level === "urgent" ? copy.urgent : copy.standard],
            ].map(([label, value]) => (
              <div key={label} className="border-b border-[var(--line)] pb-4">
                <dt className="text-xs font-extrabold uppercase tracking-[0.08em] text-[var(--muted)]">{label}</dt>
                <dd className="mt-1 font-semibold">{value}</dd>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6 border border-[var(--line)] bg-white p-5 sm:p-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
          <div className="min-w-0"><h2 className="font-extrabold">{copy.main}</h2><p className="mt-2 leading-7 text-[var(--muted)]">{userCase.mainProblem}</p></div>
          <Link href="/intake?step=9" className="button-quiet min-h-10 shrink-0 px-3 py-2 text-sm"><Edit3 className="h-4 w-4" /> {copy.edit}</Link>
        </div>
      </section>

      <section className="mt-8" aria-labelledby="generation-title">
        <h2 id="generation-title" className="display-font text-3xl">{copy.choose}</h2>
        <p className="mt-2 text-[var(--muted)]">{copy.chooseHelp}</p>
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <article className="flex flex-col border border-[var(--line)] bg-white p-5 sm:p-6">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-[#e6f0ec] text-[var(--teal)]"><Laptop className="h-5 w-5" /></span>
            <h3 className="display-font mt-4 text-2xl">{copy.localTitle}</h3>
            <p className="mt-3 flex-1 leading-7 text-[var(--muted)]">{copy.localText}</p>
            <button type="button" className="button-secondary mt-6 w-full" onClick={createLocalPlan}>{copy.localButton} <ArrowRight className="h-5 w-5" /></button>
          </article>

          <article className="flex flex-col border-2 border-[var(--teal)] bg-white p-5 sm:p-6">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-[var(--coral-soft)] text-[var(--coral)]"><Sparkles className="h-5 w-5" /></span>
            <h3 className="display-font mt-4 text-2xl">{copy.aiTitle}</h3>
            <p className="mt-3 leading-7 text-[var(--muted)]">{copy.aiText}</p>
            <details className="mt-4 border-y border-[var(--line)] py-3 text-sm">
              <summary className="cursor-pointer font-extrabold">{copy.dataDetails}</summary>
              <ul className="mt-3 list-disc space-y-2 pl-5 leading-6 text-[var(--muted)]">
                {copy.dataFacts.map((fact) => <li key={fact}>{fact}</li>)}
              </ul>
              <a className="mt-3 inline-flex items-center gap-1 font-bold text-[var(--teal)] underline" href="https://developers.openai.com/api/docs/guides/your-data" target="_blank" rel="noreferrer">{copy.policy} <ExternalLink className="h-3.5 w-3.5" /></a>
            </details>
            {piiDetected && <p id="ai-pii-warning" className="mt-4 text-sm font-bold text-[var(--danger)]">{copy.removePii}</p>}
            <label className={`mt-5 flex items-start gap-3 text-sm leading-6 ${piiDetected ? "text-[#7d8782]" : "cursor-pointer"}`}>
              <input
                className="mt-1 h-5 w-5 shrink-0 accent-[var(--teal)]"
                type="checkbox"
                checked={aiConsentChecked}
                disabled={piiDetected}
                onChange={(event) => setAiConsentChecked(event.target.checked)}
                aria-describedby={piiDetected ? "ai-pii-warning" : undefined}
              />
              <span>{copy.consent}</span>
            </label>
            <button type="button" className="button-primary mt-5 w-full" disabled={!aiConsentChecked || piiDetected} onClick={createLivePlan}>{copy.aiButton} <ArrowRight className="h-5 w-5" /></button>
          </article>
        </div>
      </section>

      <div className="mt-8">
        <Link className="button-quiet" href="/intake?step=10"><ArrowLeft className="h-5 w-5" /> {copy.back}</Link>
      </div>
    </div>
  );
}
