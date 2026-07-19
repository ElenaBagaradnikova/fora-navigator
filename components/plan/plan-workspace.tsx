"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CalendarDays, CheckCircle2, ClipboardCheck, FileText, ListChecks, MessageCircle, Printer, RefreshCw, ShieldCheck } from "lucide-react";
import { ConsultationPanel } from "@/components/consultation/consultation-panel";
import { ActionCard } from "@/components/plan/action-card";
import { DocumentChecklist } from "@/components/plan/document-checklist";
import { DraftPanel } from "@/components/plan/draft-panel";
import { EvidencePanel } from "@/components/plan/evidence-panel";
import { CaseMap } from "@/components/plan/case-map";
import type { FinalNavigationPlan } from "@/lib/schemas";
import { clearLocalCase, loadPlan } from "@/lib/storage";
import { loadCase, savePlan } from "@/lib/storage";
import { createFallbackPlan } from "@/lib/demo/fallback-plan";
import { useLocale } from "@/components/locale-provider";
import { dateLocales, localize } from "@/lib/i18n";

type Tab = "route" | "documents" | "drafts" | "evidence" | "consultation";
const COMPLETED_KEY = "fora-navigator:completed-actions:v1";

export function PlanWorkspace() {
  const router = useRouter();
  const { locale } = useLocale();
  const copy = localize(locale, {
    ru: { loading: "Открываем ваш маршрут…", deleteConfirm: "Удалить сохранённые ответы и план из этого браузера?", tabs: ["Маршрут", "Документы", "Письма", "Надёжность"], timeframes: [["Сейчас", "Начните с этих действий"], ["В ближайшие 7 дней", "После первых подтверждений"], ["В течение месяца", "Подготовка и систематизация"], ["Позже", "Когда базовый маршрут уже работает"]], ready: "План готов", live: "GPT-5.6 Terra · live", demo: "Безопасный демо-режим", title: "Ваш навигационный план", created: "Создан", print: "Печать / PDF", edit: "Изменить ответы", urgentStrong: "Сначала проверьте срочность.", nav: "Разделы плана", eyebrow: "Не всё сразу", focuses: "Три ближайших фокуса", focusHelp: "После каждого шага возвращайтесь к плану и отмечайте прогресс.", complete: (done: number, total: number) => `Выполнено ${done} из ${total}`, limits: "Важные ограничения", delete: "Удалить данные и начать заново", sources: "Источники", verified: "проверено" },
    uk: { loading: "Відкриваємо ваш маршрут…", deleteConfirm: "Видалити збережені відповіді та план із цього браузера?", tabs: ["Маршрут", "Документи", "Листи", "Надійність"], timeframes: [["Зараз", "Почніть із цих дій"], ["У найближчі 7 днів", "Після перших підтверджень"], ["Протягом місяця", "Підготовка й систематизація"], ["Пізніше", "Коли базовий маршрут уже працює"]], ready: "План готовий", live: "GPT-5.6 Terra · live", demo: "Безпечний демо-режим", title: "Ваш навігаційний план", created: "Створено", print: "Друк / PDF", edit: "Змінити відповіді", urgentStrong: "Спочатку перевірте терміновість.", nav: "Розділи плану", eyebrow: "Не все одразу", focuses: "Три найближчі фокуси", focusHelp: "Після кожного кроку повертайтеся до плану й відмічайте прогрес.", complete: (done: number, total: number) => `Виконано ${done} із ${total}`, limits: "Важливі обмеження", delete: "Видалити дані й почати знову", sources: "Джерела", verified: "перевірено" },
    en: { loading: "Opening your pathway…", deleteConfirm: "Delete the saved answers and pathway from this browser?", tabs: ["Pathway", "Documents", "Letters", "Trust"], timeframes: [["Now", "Start with these actions"], ["Within seven days", "After the first confirmations"], ["Within one month", "Preparation and organisation"], ["Later", "Once the basic pathway is working"]], ready: "Plan ready", live: "GPT-5.6 Terra · live", demo: "Safe Demo Mode", title: "Your navigation plan", created: "Created", print: "Print / PDF", edit: "Edit answers", urgentStrong: "Check urgency first.", nav: "Plan sections", eyebrow: "Not everything at once", focuses: "Three immediate priorities", focusHelp: "Return to the plan after every step and record progress.", complete: (done: number, total: number) => `${done} of ${total} complete`, limits: "Important limitations", delete: "Delete data and start again", sources: "Sources", verified: "verified" },
  });
  const consultationLabel = localize(locale, {
    ru: "Консультация",
    uk: "Консультація",
    en: "Consultation",
  });
  const tabs: Array<{ id: Tab; label: string; icon: typeof ListChecks }> = [
    { id: "route", label: copy.tabs[0], icon: ListChecks },
    { id: "documents", label: copy.tabs[1], icon: ClipboardCheck },
    { id: "drafts", label: copy.tabs[2], icon: FileText },
    { id: "evidence", label: copy.tabs[3], icon: ShieldCheck },
    { id: "consultation", label: consultationLabel, icon: MessageCircle },
  ];
  const timeframeIds: FinalNavigationPlan["actions"][number]["timeframe"][] = ["now", "seven_days", "month", "later"];
  const timeframes = timeframeIds.map((id, index) => ({ id, label: copy.timeframes[index][0], note: copy.timeframes[index][1] }));
  const [plan, setPlan] = useState<FinalNavigationPlan | null>(null);
  const [tab, setTab] = useState<Tab>("route");
  const [completed, setCompleted] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      let stored = loadPlan();
      if (!stored) {
        router.replace("/review");
        return;
      }
      if (stored.locale !== locale) {
        const storedCase = loadCase();
        if (storedCase) {
          stored = createFallbackPlan({ ...storedCase, locale }, undefined, locale);
          savePlan(stored);
        }
      }
      setPlan(stored);
      try {
        const done = JSON.parse(window.localStorage.getItem(COMPLETED_KEY) || "[]") as unknown;
        if (Array.isArray(done)) setCompleted(done.filter((item): item is string => typeof item === "string"));
      } catch {
        // Ignore corrupt local completion state.
      }
    });
    return () => {
      active = false;
    };
  }, [locale, router]);

  const documents = useMemo(() => Object.fromEntries(plan?.documents.map((document) => [document.id, document.name]) || []), [plan]);
  const actionNames = useMemo(() => Object.fromEntries(plan?.actions.map((action) => [action.id, action.title]) || []), [plan]);

  if (!plan) return <div className="py-24 text-center text-[var(--muted)]">{copy.loading}</div>;

  function toggleAction(id: string) {
    setCompleted((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      window.localStorage.setItem(COMPLETED_KEY, JSON.stringify(next));
      return next;
    });
  }

  function startOver() {
    if (!window.confirm(copy.deleteConfirm)) return;
    clearLocalCase();
    window.localStorage.removeItem(COMPLETED_KEY);
    window.localStorage.removeItem("fora-navigator:checked-documents:v1");
    router.push("/");
  }

  const generatedDate = new Intl.DateTimeFormat(dateLocales[locale], { dateStyle: "long", timeStyle: "short" }).format(new Date(plan.generatedAt));
  const completedCount = plan.actions.filter((action) => completed.includes(action.id)).length;

  return (
    <>
      <div className="border-b border-[var(--line)] bg-[var(--paper-strong)]">
        <div className="page-shell py-8 sm:py-10">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2"><span className="badge"><CheckCircle2 className="h-4 w-4" /> {copy.ready}</span><span className={`badge ${plan.mode === "live" ? "bg-[#e0efe0] text-[#345e3a]" : "bg-[#fff0c2] text-[#735600]"}`}>{plan.mode === "live" ? copy.live : copy.demo}</span></div>
              <h1 className="display-font mt-4 text-4xl leading-tight sm:text-5xl">{copy.title}</h1>
              <p className="mt-4 leading-7 text-[var(--muted)]">{plan.caseSummary}</p>
              <p className="mt-3 flex items-center gap-2 text-xs font-bold text-[var(--muted)]"><CalendarDays className="h-4 w-4" /> {copy.created} {generatedDate}</p>
            </div>
            <div className="no-print flex flex-col gap-3 sm:flex-row lg:flex-col">
              <button className="button-secondary" onClick={() => window.print()}><Printer className="h-5 w-5" /> {copy.print}</button>
              <Link className="button-quiet" href="/review"><RefreshCw className="h-5 w-5" /> {copy.edit}</Link>
            </div>
          </div>
          {plan.urgency.level === "urgent" && <div className="danger-notice mt-7 flex gap-3"><AlertTriangle className="h-5 w-5 shrink-0" /><p><strong>{copy.urgentStrong}</strong> {plan.urgency.message}</p></div>}
        </div>
      </div>

      <nav className="no-print sticky top-0 z-20 border-b border-[var(--line)] bg-[var(--paper)]" aria-label={copy.nav}>
        <div className="page-shell flex overflow-x-auto">
          {tabs.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return <button key={item.id} type="button" onClick={() => setTab(item.id)} aria-current={active ? "page" : undefined} className={`flex min-h-16 min-w-28 flex-1 items-center justify-center gap-2 border-b-4 px-3 font-extrabold ${active ? "border-b-[var(--coral)] bg-white text-[var(--ink)]" : "border-b-transparent text-[var(--muted)] hover:bg-white"}`}><Icon className="h-5 w-5" /> {item.label}</button>;
          })}
        </div>
      </nav>

      <main className="page-shell py-9 sm:py-12">
        {tab === "route" && (
          <div>
            <section className="grid gap-6 border-b border-[var(--line)] pb-9 lg:grid-cols-[1fr_1.2fr] lg:items-start">
              <div><p className="eyebrow">{copy.eyebrow}</p><h2 className="display-font mt-2 text-3xl">{copy.focuses}</h2><p className="mt-3 text-[var(--muted)]">{copy.focusHelp}</p></div>
              <ol className="divide-y divide-[var(--line)] border-y border-[var(--line)] bg-white">
                {plan.immediateFocus.map((focus, index) => <li key={focus} className="flex gap-4 p-4"><span className="display-font text-3xl text-[var(--coral)]">{index + 1}</span><span className="pt-1 font-extrabold">{focus}</span></li>)}
              </ol>
            </section>

            <CaseMap actions={plan.actions} completedIds={completed} />

            <div className="mt-7 flex items-center justify-between gap-4"><p className="text-sm font-bold text-[var(--muted)]">{copy.complete(completedCount, plan.actions.length)}</p><div className="h-2 w-40 overflow-hidden rounded-full bg-[#dbe3df]"><div className="h-full bg-[#579360]" style={{ width: `${(completedCount / plan.actions.length) * 100}%` }} /></div></div>

            <div className="mt-8 space-y-10">
              {timeframes.map((timeframe) => {
                const actions = plan.actions.filter((action) => action.timeframe === timeframe.id);
                if (actions.length === 0) return null;
                return (
                  <section key={timeframe.id}>
                    <div className="mb-4 flex items-end justify-between gap-4"><div><h2 className="display-font text-3xl">{timeframe.label}</h2><p className="mt-1 text-sm text-[var(--muted)]">{timeframe.note}</p></div><span className="badge">{actions.length}</span></div>
                    <div className="space-y-4">{actions.map((action) => <ActionCard key={action.id} action={action} done={completed.includes(action.id)} onToggle={() => toggleAction(action.id)} documentNames={documents} actionNames={actionNames} completedIds={completed} />)}</div>
                  </section>
                );
              })}
            </div>
            <section className="mt-10 border border-[var(--line)] bg-white p-5 sm:p-7"><h2 className="font-extrabold">{copy.limits}</h2><ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[var(--muted)]">{plan.safetyNotes.map((note) => <li key={note}>{note}</li>)}</ul></section>
          </div>
        )}
        {tab === "documents" && <DocumentChecklist documents={plan.documents} />}
        {tab === "drafts" && <DraftPanel drafts={plan.drafts} />}
        {tab === "evidence" && <EvidencePanel plan={plan} />}
        {tab === "consultation" && <ConsultationPanel key={locale} />}

        <div className="no-print mt-14 border-t border-[var(--line)] pt-7 text-center"><button type="button" onClick={startOver} className="button-quiet mx-auto text-[var(--danger)]">{copy.delete}</button></div>
      </main>

      <div className="print-only p-6"><h2>{copy.sources}</h2><ol>{plan.sources.map((source) => <li key={source.id}>{source.title}: {source.url} ({copy.verified} {source.lastVerifiedDate})</li>)}</ol></div>
    </>
  );
}
