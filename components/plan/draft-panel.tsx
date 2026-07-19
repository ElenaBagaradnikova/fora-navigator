"use client";

import { useState } from "react";
import { Check, Copy, Languages, SendHorizontal } from "lucide-react";
import type { DraftDocument } from "@/lib/schemas";
import { useLocale } from "@/components/locale-provider";
import { localize } from "@/lib/i18n";

export function DraftPanel({ drafts }: { drafts: DraftDocument[] }) {
  const { locale } = useLocale();
  const copy = localize(locale, {
    ru: { empty: "Черновики не созданы.", eyebrow: "Текст, который можно начать использовать", title: "Черновики обращений", intro: "Проверьте факты, адресата и вложения. Сервис ничего не отправляет автоматически.", nav: "Виды черновиков", recipient: "Адресат", language: "Язык письма", subject: "Тема", before: "Перед отправкой:", warning: "проверьте адресата и факты. Не добавляйте номера документов в обычное письмо, если орган не подтвердил защищённый канал.", copied: "Скопировано", copy: "Скопировать черновик", disabled: "Отправка отключена" },
    uk: { empty: "Чернетки не створено.", eyebrow: "Текст, який можна почати використовувати", title: "Чернетки звернень", intro: "Перевірте факти, адресата й вкладення. Сервіс нічого не надсилає автоматично.", nav: "Види чернеток", recipient: "Адресат", language: "Мова листа", subject: "Тема", before: "Перед надсиланням:", warning: "перевірте адресата й факти. Не додавайте номери документів у звичайний лист, якщо орган не підтвердив захищений канал.", copied: "Скопійовано", copy: "Скопіювати чернетку", disabled: "Надсилання вимкнено" },
    en: { empty: "No drafts were created.", eyebrow: "A starting point you can use", title: "Request drafts", intro: "Check the facts, recipient and attachments. The service never sends anything automatically.", nav: "Draft types", recipient: "Recipient", language: "Letter language", subject: "Subject", before: "Before sending:", warning: "check the recipient and facts. Do not add identity-document numbers to ordinary email unless the authority confirms a secure channel.", copied: "Copied", copy: "Copy draft", disabled: "Sending disabled" },
  });
  const [selectedId, setSelectedId] = useState(drafts[0]?.id || "");
  const [language, setLanguage] = useState<"ru" | "uk" | "en" | "es">("es");
  const [copied, setCopied] = useState(false);
  const selected = drafts.find((draft) => draft.id === selectedId) || drafts[0];

  if (!selected) return <p>{copy.empty}</p>;

  const subject = { ru: selected.subjectRu, uk: selected.subjectUk, en: selected.subjectEn, es: selected.subjectEs }[language];
  const body = { ru: selected.bodyRu, uk: selected.bodyUk, en: selected.bodyEn, es: selected.bodyEs }[language];

  async function copyDraft() {
    await navigator.clipboard.writeText(`${subject}\n\n${body}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <section>
      <div><p className="eyebrow">{copy.eyebrow}</p><h2 className="display-font mt-2 text-3xl">{copy.title}</h2><p className="mt-3 max-w-2xl text-[var(--muted)]">{copy.intro}</p></div>
      <div className="mt-7 grid gap-5 lg:grid-cols-[270px_1fr]">
        <nav className="space-y-2" aria-label={copy.nav}>
          {drafts.map((draft) => (
            <button key={draft.id} type="button" onClick={() => setSelectedId(draft.id)} aria-pressed={selected.id === draft.id} className={`w-full border-l-4 p-4 text-left ${selected.id === draft.id ? "border-l-[var(--coral)] bg-white font-extrabold" : "border-l-[var(--line)] text-[var(--muted)] hover:border-l-[var(--teal)] hover:bg-white"}`}>
              <span className="block text-sm">{draft.title}</span><span className="mt-1 block text-xs font-normal">{draft.recipient}</span>
            </button>
          ))}
        </nav>
        <article className="surface p-5 sm:p-7">
          <div className="flex flex-col justify-between gap-4 border-b border-[var(--line)] pb-5 sm:flex-row sm:items-center">
            <div><span className="text-xs font-extrabold uppercase tracking-[0.1em] text-[var(--muted)]">{copy.recipient}</span><p className="mt-1 font-bold">{selected.recipient}</p></div>
            <div className="flex rounded-xl border border-[var(--line)] bg-white p-1" role="group" aria-label={copy.language}>
              {(["ru", "uk", "en", "es"] as const).map((item) => <button key={item} type="button" onClick={() => setLanguage(item)} aria-pressed={language === item} className={`min-h-10 flex-1 rounded-lg px-3 text-sm font-extrabold sm:flex-none ${language === item ? "bg-[var(--teal)] text-white" : "text-[var(--teal)]"}`}>{item === "uk" ? "УКР" : item.toUpperCase()}</button>)}
            </div>
          </div>
          <div className="mt-5 flex items-start gap-3"><Languages className="mt-1 h-5 w-5 shrink-0 text-[var(--coral)]" /><div><span className="text-xs font-extrabold uppercase tracking-[0.1em] text-[var(--muted)]">{copy.subject}</span><h3 className="mt-1 font-extrabold">{subject}</h3></div></div>
          <div className="mt-5 whitespace-pre-wrap border-l-2 border-[var(--line)] pl-5 leading-7">{body}</div>
          <div className="notice mt-6 text-sm"><strong>{copy.before}</strong> {copy.warning}</div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button className="button-primary" type="button" onClick={() => void copyDraft()}>{copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}{copied ? copy.copied : copy.copy}</button>
            <span className="flex items-center gap-2 px-2 text-sm font-bold text-[var(--muted)]"><SendHorizontal className="h-4 w-4" /> {copy.disabled}</span>
          </div>
        </article>
      </div>
    </section>
  );
}
