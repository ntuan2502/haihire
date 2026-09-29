"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import {
  type SupportedLocale,
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  LOCALE_COOKIE_KEY,
} from "./config";
import type { TranslationSchema } from "./types";
import { en } from "./locales/en";
import { vi } from "./locales/vi";
import { BRAND_CONFIG } from "@haihire/shared";

const TRANSLATIONS: Record<SupportedLocale, TranslationSchema> = {
  en,
  vi,
};

type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`;
}[keyof ObjectType & (string | number)];

export type TranslationKey = NestedKeyOf<TranslationSchema> | (string & {});

interface I18nContextType {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  isReady: boolean;
}

const I18nContext = createContext<I18nContextType | null>(null);

/**
 * Helper to detect browser preferred language:
 * Checks navigator.language / navigator.languages and matches against supported locales.
 */
function detectBrowserLocale(): SupportedLocale {
  if (typeof window === "undefined" || !navigator) {
    return DEFAULT_LOCALE;
  }

  const browserLangs = navigator.languages || [navigator.language];
  for (const lang of browserLangs) {
    if (!lang) continue;
    const lower = lang.toLowerCase();
    if (lower.startsWith("vi")) {
      return "vi";
    }
    if (lower.startsWith("en")) {
      return "en";
    }
  }

  return DEFAULT_LOCALE;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>(DEFAULT_LOCALE);
  const [isReady, setIsReady] = useState(false);

  // Initialize locale from LocalStorage, Cookie, or Browser Detect
  useEffect(() => {
    try {
      // 1. Try LocalStorage
      const savedLocale = localStorage.getItem(LOCALE_STORAGE_KEY) as SupportedLocale | null;
      if (savedLocale && savedLocale in SUPPORTED_LOCALES) {
        setLocaleState(savedLocale);
        setIsReady(true);
        return;
      }

      // 2. Try Cookie
      const cookieMatch = document.cookie.match(
        new RegExp(`(?:^|; )${LOCALE_COOKIE_KEY}=([^;]*)`)
      );
      const cookieLocale = cookieMatch ? (decodeURIComponent(cookieMatch[1]) as SupportedLocale) : null;
      if (cookieLocale && cookieLocale in SUPPORTED_LOCALES) {
        setLocaleState(cookieLocale);
        setIsReady(true);
        return;
      }

      // 3. Fallback to Browser Detection
      const detected = detectBrowserLocale();
      setLocaleState(detected);
    } catch {
      // Fallback
      setLocaleState(DEFAULT_LOCALE);
    } finally {
      setIsReady(true);
    }
  }, []);

  const setLocale = useCallback((newLocale: SupportedLocale) => {
    if (!(newLocale in SUPPORTED_LOCALES)) return;
    setLocaleState(newLocale);

    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
      // Set cookie for Next.js SSR / Proxy
      document.cookie = `${LOCALE_COOKIE_KEY}=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
      document.documentElement.lang = newLocale;
    } catch (e) {
      console.error("Failed to persist locale:", e);
    }
  }, []);

  // Set html lang attribute whenever locale changes
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>): string => {
      const currentDict = TRANSLATIONS[locale] || TRANSLATIONS[DEFAULT_LOCALE];
      const keys = (key as string).split(".");

      // Traverse dictionary
      let val: unknown = currentDict;
      for (const k of keys) {
        if (val && typeof val === "object" && k in (val as Record<string, unknown>)) {
          val = (val as Record<string, unknown>)[k];
        } else {
          // Fallback to English
          let fallbackVal: unknown = TRANSLATIONS[DEFAULT_LOCALE];
          for (const fk of keys) {
            if (fallbackVal && typeof fallbackVal === "object" && fk in (fallbackVal as Record<string, unknown>)) {
              fallbackVal = (fallbackVal as Record<string, unknown>)[fk];
            } else {
              fallbackVal = key;
              break;
            }
          }
          val = fallbackVal;
          break;
        }
      }

      if (typeof val !== "string") {
        return key;
      }

      // Inject default brand context + custom parameters
      const resolvedId = params?.id || params?.applicationId || params?.candidateId || params?.jobId || params?.interviewId;
      const mergedParams: Record<string, string | number> = {
        brand: BRAND_CONFIG.name,
        brandLegal: BRAND_CONFIG.legalName,
        brandMonogram: BRAND_CONFIG.monogram,
        domain: BRAND_CONFIG.domain,
        ...(resolvedId !== undefined ? { id: resolvedId } : {}),
        ...params,
      };

      let text = val;
      Object.entries(mergedParams).forEach(([paramKey, paramVal]) => {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(paramVal));
      });

      // Gracefully clean up any unsupplied placeholders so literal `{param}` never leaks to users
      text = text.replace(/\s*\(\{[a-zA-Z0-9_]+\}\)/g, "");
      text = text.replace(/['"]\{[a-zA-Z0-9_]+\}['"]\s*/g, "");
      text = text.replace(/\{[a-zA-Z0-9_]+\}/g, "");
      text = text.replace(/\s{2,}/g, " ").trim();
      return text;
    },
    [locale]
  );

  const contextValue = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      isReady,
    }),
    [locale, setLocale, t, isReady]
  );

  return (
    <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}

export const useTranslation = useI18n;
export { SUPPORTED_LOCALES, type SupportedLocale };
