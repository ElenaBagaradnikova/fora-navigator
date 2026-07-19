"use client";

import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { useLocale } from "@/components/locale-provider";
import { appLocales, localeLabels, localize } from "@/lib/i18n";

export function SiteHeader({ minimal = false }: { minimal?: boolean }) {
  const { locale, setLocale } = useLocale();
  const copy = localize(locale, {
    ru: { home: "На главную FORA Navigator", privacy: "Demo Mode · данные остаются в браузере", language: "Язык приложения" },
    uk: { home: "На головну FORA Navigator", privacy: "Demo Mode · дані залишаються у браузері", language: "Мова застосунку" },
    en: { home: "FORA Navigator home", privacy: "Demo Mode · data stays in your browser", language: "Application language" },
  });

  return (
    <header className="no-print border-b border-[var(--line)] bg-[var(--paper)]">
      <div className="page-shell flex min-h-18 items-center justify-between gap-4 py-3">
        <Link href="/" className="rounded-xl no-underline" aria-label={copy.home}>
          <BrandMark />
        </Link>
        <div className="flex items-center gap-3">
          {!minimal && (
            <div className="hidden items-center gap-2 text-sm font-semibold text-[var(--muted)] lg:flex">
              <LockKeyhole className="h-4 w-4" aria-hidden="true" />
              {copy.privacy}
            </div>
          )}
          <div className="flex rounded-xl border border-[var(--line)] bg-white p-1" role="group" aria-label={copy.language}>
            {appLocales.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setLocale(item)}
                aria-pressed={locale === item}
                className={`min-h-9 rounded-lg px-2.5 text-xs font-extrabold transition ${locale === item ? "bg-[var(--teal)] text-white" : "text-[var(--teal)] hover:bg-[var(--teal-soft)]"}`}
              >
                {localeLabels[item]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
