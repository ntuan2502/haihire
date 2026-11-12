"use client";

import { useContext } from "react";
import { BRAND_CONFIG } from "@haihire/shared";
import { DEFAULT_LOCALE, type SupportedLocale } from "./config";
import type { TranslationSchema } from "./types";
import { en } from "./locales/en";
import { vi } from "./locales/vi";
import {
  I18nContext,
  type I18nContextType,
  type TranslationKey,
} from "./context";

const TRANSLATIONS: Record<SupportedLocale, TranslationSchema> = {
  en,
  vi,
};

/**
 * Resolves a dot-delimited translation key from the locale dictionary with
 * English fallback and safe parameter interpolation.
 */
export function translateFromDictionary(
  locale: SupportedLocale,
  key: TranslationKey,
  params?: Record<string, string | number>,
): string {
  const currentDict = TRANSLATIONS[locale] || TRANSLATIONS[DEFAULT_LOCALE];
  const keys = (key as string).split(".");

  let val: unknown = currentDict;
  for (const k of keys) {
    if (
      val &&
      typeof val === "object" &&
      k in (val as Record<string, unknown>)
    ) {
      val = (val as Record<string, unknown>)[k];
    } else {
      let fallbackVal: unknown = TRANSLATIONS[DEFAULT_LOCALE];
      for (const fk of keys) {
        if (
          fallbackVal &&
          typeof fallbackVal === "object" &&
          fk in (fallbackVal as Record<string, unknown>)
        ) {
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

  const resolvedId =
    params?.id ||
    params?.applicationId ||
    params?.candidateId ||
    params?.jobId ||
    params?.interviewId;
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
}

const DEFAULT_FALLBACK_I18N: I18nContextType = {
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: (key, params) => translateFromDictionary(DEFAULT_LOCALE, key, params),
  isReady: true,
};

/**
 * Optional version of useI18n for shared UI primitives and error boundaries
 * that may render outside an explicit I18nProvider or under @/i18n mocks.
 */
export function useOptionalI18n(): I18nContextType {
  return useContext(I18nContext) ?? DEFAULT_FALLBACK_I18N;
}
