"use client";

import { useEffect, useState } from "react";
import { CircleHelp, FileCheck2 } from "lucide-react";
import type { RequiredDocument } from "@/lib/schemas";
import { useLocale } from "@/components/locale-provider";
import { localize } from "@/lib/i18n";

const KEY = "fora-navigator:checked-documents:v1";
export function DocumentChecklist({ documents }: { documents: RequiredDocument[] }) {
  const { locale } = useLocale();
  const copy = localize(locale, {
    ru: { statuses: ["Есть", "Нужно получить", "Желательно перевести", "Требуется уточнить", "Апостиль / легализация — проверить"], eyebrow: "Единый список", title: "Документы без лишней работы", intro: "Отметка слева — только ваш локальный прогресс. Статус справа показывает, что делать с документом.", progress: (done: number, total: number) => `Готово ${done} из ${total}`, uncheck: "Снять отметку", check: "Отметить готовым", verify: "Проверить для конкретной процедуры" },
    uk: { statuses: ["Є", "Потрібно отримати", "Бажано перекласти", "Потрібно уточнити", "Апостиль / легалізація — перевірити"], eyebrow: "Єдиний список", title: "Документи без зайвої роботи", intro: "Позначка ліворуч — лише ваш локальний прогрес. Статус праворуч показує, що робити з документом.", progress: (done: number, total: number) => `Готово ${done} із ${total}`, uncheck: "Зняти позначку", check: "Позначити готовим", verify: "Перевірити для конкретної процедури" },
    en: { statuses: ["Available", "Obtain", "Translation recommended", "Needs confirmation", "Check apostille / legalisation"], eyebrow: "One joined-up list", title: "Documents without unnecessary work", intro: "The mark on the left is only your local progress. The status on the right explains what to do with the document.", progress: (done: number, total: number) => `${done} of ${total} ready`, uncheck: "Unmark", check: "Mark ready", verify: "Confirm for the specific procedure" },
  });
  const statusLabels: Record<RequiredDocument["status"], { label: string; className: string }> = {
    available: { label: copy.statuses[0], className: "bg-[#e0efe0] text-[#345e3a]" },
    obtain: { label: copy.statuses[1], className: "bg-[var(--coral-soft)] text-[#7d3327]" },
    translate_recommended: { label: copy.statuses[2], className: "bg-[#dceaf3] text-[#315f78]" },
    verify: { label: copy.statuses[3], className: "bg-[#fff0c2] text-[#735600]" },
    apostille_maybe: { label: copy.statuses[4], className: "bg-[#eee4f3] text-[#62466f]" },
  };
  const [checked, setChecked] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        const saved = JSON.parse(window.localStorage.getItem(KEY) || "[]") as unknown;
        if (Array.isArray(saved)) setChecked(saved.filter((item): item is string => typeof item === "string"));
      } catch {
        // Corrupt local checklist state is intentionally ignored.
      }
    });
    return () => {
      active = false;
    };
  }, []);

  function toggle(id: string) {
    setChecked((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      window.localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }

  return (
    <section>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="eyebrow">{copy.eyebrow}</p><h2 className="display-font mt-2 text-3xl">{copy.title}</h2><p className="mt-3 max-w-2xl text-[var(--muted)]">{copy.intro}</p></div>
        <div className="text-sm font-bold text-[var(--muted)]">{copy.progress(checked.length, documents.length)}</div>
      </div>
      <div className="mt-7 divide-y divide-[var(--line)] border-y border-[var(--line)] bg-white">
        {documents.map((document) => {
          const done = checked.includes(document.id);
          const status = statusLabels[document.status];
          return (
            <div key={document.id} className="grid gap-4 p-5 sm:grid-cols-[auto_1fr_auto] sm:items-start">
              <button type="button" onClick={() => toggle(document.id)} aria-pressed={done} aria-label={`${done ? copy.uncheck : copy.check}: ${document.name}`} className={`grid h-8 w-8 place-items-center rounded-md border-2 ${done ? "border-[#3d7447] bg-[#3d7447] text-white" : "border-[#91a49d]"}`}>{done && <FileCheck2 className="h-5 w-5" />}</button>
              <div><h3 className={`font-extrabold ${done ? "line-through opacity-60" : ""}`}>{document.name}</h3><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{document.note}</p>{document.verification.needsHumanVerification && <p className="mt-2 flex items-center gap-2 text-xs font-bold text-[#7b5a00]"><CircleHelp className="h-4 w-4" /> {copy.verify}</p>}</div>
              <span className={`badge h-fit justify-self-start sm:justify-self-end ${status.className}`}>{status.label}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
