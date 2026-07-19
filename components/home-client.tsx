"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowRight, Check, Clock3, Eye, ShieldCheck, Sparkles } from "lucide-react";
import { createBlankCase } from "@/lib/demo/cases";
import { redactSensitiveText } from "@/lib/safety/redact";
import { assessUrgency } from "@/lib/safety/triage";
import { saveCase } from "@/lib/storage";
import { useLocale } from "@/components/locale-provider";
import { getDemoCases } from "@/lib/demo/cases";
import { localize } from "@/lib/i18n";
import { StorageChoice } from "@/components/storage-choice";

export function HomeClient() {
  const router = useRouter();
  const { locale } = useLocale();
  const copy = localize(locale, {
    ru: {
      example: "Мы недавно переехали в Овьедо с подростком 16 лет. У него аутизм, испанского признания инвалидности пока нет. Не знаем, как начать медицинское обслуживание и обучение.",
      badge: "Конкурсный Demo Mode", eyebrow: "Когда всё новое — нужен первый понятный шаг", title: "Маршрут для семьи, а не ещё один список ссылок",
      intro: "Пройдите безопасный вымышленный сценарий. FORA Navigator задаст только нужные вопросы и соберёт порядок действий для медицины, обучения, социальных служб и документов.",
      demoStrong: "Сейчас работает только демонстрация.", demoText: "Обычный маршрут создаётся локально в браузере и ничего не отправляет в OpenAI. Не вводите реальную историю семьи.",
      question: "Что происходит в вымышленном примере?", questionHelp: "Можно придумать свой сценарий или выбрать готовый ниже.",
      more: (count: number) => `Ещё ${count} символов для начала`, editable: "Описание можно будет исправить",
      pii: "Похоже, в тексте есть контакт или номер документа. Удалите его перед продолжением — даже в вымышленном примере такие данные не нужны.",
      fictional: "Это вымышленный пример", fictionalHelp: "Я не использую здесь реальные данные человека или семьи.",
      emergency: "Открыть срочную помощь", build: "Собрать демо-маршрут", choose: "Или выбрать вымышленный пример",
      caveat: "Информационный помощник. Demo Mode не ставит диагноз, не назначает лечение и не гарантирует статус, выплату или услугу.",
      alt: "Семья идёт по понятному маршруту между медициной, школой, документами и поддержкой",
      stats: ["ближайших шага", "языка писем", "единый план"],
      features: [["Сначала безопасность", "Срочная ситуация останавливает обычный административный маршрут."], ["Видно, чему доверять", "У каждого шага есть источник, дата проверки и отметка неопределённости."], ["По порядку, не всё сразу", "Действия разделены: сейчас, 7 дней, месяц и позже."]],
      demoEyebrow: "Без реальных персональных данных", demoTitle: "Попробовать готовый сценарий", demoIntro: "Все люди и обстоятельства в примерах вымышлены. Ответы уже заполнены — их можно пройти и изменить.", open: "Открыть кейс",
    },
    uk: {
      example: "Ми нещодавно переїхали до Ов'єдо з підлітком 16 років. У нього аутизм, іспанського визнання інвалідності поки немає. Не знаємо, як почати медичне обслуговування й навчання.",
      badge: "Конкурсний Demo Mode", eyebrow: "Коли все нове — потрібен перший зрозумілий крок", title: "Маршрут для сім'ї, а не ще один список посилань",
      intro: "Пройдіть безпечний вигаданий сценарій. FORA Navigator поставить лише потрібні запитання та складе порядок дій для медицини, навчання, соціальних служб і документів.",
      demoStrong: "Зараз працює лише демонстрація.", demoText: "Звичайний маршрут створюється локально у браузері й нічого не надсилає до OpenAI. Не вводьте реальну історію сім'ї.",
      question: "Що відбувається у вигаданому прикладі?", questionHelp: "Можна придумати свій сценарій або вибрати готовий нижче.",
      more: (count: number) => `Ще ${count} символів для початку`, editable: "Опис можна буде виправити",
      pii: "Схоже, текст містить контакт або номер документа. Видаліть його перед продовженням — навіть у вигаданому прикладі такі дані не потрібні.",
      fictional: "Це вигаданий приклад", fictionalHelp: "Я не використовую тут реальні дані людини або сім'ї.",
      emergency: "Відкрити термінову допомогу", build: "Створити демо-маршрут", choose: "Або вибрати вигаданий приклад",
      caveat: "Інформаційний помічник. Demo Mode не встановлює діагноз, не призначає лікування й не гарантує статус, виплату або послугу.",
      alt: "Сім'я йде зрозумілим маршрутом між медициною, школою, документами та підтримкою",
      stats: ["найближчі кроки", "мови листів", "єдиний план"],
      features: [["Спочатку безпека", "Термінова ситуація зупиняє звичайний адміністративний маршрут."], ["Видно, чому довіряти", "Кожен крок має джерело, дату перевірки й позначку невизначеності."], ["По черзі, не все одразу", "Дії поділено: зараз, 7 днів, місяць і пізніше."]],
      demoEyebrow: "Без реальних персональних даних", demoTitle: "Спробувати готовий сценарій", demoIntro: "Усі люди й обставини у прикладах вигадані. Відповіді вже заповнені — їх можна пройти та змінити.", open: "Відкрити кейс",
    },
    en: {
      example: "We recently moved to Oviedo with a 16-year-old teenager on the autism spectrum. There is no Spanish disability recognition yet. We do not know how to start healthcare and education.",
      badge: "Build Week Demo Mode", eyebrow: "When everything is new, start with one clear step", title: "A pathway for the family, not another list of links",
      intro: "Try a safe fictional scenario. FORA Navigator asks only relevant questions and puts healthcare, education, social services and documents into a clear order.",
      demoStrong: "This is currently a demonstration.", demoText: "The pathway is generated locally in your browser and nothing is sent to OpenAI. Do not enter a real family's story.",
      question: "What is happening in the fictional example?", questionHelp: "Create a scenario or choose a prepared one below.",
      more: (count: number) => `${count} more characters to start`, editable: "You can edit the description later",
      pii: "The text may contain contact details or an identity number. Remove it before continuing — such data is not needed even in a fictional example.",
      fictional: "This is a fictional example", fictionalHelp: "I am not using real information about a person or family here.",
      emergency: "Open urgent help", build: "Build demo pathway", choose: "Or choose a fictional example",
      caveat: "Information assistant. Demo Mode does not diagnose, prescribe treatment or guarantee a status, benefit or service.",
      alt: "A family follows a clear path through healthcare, school, documents and support",
      stats: ["next steps", "letter languages", "joined-up plan"],
      features: [["Safety first", "An urgent situation stops the ordinary administrative pathway."], ["See what to trust", "Every step shows its source, verification date and uncertainty."], ["In order, not all at once", "Actions are grouped into now, seven days, one month and later."]],
      demoEyebrow: "No real personal data", demoTitle: "Try a prepared scenario", demoIntro: "All people and circumstances in these examples are fictional. Answers are pre-filled and can be reviewed and changed.", open: "Open case",
    },
  });
  const demos = useMemo(() => getDemoCases(locale), [locale]);
  const [narrative, setNarrative] = useState("");
  const [isFictional, setIsFictional] = useState(false);
  const redaction = useMemo(() => redactSensitiveText(narrative), [narrative]);
  const urgency = useMemo(() => assessUrgency(narrative, undefined, locale), [locale, narrative]);
  const hasEnoughText = narrative.trim().length >= 20;
  const isReady = hasEnoughText && (urgency.stopNormalFlow || (isFictional && redaction.detected.length === 0));

  function startWithNarrative() {
    if (!isReady) return;
    const nextCase = createBlankCase(narrative.trim(), locale);
    saveCase({ ...nextCase, urgency });
    router.push(urgency.stopNormalFlow ? "/emergency" : "/intake");
  }

  function startDemo(index: number) {
    saveCase(demos[index].userCase);
    router.push("/intake");
  }

  return (
    <main>
      <section className="page-shell grid gap-8 py-10 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:py-16">
        <div>
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <span className="badge"><Sparkles className="h-4 w-4" /> {copy.badge}</span>
            <span className="badge bg-[var(--coral-soft)] text-[#7c3528]">Asturias · España</span>
          </div>
          <p className="eyebrow mb-3">{copy.eyebrow}</p>
          <h1 className="display-font max-w-3xl text-[2.7rem] leading-[0.98] sm:text-[3.5rem] lg:text-[4.1rem]">
            {copy.title}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">
            {copy.intro}
          </p>

          <div className="notice mt-6 text-sm leading-6" role="status">
            <strong>{copy.demoStrong}</strong> {copy.demoText}
          </div>
          <StorageChoice />

          <div className="mt-8 border-l-4 border-[var(--coral)] pl-5">
            <label htmlFor="case-description" className="block text-lg font-extrabold">
              {copy.question}
            </label>
            <p className="mt-1 text-sm text-[var(--muted)]">{copy.questionHelp}</p>
          </div>
          <textarea
            id="case-description"
            className="field mt-4 min-h-36 resize-y"
            value={narrative}
            onChange={(event) => setNarrative(event.target.value)}
            placeholder={copy.example}
            maxLength={4000}
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm text-[var(--muted)]">
            <span>{narrative.length < 20 ? copy.more(20 - narrative.length) : copy.editable}</span>
            <span>{narrative.length} / 4000</span>
          </div>
          {redaction.detected.length > 0 && (
            <div className="notice mt-4 text-sm" role="status">
              {copy.pii}
            </div>
          )}
          {!urgency.stopNormalFlow && (
            <label className="mt-5 flex cursor-pointer items-start gap-3 border border-[var(--line)] bg-white p-4 text-sm leading-6">
              <input
                type="checkbox"
                checked={isFictional}
                onChange={(event) => setIsFictional(event.target.checked)}
                className="mt-1 h-5 w-5 shrink-0 accent-[var(--teal)]"
              />
              <span><strong className="block">{copy.fictional}</strong>{copy.fictionalHelp}</span>
            </label>
          )}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button className="button-primary" onClick={startWithNarrative} disabled={!isReady}>
              {urgency.stopNormalFlow ? copy.emergency : copy.build} <ArrowRight className="h-5 w-5" />
            </button>
            <a className="button-quiet" href="#demo-cases">{copy.choose}</a>
          </div>
          <p className="mt-5 max-w-xl text-xs leading-5 text-[var(--muted)]">
            {copy.caveat}
          </p>
        </div>

        <div className="relative order-first lg:order-last">
          <div className="surface overflow-hidden rounded-[22px] p-2">
            <Image
              src="/fora-path-hero.png"
              alt={copy.alt}
              width={1536}
              height={1024}
              priority
              className="h-auto w-full rounded-[16px]"
            />
          </div>
          <div className="surface absolute -bottom-5 left-5 right-5 grid grid-cols-3 divide-x divide-[var(--line)] rounded-xl bg-white px-3 py-4 text-center shadow-lg sm:left-10 sm:right-10">
            <div className="px-2"><strong className="block text-xl text-[var(--teal)]">3</strong><span className="text-xs text-[var(--muted)]">{copy.stats[0]}</span></div>
            <div className="px-2"><strong className="block text-xl text-[var(--teal)]">2</strong><span className="text-xs text-[var(--muted)]">{copy.stats[1]}</span></div>
            <div className="px-2"><strong className="block text-xl text-[var(--teal)]">1</strong><span className="text-xs text-[var(--muted)]">{copy.stats[2]}</span></div>
          </div>
        </div>
      </section>

      <section className="mt-10 border-y border-[var(--line)] bg-[var(--teal)] text-white">
        <div className="page-shell grid gap-7 py-8 md:grid-cols-3">
          {[
            [ShieldCheck, ...copy.features[0]],
            [Eye, ...copy.features[1]],
            [Clock3, ...copy.features[2]],
          ].map(([Icon, title, description]) => {
            const ItemIcon = Icon as typeof ShieldCheck;
            return (
              <div key={String(title)} className="flex gap-4">
                <ItemIcon className="mt-1 h-6 w-6 shrink-0 text-[var(--yellow)]" aria-hidden="true" />
                <div><h2 className="font-extrabold">{String(title)}</h2><p className="mt-1 text-sm leading-6 text-[#d7e8e5]">{String(description)}</p></div>
              </div>
            );
          })}
        </div>
      </section>

      <section id="demo-cases" className="page-shell py-16">
        <div className="max-w-2xl">
          <p className="eyebrow">{copy.demoEyebrow}</p>
          <h2 className="display-font mt-2 text-4xl">{copy.demoTitle}</h2>
          <p className="mt-3 text-[var(--muted)]">{copy.demoIntro}</p>
        </div>
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {demos.map((demo, index) => (
            <button
              key={demo.slug}
              type="button"
              onClick={() => startDemo(index)}
              className="group min-h-48 border border-[var(--line)] bg-[var(--paper-strong)] p-6 text-left shadow-[0_8px_0_#d6dfda] transition hover:-translate-y-1 hover:border-[var(--teal)]"
            >
              <span className="mb-8 grid h-9 w-9 place-items-center rounded-full bg-[var(--teal-soft)] text-[var(--teal)]">
                <Check className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="display-font block text-2xl">{demo.label}</span>
              <span className="mt-2 block text-sm leading-6 text-[var(--muted)]">{demo.short}</span>
              <span className="mt-5 inline-flex items-center gap-2 font-extrabold text-[var(--teal)]">{copy.open} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
