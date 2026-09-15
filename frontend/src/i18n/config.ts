export type SupportedLocale = "vi" | "en";

export interface LocaleInfo {
  code: SupportedLocale;
  label: string;
  shortLabel: string;
  flag: string;
}

export const SUPPORTED_LOCALES: Record<SupportedLocale, LocaleInfo> = {
  vi: {
    code: "vi",
    label: "Tiếng Việt",
    shortLabel: "VI",
    flag: "🇻🇳",
  },
  en: {
    code: "en",
    label: "English",
    shortLabel: "EN",
    flag: "🇺🇸",
  },
};

export const DEFAULT_LOCALE: SupportedLocale = "en";
export const LOCALE_COOKIE_KEY = "NEXT_LOCALE";
export const LOCALE_STORAGE_KEY = "ats_locale";
