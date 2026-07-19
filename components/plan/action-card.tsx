"use client";

import { ChevronDown, CircleAlert, FileText, GitBranch, Laptop, MapPin, Target, UserRound } from "lucide-react";
import type { ActionStep } from "@/lib/schemas";
import { useLocale } from "@/components/locale-provider";
import { localize } from "@/lib/i18n";

export function ActionCard({ action, done, onToggle, documentNames, actionNames, completedIds }: { action: ActionStep; done: boolean; onToggle: () => void; documentNames: Record<string, string>; actionNames: Record<string, string>; completedIds: string[] }) {
  const { locale } = useLocale();
  const copy = localize(locale, {
    ru: { channels: ["Онлайн", "Лично", "Онлайн или лично", "Уточнить канал"], owners: ["Семья", "FORA", "Орган власти", "Специалист"], confidence: ["высокая", "средняя", "низкая"], priority: "Приоритет", reliability: "Надёжность", restore: "Вернуть шаг", complete: "Отметить шаг", details: "Зачем, куда и что подготовить", why: "Зачем", where: "Куда обратиться", who: "Кто делает", result: "Ожидаемый результат", documents: "Документы", risks: "Что может пойти не так", depends: "Зависит от", ready: "Предыдущие шаги выполнены", blocked: "Сначала завершите связанный шаг" },
    uk: { channels: ["Онлайн", "Особисто", "Онлайн або особисто", "Уточнити канал"], owners: ["Сім'я", "FORA", "Орган влади", "Спеціаліст"], confidence: ["висока", "середня", "низька"], priority: "Пріоритет", reliability: "Надійність", restore: "Повернути крок", complete: "Позначити крок", details: "Навіщо, куди й що підготувати", why: "Навіщо", where: "Куди звернутися", who: "Хто робить", result: "Очікуваний результат", documents: "Документи", risks: "Що може піти не так", depends: "Залежить від", ready: "Попередні кроки виконано", blocked: "Спочатку завершіть пов'язаний крок" },
    en: { channels: ["Online", "In person", "Online or in person", "Confirm channel"], owners: ["Family", "FORA", "Authority", "Specialist"], confidence: ["high", "medium", "low"], priority: "Priority", reliability: "Reliability", restore: "Return step to active", complete: "Mark step complete", details: "Why, where and what to prepare", why: "Why", where: "Where to go", who: "Owner", result: "Expected result", documents: "Documents", risks: "What could go wrong", depends: "Depends on", ready: "Previous steps complete", blocked: "Complete the linked step first" },
  });
  const channelLabels = { online: copy.channels[0], in_person: copy.channels[1], both: copy.channels[2], verify: copy.channels[3] };
  const ownerLabels = { family: copy.owners[0], fora: copy.owners[1], authority: copy.owners[2], specialist: copy.owners[3] };
  const confidenceLabels = { high: copy.confidence[0], medium: copy.confidence[1], low: copy.confidence[2] };
  const unmetDependencies = action.dependsOnActionIds.filter((id) => !completedIds.includes(id));
  return (
    <article className={`border-l-4 bg-white shadow-[0_7px_0_#dce3df] ${done ? "border-l-[#6f9b75] opacity-75" : action.priority === 1 ? "border-l-[var(--coral)]" : "border-l-[var(--teal)]"}`}>
      <div className="flex items-start gap-4 p-5 sm:p-6">
        <button
          type="button"
          onClick={onToggle}
          aria-label={`${done ? copy.restore : copy.complete}: ${action.title}`}
          aria-pressed={done}
          className={`mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 ${done ? "border-[#3d7447] bg-[#3d7447] text-white" : "border-[#91a49d] bg-white"}`}
        >
          {done && <span aria-hidden="true">✓</span>}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="eyebrow">{copy.priority} {action.priority}</span>
            <span className="badge py-1 text-[0.7rem]">{channelLabels[action.channel]}</span>
            <span className={`badge py-1 text-[0.7rem] ${action.verification.confidence === "high" ? "bg-[#e0efe0] text-[#345e3a]" : "bg-[#fff0c2] text-[#735600]"}`}>
              {copy.reliability}: {confidenceLabels[action.verification.confidence]}
            </span>
          </div>
          <h3 className={`display-font mt-2 text-2xl leading-tight ${done ? "line-through" : ""}`}>{action.title}</h3>
          <p className="mt-3 leading-7 text-[var(--muted)]">{action.action}</p>
        </div>
      </div>
      <details className="group border-t border-[var(--line)]">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 font-extrabold text-[var(--teal)] sm:px-6">
          {copy.details} <ChevronDown className="h-5 w-5 transition group-open:rotate-180" />
        </summary>
        <div className="grid gap-5 px-5 pb-6 sm:grid-cols-2 sm:px-6">
          <div className="flex gap-3"><Target className="mt-1 h-5 w-5 shrink-0 text-[var(--coral)]" /><div><h4 className="font-extrabold">{copy.why}</h4><p className="mt-1 text-sm leading-6 text-[var(--muted)]">{action.why}</p></div></div>
          <div className="flex gap-3"><MapPin className="mt-1 h-5 w-5 shrink-0 text-[var(--coral)]" /><div><h4 className="font-extrabold">{copy.where}</h4><p className="mt-1 text-sm leading-6 text-[var(--muted)]">{action.destination}</p></div></div>
          <div className="flex gap-3"><UserRound className="mt-1 h-5 w-5 shrink-0 text-[var(--coral)]" /><div><h4 className="font-extrabold">{copy.who}</h4><p className="mt-1 text-sm leading-6 text-[var(--muted)]">{ownerLabels[action.owner]}</p></div></div>
          <div className="flex gap-3"><Laptop className="mt-1 h-5 w-5 shrink-0 text-[var(--coral)]" /><div><h4 className="font-extrabold">{copy.result}</h4><p className="mt-1 text-sm leading-6 text-[var(--muted)]">{action.expectedResult}</p></div></div>
          {action.dependsOnActionIds.length > 0 && <div className="flex gap-3 sm:col-span-2"><GitBranch className="mt-1 h-5 w-5 shrink-0 text-[var(--teal)]" /><div><h4 className="font-extrabold">{copy.depends}</h4><ul className="mt-1 list-disc pl-5 text-sm leading-6 text-[var(--muted)]">{action.dependsOnActionIds.map((id) => <li key={id}>{actionNames[id] || id} · {unmetDependencies.includes(id) ? copy.blocked : copy.ready}</li>)}</ul></div></div>}
          <div className="flex gap-3 sm:col-span-2"><FileText className="mt-1 h-5 w-5 shrink-0 text-[var(--coral)]" /><div><h4 className="font-extrabold">{copy.documents}</h4><ul className="mt-1 list-disc pl-5 text-sm leading-6 text-[var(--muted)]">{action.documentIds.map((id) => <li key={id}>{documentNames[id] || id}</li>)}</ul></div></div>
          <div className="flex gap-3 sm:col-span-2"><CircleAlert className="mt-1 h-5 w-5 shrink-0 text-[#9a6700]" /><div><h4 className="font-extrabold">{copy.risks}</h4><ul className="mt-1 list-disc pl-5 text-sm leading-6 text-[var(--muted)]">{action.failureModes.map((item) => <li key={item}>{item}</li>)}</ul></div></div>
          {action.verification.caveat && <div className="notice text-sm sm:col-span-2">{action.verification.caveat}</div>}
        </div>
      </details>
    </article>
  );
}
