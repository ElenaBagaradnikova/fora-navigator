export const appLocales = ["ru", "uk", "en"] as const;

export type AppLocale = (typeof appLocales)[number];

export const localeLabels: Record<AppLocale, string> = {
  ru: "RU",
  uk: "УКР",
  en: "EN",
};

export const localeNames: Record<AppLocale, string> = {
  ru: "Русский",
  uk: "Українська",
  en: "English",
};

export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === "string" && appLocales.includes(value as AppLocale);
}

export function localize<T>(locale: AppLocale, values: Record<AppLocale, T>): T {
  return values[locale];
}

export const dateLocales: Record<AppLocale, string> = {
  ru: "ru-RU",
  uk: "uk-UA",
  en: "en-GB",
};
