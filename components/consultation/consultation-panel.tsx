"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  HeartHandshake,
  Send,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import { createConsultationConsent } from "@/lib/consultation/consent";
import { localize } from "@/lib/i18n";
import { redactSensitiveText } from "@/lib/safety/redact";
import {
  ConsultationPreviewSchema,
  ConsultationReceiptSchema,
  type ConsultationPreview,
  type ConsultationReceipt,
} from "@/lib/schemas";

type DeliveryMode = "demo" | "email";

const categories = [
  "healthcare",
  "disability_recognition",
  "education",
  "social_support",
  "residence_protection",
  "documents",
  "other",
] as const;

export function ConsultationPanel() {
  const { locale } = useLocale();
  const copy = localize(locale, {
    ru: {
      eyebrow: "Человек рядом",
      title: "Посоветоваться с живым человеком",
      intro: "Выберите равного консультанта с личным опытом или профильного специалиста. FORA сначала проверит, кому лучше передать запрос.",
      peer: "Равный консультант",
      peerHelp: "Человек с релевантным жизненным опытом поможет сориентироваться и подготовиться. Это не замена профессиональной консультации.",
      specialist: "Специалист",
      specialistHelp: "FORA проверит доступность и соответствие специалиста вашему вопросу. Подходящий специалист и ответ не гарантированы.",
      routeLegend: "К кому обратиться",
      category: "Тема обращения",
      categoryNames: ["Здравоохранение", "Признание инвалидности", "Образование", "Социальная поддержка", "Проживание и защита", "Документы", "Другое"],
      language: "Желаемый язык ответа",
      channel: "Как с вами связаться",
      email: "Email",
      phone: "Телефон",
      contact: "Контакт для ответа",
      demoContact: "Например, demo.user@example.test — только вымышленные данные",
      realContact: "Email или телефон, по которому FORA сможет ответить",
      summary: "Краткое резюме для консультанта (необязательно)",
      summaryHelp: "До 500 знаков. Не указывайте здесь телефон, email или номер документа — для контакта есть отдельное поле.",
      preview: "Будет передано только это",
      location: "Астурия, Испания",
      regionLabel: "Регион",
      noCase: "Полный кейс, чат, план, файлы, источники и аналитический идентификатор не передаются.",
      demoTitle: "Безопасная демонстрация",
      demoText: "Письмо не отправляется. Используйте только вымышленные контактные данные — так жюри сможет проверить весь сценарий без передачи персональных данных.",
      emailTitle: "Реальная отправка включена",
      emailText: "После подтверждения ровно этот предпросмотр будет отправлен в закрытый ящик FORA.",
      controller: "Оператор данных: Elena Bagaradnikova, Ayones 31, Latores, C.P. 33193 Oviedo, Spain. Получатель: FORA. Запрос хранится до закрытия, затем удаляется через 90 дней после последнего содержательного контакта; спам и недоставленные обращения — через 30 дней.",
      privacyTitle: "Конфиденциальность и хранение",
      consent: "Мне исполнилось 18 лет, я вправе передать эти контакт и резюме и разрешаю отправить FORA ровно показанный предпросмотр.",
      demoConsent: "Я подтверждаю, что использую только вымышленные данные, и разрешаю выполнить демонстрационную проверку.",
      submit: "Отправить запрос",
      demoSubmit: "Проверить демо-запрос",
      required: "Заполните корректный контакт и подтвердите согласие.",
      pii: "Уберите из резюме контактные данные или номер документа.",
      failed: "Не удалось обработать запрос. Попробуйте позже.",
      limited: "Слишком много попыток. Попробуйте примерно через 15 минут.",
      success: "Запрос отправлен в FORA",
      demoSuccess: "Тест завершён. Ничего не отправлено",
      receipt: "Номер обращения",
      aftermath: "FORA не гарантирует срок ответа. Если ситуация экстренная, не ждите ответа: звоните 112.",
      chars: (count: number) => `${count} из 500`,
    },
    uk: {
      eyebrow: "Людина поруч",
      title: "Порадитися з живою людиною",
      intro: "Оберіть рівного консультанта з особистим досвідом або профільного фахівця. FORA спочатку перевірить, кому краще передати запит.",
      peer: "Рівний консультант",
      peerHelp: "Людина з релевантним життєвим досвідом допоможе зорієнтуватися й підготуватися. Це не заміна професійної консультації.",
      specialist: "Фахівець",
      specialistHelp: "FORA перевірить доступність і відповідність фахівця вашому питанню. Відповідний фахівець і відповідь не гарантовані.",
      routeLegend: "До кого звернутися",
      category: "Тема звернення",
      categoryNames: ["Охорона здоров’я", "Визнання інвалідності", "Освіта", "Соціальна підтримка", "Проживання та захист", "Документи", "Інше"],
      language: "Бажана мова відповіді",
      channel: "Як із вами зв’язатися",
      email: "Email",
      phone: "Телефон",
      contact: "Контакт для відповіді",
      demoContact: "Наприклад, demo.user@example.test — лише вигадані дані",
      realContact: "Email або телефон, за яким FORA зможе відповісти",
      summary: "Коротке резюме для консультанта (необов’язково)",
      summaryHelp: "До 500 знаків. Не вказуйте тут телефон, email або номер документа — для контакту є окреме поле.",
      preview: "Буде передано лише це",
      location: "Астурія, Іспанія",
      regionLabel: "Регіон",
      noCase: "Повний кейс, чат, план, файли, джерела та аналітичний ідентифікатор не передаються.",
      demoTitle: "Безпечна демонстрація",
      demoText: "Лист не надсилається. Використовуйте лише вигадані контактні дані, щоб журі могло перевірити сценарій без передачі персональних даних.",
      emailTitle: "Реальне надсилання ввімкнено",
      emailText: "Після підтвердження саме цей попередній перегляд буде надіслано до закритої скриньки FORA.",
      controller: "Оператор даних: Elena Bagaradnikova, Ayones 31, Latores, C.P. 33193 Oviedo, Spain. Одержувач: FORA. Запит зберігається до закриття, потім видаляється через 90 днів після останнього змістовного контакту; спам і недоставлені звернення — через 30 днів.",
      privacyTitle: "Конфіденційність і зберігання",
      consent: "Мені виповнилося 18 років, я маю право передати цей контакт і резюме та дозволяю надіслати FORA саме показаний попередній перегляд.",
      demoConsent: "Я підтверджую, що використовую лише вигадані дані, і дозволяю виконати демонстраційну перевірку.",
      submit: "Надіслати запит",
      demoSubmit: "Перевірити демо-запит",
      required: "Заповніть коректний контакт і підтвердьте згоду.",
      pii: "Приберіть із резюме контактні дані або номер документа.",
      failed: "Не вдалося обробити запит. Спробуйте пізніше.",
      limited: "Забагато спроб. Спробуйте приблизно через 15 хвилин.",
      success: "Запит надіслано до FORA",
      demoSuccess: "Тест завершено. Нічого не надіслано",
      receipt: "Номер звернення",
      aftermath: "FORA не гарантує строк відповіді. Якщо ситуація екстрена, не чекайте відповіді: телефонуйте 112.",
      chars: (count: number) => `${count} із 500`,
    },
    en: {
      eyebrow: "A person alongside you",
      title: "Ask a real person for advice",
      intro: "Choose a peer consultant with lived experience or a relevant specialist. FORA will first check who is best placed to receive the request.",
      peer: "Peer consultant",
      peerHelp: "Someone with relevant lived experience can help you navigate and prepare. This does not replace professional advice.",
      specialist: "Specialist",
      specialistHelp: "FORA will check availability and fit for your question. A suitable specialist and a response are not guaranteed.",
      routeLegend: "Who to contact",
      category: "Request topic",
      categoryNames: ["Healthcare", "Disability recognition", "Education", "Social support", "Residence and protection", "Documents", "Other"],
      language: "Preferred reply language",
      channel: "How to contact you",
      email: "Email",
      phone: "Phone",
      contact: "Reply contact",
      demoContact: "For example, demo.user@example.test — fictional details only",
      realContact: "An email or phone number FORA can reply to",
      summary: "Short note for the consultant (optional)",
      summaryHelp: "Up to 500 characters. Do not put a phone, email or document number here; use the separate contact field.",
      preview: "Only this will be shared",
      location: "Asturias, Spain",
      regionLabel: "Region",
      noCase: "The full case, chat, plan, files, sources and analytics identifier are not shared.",
      demoTitle: "Safe demonstration",
      demoText: "No email is sent. Use fictional contact details only, so judges can test the whole flow without transmitting personal data.",
      emailTitle: "Real delivery is enabled",
      emailText: "After confirmation, exactly this preview will be sent to FORA’s protected mailbox.",
      controller: "Data controller: Elena Bagaradnikova, Ayones 31, Latores, C.P. 33193 Oviedo, Spain. Recipient: FORA. A request is retained while open, then deleted 90 days after the last substantive contact; spam and undelivered requests are deleted after 30 days.",
      privacyTitle: "Privacy and retention",
      consent: "I am 18 or older, I am authorised to share this contact and note, and I allow exactly the preview shown to be sent to FORA.",
      demoConsent: "I confirm that I am using fictional details only and allow the demo validation to run.",
      submit: "Send request",
      demoSubmit: "Test demo request",
      required: "Enter a valid contact and confirm consent.",
      pii: "Remove contact details or a document number from the note.",
      failed: "The request could not be processed. Please try again later.",
      limited: "Too many attempts. Please try again in about 15 minutes.",
      success: "Request sent to FORA",
      demoSuccess: "Test complete. Nothing was sent",
      receipt: "Request reference",
      aftermath: "FORA cannot guarantee a response time. In an emergency, do not wait for a reply: call 112.",
      chars: (count: number) => `${count} of 500`,
    },
  });

  const [mode, setMode] = useState<DeliveryMode>("demo");
  const [route, setRoute] = useState<ConsultationPreview["route"]>("peer_consultant");
  const [category, setCategory] = useState<ConsultationPreview["category"]>("social_support");
  const [preferredLanguage, setPreferredLanguage] = useState<ConsultationPreview["preferredLanguage"]>(locale);
  const [contactChannel, setContactChannel] = useState<ConsultationPreview["contactChannel"]>("email");
  const [contact, setContact] = useState("");
  const [summary, setSummary] = useState("");
  const [website, setWebsite] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ConsultationReceipt | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/consultation", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: unknown) => {
        if (active && (data as { mode?: unknown }).mode === "email") setMode("email");
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  const preview: ConsultationPreview = {
    route,
    category,
    country: "ES",
    region: "Asturias",
    preferredLanguage,
    contactChannel,
    contact,
    summary,
  };
  const parsedPreview = ConsultationPreviewSchema.safeParse(preview);
  const summaryHasSensitiveData = useMemo(
    () => Boolean(summary && redactSensitiveText(summary).detected.length),
    [summary],
  );

  function change<T>(setter: (value: T) => void, value: T) {
    setter(value);
    setAccepted(false);
    setResult(null);
    setError("");
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!parsedPreview.success || !accepted) {
      setError(copy.required);
      return;
    }
    if (summaryHasSensitiveData) {
      setError(copy.pii);
      return;
    }

    setSending(true);
    try {
      const response = await fetch("/api/consultation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preview: parsedPreview.data,
          consent: createConsultationConsent(mode === "email" ? "real" : "fictional"),
          website,
        }),
      });
      const data = await response.json() as unknown;
      const parsedReceipt = ConsultationReceiptSchema.safeParse(data);
      if (response.ok && parsedReceipt.success) {
        setResult(parsedReceipt.data);
        setAccepted(false);
      } else {
        const code = (data as { code?: string }).code;
        setError(code === "RATE_LIMITED" ? copy.limited : code === "SUMMARY_CONTAINS_CONTACT_OR_ID" ? copy.pii : copy.failed);
      }
    } catch {
      setError(copy.failed);
    } finally {
      setSending(false);
    }
  }

  const fieldSummary = summary || "—";

  return (
    <section className="no-print" aria-labelledby="consultation-title">
      <div className="max-w-3xl">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h2 id="consultation-title" className="display-font mt-2 text-3xl sm:text-4xl">{copy.title}</h2>
        <p className="mt-3 leading-7 text-[var(--muted)]">{copy.intro}</p>
      </div>

      <form className="mt-8 grid gap-7 lg:grid-cols-[1.05fr_.95fr]" onSubmit={submit} noValidate>
        <div className="space-y-6">
          <fieldset>
            <legend className="mb-3 font-extrabold">{copy.routeLegend}</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" aria-pressed={route === "peer_consultant"} onClick={() => change(setRoute, "peer_consultant")} className={`min-h-44 rounded-xl border-2 p-5 text-left ${route === "peer_consultant" ? "border-[var(--teal)] bg-[var(--teal-soft)]" : "border-[var(--line)] bg-white"}`}>
                <HeartHandshake className="h-7 w-7 text-[var(--teal)]" />
                <span className="mt-3 block font-extrabold">{copy.peer}</span>
                <span className="mt-2 block text-sm leading-6 text-[var(--muted)]">{copy.peerHelp}</span>
              </button>
              <button type="button" aria-pressed={route === "specialist"} onClick={() => change(setRoute, "specialist")} className={`min-h-44 rounded-xl border-2 p-5 text-left ${route === "specialist" ? "border-[var(--teal)] bg-[var(--teal-soft)]" : "border-[var(--line)] bg-white"}`}>
                <Stethoscope className="h-7 w-7 text-[var(--teal)]" />
                <span className="mt-3 block font-extrabold">{copy.specialist}</span>
                <span className="mt-2 block text-sm leading-6 text-[var(--muted)]">{copy.specialistHelp}</span>
              </button>
            </div>
          </fieldset>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="font-bold">{copy.category}
              <select className="field mt-2 font-normal" value={category} onChange={(event) => change(setCategory, event.target.value as ConsultationPreview["category"])}>
                {categories.map((item, index) => <option key={item} value={item}>{copy.categoryNames[index]}</option>)}
              </select>
            </label>
            <label className="font-bold">{copy.language}
              <select className="field mt-2 font-normal" value={preferredLanguage} onChange={(event) => change(setPreferredLanguage, event.target.value as ConsultationPreview["preferredLanguage"])}>
                <option value="ru">Русский</option><option value="uk">Українська</option><option value="en">English</option>
              </select>
            </label>
          </div>

          <fieldset>
            <legend className="mb-2 font-bold">{copy.channel}</legend>
            <div className="flex gap-5">
              <label className="flex items-center gap-2"><input type="radio" name="channel" checked={contactChannel === "email"} onChange={() => change(setContactChannel, "email")} /> {copy.email}</label>
              <label className="flex items-center gap-2"><input type="radio" name="channel" checked={contactChannel === "phone"} onChange={() => change(setContactChannel, "phone")} /> {copy.phone}</label>
            </div>
          </fieldset>

          <label className="block font-bold">{copy.contact}
            <input className="field mt-2 font-normal" type={contactChannel === "email" ? "email" : "tel"} value={contact} onChange={(event) => change(setContact, event.target.value)} placeholder={mode === "demo" ? copy.demoContact : copy.realContact} autoComplete={mode === "demo" ? "off" : contactChannel === "email" ? "email" : "tel"} required />
          </label>

          <label className="block font-bold">{copy.summary}
            <textarea className="field mt-2 min-h-32 resize-y font-normal" value={summary} onChange={(event) => change(setSummary, event.target.value)} maxLength={500} aria-describedby="summary-help" />
            <span id="summary-help" className="mt-1 flex justify-between gap-4 text-xs font-normal text-[var(--muted)]"><span>{copy.summaryHelp}</span><span className="shrink-0">{copy.chars(summary.length)}</span></span>
          </label>
          {summaryHasSensitiveData && <div className="danger-notice flex gap-3" role="alert"><AlertTriangle className="h-5 w-5 shrink-0" />{copy.pii}</div>}

          <label className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">Website
            <input tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
          </label>
        </div>

        <div className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <div className={`p-5 ${mode === "demo" ? "notice" : "border-l-4 border-[var(--teal)] bg-[var(--teal-soft)]"}`}>
            <p className="flex items-center gap-2 font-extrabold"><ShieldCheck className="h-5 w-5" />{mode === "demo" ? copy.demoTitle : copy.emailTitle}</p>
            <p className="mt-2 text-sm leading-6">{mode === "demo" ? copy.demoText : copy.emailText}</p>
          </div>

          <section className="border border-[var(--line)] bg-white p-5" aria-labelledby="preview-title">
            <h3 id="preview-title" className="font-extrabold">{copy.preview}</h3>
            <dl className="mt-4 grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-[minmax(0,1fr)_minmax(9rem,.7fr)] sm:gap-y-3">
              <dt className="text-[var(--muted)]">{copy.title}</dt><dd className="font-bold">{route === "peer_consultant" ? copy.peer : copy.specialist}</dd>
              <dt className="text-[var(--muted)]">{copy.category}</dt><dd className="font-bold">{copy.categoryNames[categories.indexOf(category)]}</dd>
              <dt className="text-[var(--muted)]">{copy.language}</dt><dd className="font-bold">{preferredLanguage.toUpperCase()}</dd>
              <dt className="mt-2 text-[var(--muted)] sm:mt-0">{copy.contact}</dt><dd className="break-words font-bold">{contact || "—"}</dd>
              <dt className="text-[var(--muted)]">{copy.summary}</dt><dd className="whitespace-pre-wrap break-words">{fieldSummary}</dd>
              <dt className="mt-2 text-[var(--muted)] sm:mt-0">{copy.regionLabel}</dt><dd>{copy.location}</dd>
            </dl>
            <p className="mt-5 border-t border-[var(--line)] pt-4 text-xs leading-5 text-[var(--muted)]">{copy.noCase}</p>
          </section>

          <details className="border border-[var(--line)] bg-white p-4 text-sm">
            <summary className="cursor-pointer font-extrabold">{copy.privacyTitle}</summary>
            <p className="mt-3 leading-6 text-[var(--muted)]">{copy.controller}</p>
          </details>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-[var(--line)] bg-white p-4">
            <input className="mt-1 h-5 w-5 shrink-0" type="checkbox" checked={accepted} onChange={(event) => { setAccepted(event.target.checked); setError(""); }} />
            <span className="text-sm font-bold leading-6">{mode === "demo" ? copy.demoConsent : copy.consent}</span>
          </label>

          {error && <div className="danger-notice" role="alert">{error}</div>}
          <button className="button-primary w-full" type="submit" disabled={sending || !accepted || !parsedPreview.success || summaryHasSensitiveData}>
            <Send className="h-5 w-5" />{mode === "demo" ? copy.demoSubmit : copy.submit}
          </button>

          {result && <div className="border-2 border-[#579360] bg-[#e0efe0] p-5" role="status">
            <p className="flex items-center gap-2 font-extrabold"><CheckCircle2 className="h-5 w-5" />{result.status === "demo" ? copy.demoSuccess : copy.success}</p>
            <p className="mt-3 text-sm"><span className="font-bold">{copy.receipt}:</span> {result.receiptId}</p>
            <p className="mt-3 text-sm leading-6">{copy.aftermath}</p>
          </div>}
        </div>
      </form>
    </section>
  );
}
