"use client";

import {
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
import {
  I18nContext,
  type I18nContextType,
  type TranslationKey,
} from "./context";
import { translateFromDictionary, useOptionalI18n } from "./optional";

export { I18nContext, translateFromDictionary, useOptionalI18n };
export type { I18nContextType, TranslationKey };

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

export function I18nProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
}: {
  children: ReactNode;
  initialLocale?: SupportedLocale;
}) {
  const [locale, setLocaleState] = useState<SupportedLocale>(initialLocale);
  const [isReady, setIsReady] = useState(false);

  // Initialize locale from LocalStorage, Cookie, or Browser Detect
  useEffect(() => {
    try {
      // 1. Try LocalStorage
      const savedLocale = localStorage.getItem(
        LOCALE_STORAGE_KEY,
      ) as SupportedLocale | null;
      if (savedLocale && savedLocale in SUPPORTED_LOCALES) {
        setLocaleState(savedLocale);
        setIsReady(true);
        return;
      }

      // 2. Try Cookie
      const cookieMatch = document.cookie.match(
        new RegExp(`(?:^|; )${LOCALE_COOKIE_KEY}=([^;]*)`),
      );
      const cookieLocale = cookieMatch
        ? (decodeURIComponent(cookieMatch[1]) as SupportedLocale)
        : null;
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
    (key: TranslationKey, params?: Record<string, string | number>): string =>
      translateFromDictionary(locale, key, params),
    [locale],
  );

  const contextValue = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      isReady,
    }),
    [locale, setLocale, t, isReady],
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
export {
  SUPPORTED_LOCALES,
  type SupportedLocale,
  LOCALE_COOKIE_KEY,
  DEFAULT_LOCALE,
};
