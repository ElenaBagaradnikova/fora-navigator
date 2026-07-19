"use client";

import { useEffect, useState } from "react";
import { HardDrive, TimerReset } from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import { localize } from "@/lib/i18n";
import { getStorageMode, setStorageMode, type StorageMode } from "@/lib/storage";

export function StorageChoice() {
  const { locale } = useLocale();
  const [mode, setMode] = useState<StorageMode>("persistent");
  const copy = localize(locale, {
    ru: { title: "Как сохранить прогресс?", persistent: "На этом устройстве", persistentHelp: "Можно вернуться позже. Данные удаляются после 90 дней без использования.", session: "Только до закрытия вкладки", sessionHelp: "После окончания сессии браузер удалит ответы и план." },
    uk: { title: "Як зберегти прогрес?", persistent: "На цьому пристрої", persistentHelp: "Можна повернутися пізніше. Дані видаляються після 90 днів без використання.", session: "Лише до закриття вкладки", sessionHelp: "Після завершення сесії браузер видалить відповіді та план." },
    en: { title: "How should progress be saved?", persistent: "On this device", persistentHelp: "Return later. Data is deleted after 90 days of inactivity.", session: "Until this tab is closed", sessionHelp: "The browser removes answers and the plan when the session ends." },
  });

  useEffect(() => {
    queueMicrotask(() => setMode(getStorageMode()));
  }, []);

  function choose(next: StorageMode) {
    setStorageMode(next);
    setMode(next);
  }

  return (
    <fieldset className="mt-4">
      <legend className="text-sm font-extrabold">{copy.title}</legend>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {([
          ["persistent", HardDrive, copy.persistent, copy.persistentHelp],
          ["session", TimerReset, copy.session, copy.sessionHelp],
        ] as const).map(([value, Icon, label, help]) => (
          <button
            key={value}
            type="button"
            aria-pressed={mode === value}
            onClick={() => choose(value)}
            className={`flex min-h-20 gap-3 border p-3 text-left ${mode === value ? "border-[var(--teal)] bg-[var(--teal-soft)]" : "border-[var(--line)] bg-white"}`}
          >
            <Icon className="mt-1 h-5 w-5 shrink-0 text-[var(--teal)]" />
            <span><strong className="block text-sm">{label}</strong><span className="mt-1 block text-xs leading-5 text-[var(--muted)]">{help}</span></span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
