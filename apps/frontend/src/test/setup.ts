import "@testing-library/jest-dom";
import { vi } from "vitest";
import { vi as viLocale } from "@/i18n/locales/vi";
import { BRAND_CONFIG } from "@haihire/shared";

/**
 * Standard test translation helper that resolves against the actual Vietnamese locale dictionary
 * and handles parameter interpolation including brand tokens.
 */
export function createTestTranslate(localeDict: Record<string, unknown> = viLocale as Record<string, unknown>) {
  return (key: string, params?: Record<string, string | number>): string => {
    const keys = key.split(".");
    let val: unknown = localeDict;
    for (const k of keys) {
      if (val && typeof val === "object" && k in (val as Record<string, unknown>)) {
        val = (val as Record<string, unknown>)[k];
      } else {
        val = key;
        break;
      }
    }

    if (typeof val !== "string") {
      return key;
    }

    const resolvedId = params?.id || params?.applicationId || params?.candidateId || params?.jobId || params?.interviewId;
    const merged: Record<string, string | number> = {
      brand: BRAND_CONFIG.name,
      brandLegal: BRAND_CONFIG.legalName,
      brandMonogram: BRAND_CONFIG.monogram,
      domain: BRAND_CONFIG.domain,
      ...(resolvedId !== undefined ? { id: resolvedId } : {}),
      ...params,
    };

    let text = val;
    for (const [pKey, pVal] of Object.entries(merged)) {
      text = text.replace(new RegExp(`\\{${pKey}\\}`, "g"), String(pVal));
    }

    text = text.replace(/\s*\(\{[a-zA-Z0-9_]+\}\)/g, "");
    text = text.replace(/['"]\{[a-zA-Z0-9_]+\}['"]\s*/g, "");
    text = text.replace(/\{[a-zA-Z0-9_]+\}/g, "");
    text = text.replace(/\s{2,}/g, " ").trim();
    return text;
  };
}

// Global i18n mock for all component test suites
vi.mock("@/i18n", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/i18n")>();
  const testT = createTestTranslate();
  return {
    ...actual,
    useI18n: () => ({
      locale: "vi",
      setLocale: vi.fn(),
      t: testT,
      isReady: true,
    }),
    useTranslation: () => ({
      locale: "vi",
      setLocale: vi.fn(),
      t: testT,
      isReady: true,
    }),
  };
});
