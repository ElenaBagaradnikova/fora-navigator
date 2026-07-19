"use client";

import { CheckCircle2, CircleDot, GitBranch, LockKeyhole } from "lucide-react";
import type { ActionStep } from "@/lib/schemas";
import { useLocale } from "@/components/locale-provider";
import { localize } from "@/lib/i18n";

export function CaseMap({ actions, completedIds }: { actions: ActionStep[]; completedIds: string[] }) {
  const { locale } = useLocale();
  const copy = localize(locale, {
    ru: { eyebrow: "Карта дела", title: "Как шаги связаны между собой", intro: "Готово к действию означает, что в плане нет незавершённого предыдущего шага. Это не означает одобрение услуги органом.", done: "Завершено", ready: "Готово к действию", blocked: "Ждёт предыдущего шага", after: "После" },
    uk: { eyebrow: "Карта справи", title: "Як кроки пов'язані між собою", intro: "Готово до дії означає, що у плані немає незавершеного попереднього кроку. Це не означає схвалення послуги органом.", done: "Завершено", ready: "Готово до дії", blocked: "Чекає на попередній крок", after: "Після" },
    en: { eyebrow: "Case map", title: "How the steps connect", intro: "Ready means the plan has no unfinished prerequisite. It does not mean an authority has approved a service.", done: "Complete", ready: "Ready to act", blocked: "Waiting for an earlier step", after: "After" },
  });
  const names = Object.fromEntries(actions.map((action) => [action.id, action.title]));

  return (
    <section className="mt-9 border-y border-[var(--line)] py-8" aria-labelledby="case-map-title">
      <p className="eyebrow">{copy.eyebrow}</p>
      <h2 id="case-map-title" className="display-font mt-2 text-3xl">{copy.title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">{copy.intro}</p>
      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {actions.map((action) => {
          const done = completedIds.includes(action.id);
          const unmet = action.dependsOnActionIds.filter((id) => !completedIds.includes(id));
          const blocked = !done && unmet.length > 0;
          const Icon = done ? CheckCircle2 : blocked ? LockKeyhole : CircleDot;
          const status = done ? copy.done : blocked ? copy.blocked : copy.ready;
          return (
            <article key={action.id} className={`border-l-4 bg-white p-4 ${done ? "border-l-[#579360]" : blocked ? "border-l-[var(--yellow)]" : "border-l-[var(--teal)]"}`}>
              <div className="flex items-start gap-3">
                <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${done ? "text-[#579360]" : blocked ? "text-[#8b5c00]" : "text-[var(--teal)]"}`} />
                <div><h3 className="font-extrabold leading-5">{action.title}</h3><p className="mt-2 text-xs font-bold uppercase tracking-[0.07em] text-[var(--muted)]">{status}</p></div>
              </div>
              {action.dependsOnActionIds.length > 0 && (
                <p className="mt-3 flex items-start gap-2 border-t border-[var(--line)] pt-3 text-xs leading-5 text-[var(--muted)]">
                  <GitBranch className="mt-0.5 h-4 w-4 shrink-0" /> {copy.after}: {action.dependsOnActionIds.map((id) => names[id] || id).join(", ")}
                </p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
