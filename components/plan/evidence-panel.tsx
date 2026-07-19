import { ExternalLink, ShieldCheck, TriangleAlert } from "lucide-react";
import type { FinalNavigationPlan } from "@/lib/schemas";
import { useLocale } from "@/components/locale-provider";
import { dateLocales, localize } from "@/lib/i18n";

export function EvidencePanel({ plan }: { plan: FinalNavigationPlan }) {
  const { locale } = useLocale();
  const copy = localize(locale, {
    ru: { eyebrow: "Проверка надёжности", title: "Что подтверждено, а что нужно уточнить", intro: "Источник подтверждает только указанный административный тезис — не весь результат процедуры.", official: "официальных источников", high: "шагов с высокой опорой", human: "шагов перепроверить", sourceType: "официальный источник", verified: "проверено", next: "следующая проверка", due: "проверка просрочена", open: "Проверить в официальном источнике", warning: "Дата проверки показывает, когда команда сверяла страницу, а не гарантирует неизменность процедуры. Перед подачей откройте источник и проверьте актуальную версию." },
    uk: { eyebrow: "Перевірка надійності", title: "Що підтверджено, а що треба уточнити", intro: "Джерело підтверджує лише вказане адміністративне твердження — не весь результат процедури.", official: "офіційних джерел", high: "кроків із високою опорою", human: "кроків перевірити", sourceType: "офіційне джерело", verified: "перевірено", next: "наступна перевірка", due: "перевірку прострочено", open: "Перевірити в офіційному джерелі", warning: "Дата перевірки показує, коли команда звіряла сторінку, але не гарантує незмінність процедури. Перед поданням відкрийте джерело й перевірте актуальну версію." },
    en: { eyebrow: "Trust check", title: "What is supported and what needs confirmation", intro: "A source supports only the stated administrative claim, not the outcome of the whole procedure.", official: "official sources", high: "well-supported steps", human: "steps to recheck", sourceType: "official source", verified: "verified", next: "next review", due: "review overdue", open: "Check the official source", warning: "The verification date shows when the team checked the page; it does not guarantee the procedure has stayed unchanged. Open the source and check the current version before filing." },
  });
  const humanChecks = plan.actions.filter((action) => action.verification.needsHumanVerification).length;
  const highConfidence = plan.actions.filter((action) => action.verification.confidence === "high").length;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <section>
      <div><p className="eyebrow">{copy.eyebrow}</p><h2 className="display-font mt-2 text-3xl">{copy.title}</h2><p className="mt-3 max-w-2xl text-[var(--muted)]">{copy.intro}</p></div>
      <div className="mt-7 grid gap-3 sm:grid-cols-3">
        <div className="border-t-4 border-[var(--teal)] bg-white p-5"><strong className="display-font text-4xl">{plan.sources.length}</strong><span className="mt-1 block text-sm text-[var(--muted)]">{copy.official}</span></div>
        <div className="border-t-4 border-[#579360] bg-white p-5"><strong className="display-font text-4xl">{highConfidence}</strong><span className="mt-1 block text-sm text-[var(--muted)]">{copy.high}</span></div>
        <div className="border-t-4 border-[var(--yellow)] bg-white p-5"><strong className="display-font text-4xl">{humanChecks}</strong><span className="mt-1 block text-sm text-[var(--muted)]">{copy.human}</span></div>
      </div>
      <div className="mt-7 divide-y divide-[var(--line)] border-y border-[var(--line)] bg-white">
        {plan.sources.map((source) => {
          const due = source.nextReviewDate < today;
          const formatter = new Intl.DateTimeFormat(dateLocales[locale]);
          return (
            <article key={source.id} className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="flex gap-3"><ShieldCheck className={`mt-1 h-5 w-5 shrink-0 ${due ? "text-[#9a6700]" : "text-[#4b8153]"}`} /><div><h3 className="font-extrabold">{source.title}</h3><p className="mt-1 text-sm text-[var(--muted)]">{source.jurisdiction} · {copy.sourceType} · {copy.verified} {formatter.format(new Date(`${source.lastVerifiedDate}T12:00:00Z`))}</p><p className={`mt-1 text-xs font-bold ${due ? "text-[#8b5c00]" : "text-[var(--muted)]"}`}>{due ? copy.due : copy.next}: {formatter.format(new Date(`${source.nextReviewDate}T12:00:00Z`))}</p></div></div>
              <a href={source.url} target="_blank" rel="noreferrer" className="button-secondary min-h-10 px-3 py-2 text-sm">{copy.open} <ExternalLink className="h-4 w-4" /></a>
            </article>
          );
        })}
      </div>
      <div className="notice mt-7 flex gap-3 text-sm leading-6"><TriangleAlert className="mt-1 h-5 w-5 shrink-0 text-[#8b5c00]" /><p>{copy.warning}</p></div>
    </section>
  );
}
