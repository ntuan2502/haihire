import type { CandidateDocument } from "@/types";
import {
  DEFAULT_ORG_LOCALIZATION,
  formatCandidateDisplayName,
  normalizeOrgLocalization,
  type CurrencyCode,
  type DateFormat,
  type NameDisplayOrder,
  type OrgLanguage,
  type OrganizationLocalizationSettings,
  type TimeFormat,
} from "@haihire/shared";
export { cn } from "cn";

export type LocalizationOverrides = Partial<OrganizationLocalizationSettings>;

let activeOrgLocalization: OrganizationLocalizationSettings | null = null;
let activeUiLocale: OrgLanguage | null = null;

/**
 * Activate runtime organization formatting preferences for utilities across the app.
 */
export function setActiveLocalization(
  orgSettings?: Partial<OrganizationLocalizationSettings> | null,
  uiLocale?: OrgLanguage | null,
): void {
  if (typeof window === "undefined") {
    return;
  }
  activeOrgLocalization = orgSettings
    ? normalizeOrgLocalization(orgSettings)
    : null;
  activeUiLocale = uiLocale ?? activeOrgLocalization?.defaultLanguage ?? null;
}

/**
 * Reset active runtime formatting preferences back to stateless test/default fallbacks.
 */
export function resetActiveLocalization(): void {
  activeOrgLocalization = null;
  activeUiLocale = null;
}

export function isRuntimeLocalizationActive(): boolean {
  return activeOrgLocalization !== null;
}

export function getActiveLocalization(): OrganizationLocalizationSettings {
  return activeOrgLocalization ?? { ...DEFAULT_ORG_LOCALIZATION };
}

/**
 * Resolve the effective IANA timezone from LocalizationProvider state with
 * stateless runtime/default fallback so hooks behave identically in tests.
 */
export function resolveEffectiveTimezone(
  configuredTimezone?: string | null,
  isConfigured = false,
): string {
  if (isConfigured && configuredTimezone) return configuredTimezone;
  if (isRuntimeLocalizationActive()) {
    return getActiveLocalization().timezone;
  }
  return (
    Intl.DateTimeFormat().resolvedOptions().timeZone ||
    DEFAULT_ORG_LOCALIZATION.timezone
  );
}

/**
 * Shift a pure YYYY-MM-DD calendar date by N days using UTC calendar math
 * so local browser timezone DST transitions never skip or repeat dates.
 */
export function addDaysToYmd(ymd: string, days: number): string {
  const parts = ymd.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return "";
  const dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + days));
  return dt.toISOString().slice(0, 10);
}

export function getActiveDefaultCurrency(): CurrencyCode | null {
  return activeOrgLocalization ? activeOrgLocalization.defaultCurrency : null;
}

function extractCalendarParts(
  dateInput: string | Date,
  timezone?: string,
): { year: number; month: number; day: number; isDateOnly: boolean } | null {
  if (typeof dateInput === "string") {
    const trimmed = dateInput.trim();
    const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    if (dateOnlyMatch) {
      return {
        year: Number(dateOnlyMatch[1]),
        month: Number(dateOnlyMatch[2]),
        day: Number(dateOnlyMatch[3]),
        isDateOnly: true,
      };
    }
  }

  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return null;

  if (timezone) {
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(date);
      const year = Number(parts.find((p) => p.type === "year")?.value);
      const month = Number(parts.find((p) => p.type === "month")?.value);
      const day = Number(parts.find((p) => p.type === "day")?.value);
      if (year && month && day) {
        return { year, month, day, isDateOnly: false };
      }
    } catch {
      // Fall back to local calendar components when runtime rejects timezone
    }
  }

  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    isDateOnly: false,
  };
}

function formatCalendarParts(
  parts: { year: number; month: number; day: number },
  dateFormat: DateFormat,
  padded: boolean,
): string {
  const m = padded ? String(parts.month).padStart(2, "0") : String(parts.month);
  const d = padded ? String(parts.day).padStart(2, "0") : String(parts.day);
  const y = String(parts.year);

  if (dateFormat === "DD/MM/YYYY") return `${d}/${m}/${y}`;
  if (dateFormat === "YYYY-MM-DD") return `${y}-${m}-${d}`;
  return `${m}/${d}/${y}`;
}

/**
 * Format a date into consistent string formats respecting active organization localization.
 */
export function formatDate(
  dateInput?: string | Date | null,
  style: "standard" | "numeric" | "short" = "numeric",
  overrides?: LocalizationOverrides,
): string {
  if (!dateInput) return "—";
  const effectiveTimezone =
    overrides?.timezone ?? activeOrgLocalization?.timezone;
  const effectiveDateFormat: DateFormat =
    overrides?.dateFormat ?? activeOrgLocalization?.dateFormat ?? "MM/DD/YYYY";
  const effectiveLang: OrgLanguage =
    overrides?.defaultLanguage ?? activeUiLocale ?? "en";

  const parts = extractCalendarParts(dateInput, effectiveTimezone);
  if (!parts) return "—";

  if (style === "short") {
    return formatCalendarParts(parts, effectiveDateFormat, false);
  }

  if (style === "numeric") {
    return formatCalendarParts(parts, effectiveDateFormat, true);
  }

  const parsedDate =
    typeof dateInput === "string"
      ? parts.isDateOnly
        ? new Date(Date.UTC(parts.year, parts.month - 1, parts.day))
        : new Date(dateInput)
      : dateInput;

  return new Intl.DateTimeFormat(effectiveLang === "vi" ? "vi-VN" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(parts.isDateOnly
      ? { timeZone: "UTC" }
      : effectiveTimezone
        ? { timeZone: effectiveTimezone }
        : {}),
  }).format(parsedDate);
}

/**
 * Format day + month compactly (without year) respecting active organization dateFormat.
 */
export function formatDayMonth(
  dateInput?: string | Date | null,
  overrides?: LocalizationOverrides,
): string {
  if (!dateInput) return "—";
  const effectiveTimezone =
    overrides?.timezone ?? activeOrgLocalization?.timezone;
  const effectiveDateFormat: DateFormat =
    overrides?.dateFormat ?? activeOrgLocalization?.dateFormat ?? "MM/DD/YYYY";

  const parts = extractCalendarParts(dateInput, effectiveTimezone);
  if (!parts) return "—";

  const dd = String(parts.day).padStart(2, "0");
  const mm = String(parts.month).padStart(2, "0");

  if (effectiveDateFormat === "DD/MM/YYYY") return `${dd}/${mm}`;
  if (effectiveDateFormat === "YYYY-MM-DD") return `${mm}-${dd}`;
  return `${mm}/${dd}`;
}

/**
 * Format a clock string (e.g. "14:30") or timestamp according to 24H / 12H preference.
 */
export function formatTime(
  timeOrDateInput?: string | Date | null,
  overrides?: LocalizationOverrides,
): string {
  if (!timeOrDateInput) return "—";
  const effectiveTimeFormat: TimeFormat =
    overrides?.timeFormat ?? activeOrgLocalization?.timeFormat ?? "24H";
  const effectiveTimezone =
    overrides?.timezone ?? activeOrgLocalization?.timezone;

  let hour: number | null = null;
  let minute: number | null = null;

  if (typeof timeOrDateInput === "string") {
    const clockMatch = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(
      timeOrDateInput.trim(),
    );
    if (clockMatch) {
      const parsedHour = Number(clockMatch[1]);
      const parsedMin = Number(clockMatch[2]);
      if (
        parsedHour >= 0 &&
        parsedHour <= 23 &&
        parsedMin >= 0 &&
        parsedMin <= 59
      ) {
        hour = parsedHour;
        minute = parsedMin;
      }
    }
  }

  if (hour === null || minute === null) {
    const date =
      typeof timeOrDateInput === "string"
        ? new Date(timeOrDateInput)
        : timeOrDateInput;
    if (isNaN(date.getTime())) {
      return typeof timeOrDateInput === "string" ? timeOrDateInput : "—";
    }
    if (effectiveTimezone) {
      try {
        const timeParts = new Intl.DateTimeFormat("en-GB", {
          timeZone: effectiveTimezone,
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }).formatToParts(date);
        const hPart = Number(timeParts.find((p) => p.type === "hour")?.value);
        const mPart = Number(timeParts.find((p) => p.type === "minute")?.value);
        if (!isNaN(hPart) && !isNaN(mPart)) {
          hour = hPart === 24 ? 0 : hPart;
          minute = mPart;
        }
      } catch {
        // Fall through to local time
      }
    }
    if (hour === null || minute === null) {
      hour = date.getHours();
      minute = date.getMinutes();
    }
  }

  const mm = String(minute).padStart(2, "0");
  if (effectiveTimeFormat === "12H") {
    const period = hour >= 12 ? "PM" : "AM";
    const h12 = hour % 12 || 12;
    return `${h12}:${mm} ${period}`;
  }

  return `${String(hour).padStart(2, "0")}:${mm}`;
}

/**
 * Combine localized date and time formatting.
 */
export function formatDateTime(
  dateInput?: string | Date | null,
  overrides?: LocalizationOverrides,
): string {
  const datePart = formatDate(dateInput, "numeric", overrides);
  if (datePart === "—") return "—";
  const timePart = formatTime(dateInput, overrides);
  return timePart === "—" ? datePart : `${datePart} ${timePart}`;
}

/**
 * Format numeric currency according to currency code and organization defaults.
 */
export function formatCurrency(
  amount?: number | null,
  currencyCode?: CurrencyCode | string | null,
  overrides?: LocalizationOverrides,
): string {
  if (amount === null || amount === undefined || isNaN(amount)) return "—";
  const currency =
    currencyCode ??
    overrides?.defaultCurrency ??
    activeOrgLocalization?.defaultCurrency ??
    DEFAULT_ORG_LOCALIZATION.defaultCurrency;

  const localeByCurrency: Record<string, string> = {
    VND: "vi-VN",
    USD: "en-US",
    EUR: "en-IE",
    SGD: "en-SG",
    JPY: "ja-JP",
  };

  try {
    return new Intl.NumberFormat(localeByCurrency[currency] || "en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "VND" || currency === "JPY" ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

/**
 * Format relative time respecting active interface/organization language.
 */
export function formatRelativeTime(
  dateInput?: string | Date | null,
  overrides?: LocalizationOverrides,
): string {
  if (!dateInput) return "—";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "—";

  const lang: OrgLanguage =
    overrides?.defaultLanguage ?? activeUiLocale ?? "en";

  const now = new Date();
  const diffInSeconds = Math.max(
    0,
    Math.floor((now.getTime() - date.getTime()) / 1000),
  );

  if (diffInSeconds < 60) return lang === "vi" ? "Vừa xong" : "Just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return lang === "vi"
      ? `${diffInMinutes} phút trước`
      : `${diffInMinutes}m ago`;
  }
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return lang === "vi" ? `${diffInHours} giờ trước` : `${diffInHours}h ago`;
  }
  const diffInDays = Math.floor(diffInHours / 24);
  return lang === "vi" ? `${diffInDays} ngày trước` : `${diffInDays}d ago`;
}

/**
 * Format bytes into human-readable file size string (KB, MB, etc.)
 */
export function formatFileSize(bytes?: number | null): string {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Get uppercase initials from a full name (e.g. "Jane Doe" -> "JD")
 */
export function getInitials(name?: string | null): string {
  if (!name) return "—";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * Parse metadata fields (gender, dob, firstName, lastName, displayName) from candidate notes
 */
/**
 * Resolve structured candidate profile fields (name parts, gender, date of birth)
 */
export function resolveCandidateProfile(
  candidateName?: string | null,
  structured?: {
    firstName?: string | null;
    lastName?: string | null;
    displayName?: string | null;
    gender?: string | null;
    dateOfBirth?: string | Date | null;
  } | null,
  overrides?: LocalizationOverrides,
): {
  gender: string;
  dob: string;
  firstName: string;
  lastName: string;
  displayName: string;
  effectiveName: string;
} {
  if (!candidateName && !structured) {
    return {
      gender: "—",
      dob: "—",
      firstName: "",
      lastName: "",
      displayName: "",
      effectiveName: "—",
    };
  }

  const parsedFirst = structured?.firstName?.trim() || "";
  const parsedLast = structured?.lastName?.trim() || "";
  const parsedDisplay = structured?.displayName?.trim() || "";

  let parsedDob = "";
  if (structured?.dateOfBirth) {
    parsedDob =
      structured.dateOfBirth instanceof Date
        ? structured.dateOfBirth.toISOString().split("T")[0]
        : String(structured.dateOfBirth).split("T")[0];
  }

  const parsedGender = structured?.gender?.trim() || "";
  const nameOrder: NameDisplayOrder =
    overrides?.nameDisplayOrder ??
    activeOrgLocalization?.nameDisplayOrder ??
    DEFAULT_ORG_LOCALIZATION.nameDisplayOrder;

  const effectiveName =
    formatCandidateDisplayName(
      {
        displayName: parsedDisplay || null,
        firstName: parsedFirst,
        lastName: parsedLast,
        name: candidateName,
      },
      nameOrder,
    ) || "—";

  return {
    gender: parsedGender || "—",
    dob: parsedDob || "—",
    firstName: parsedFirst,
    lastName: parsedLast,
    displayName: parsedDisplay,
    effectiveName,
  };
}

/**
 * Fix Mojibake/garbled UTF-8 strings (e.g. latin1 interpretation of Vietnamese UTF-8 bytes)
 */
export function fixUtf8String(str?: string | null): string {
  if (!str) return "";
  try {
    const bytes = new Uint8Array(
      str.split("").map((c) => c.charCodeAt(0) & 0xff),
    );
    const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    if (decoded && !decoded.includes("\ufffd") && decoded !== str) {
      return decoded.normalize("NFC");
    }
  } catch {
    // ignore
  }
  return str.normalize("NFC");
}

/**
 * Build candidate document entry from an application's attached resume.
 */
export function parseCandidateDocuments(
  fallbackApp?: {
    id: string;
    resumeUrl: string;
    resumeFileName: string;
    resumeFileSize?: number | null;
    resumeMimeType?: string | null;
    createdAt: string;
  } | null,
): CandidateDocument[] {
  if (
    fallbackApp &&
    fallbackApp.resumeUrl &&
    fallbackApp.resumeUrl.trim() !== ""
  ) {
    return [
      {
        id: fallbackApp.id,
        name: fixUtf8String(fallbackApp.resumeFileName || "Resume.pdf"),
        url: fallbackApp.resumeUrl,
        size: fallbackApp.resumeFileSize,
        mimeType: fallbackApp.resumeMimeType || "application/pdf",
        createdAt: fallbackApp.createdAt,
        type: "Resume",
      },
    ];
  }

  return [];
}

/**
 * Normalizes optional candidate/recipient email values and rejects display placeholders like "—".
 */
export function normalizeEmailAddress(email?: string | null): string {
  const trimmed = email?.trim() || "";
  if (!trimmed || trimmed === "—" || !trimmed.includes("@")) {
    return "";
  }
  return trimmed;
}

/**
 * Validates that a client redirect query parameter points strictly to an internal path.
 */
export function sanitizeRedirectPath(
  redirectParam: string | null | undefined,
  fallback = "/dashboard",
): string {
  if (
    typeof redirectParam === "string" &&
    redirectParam.startsWith("/") &&
    !redirectParam.startsWith("//") &&
    !redirectParam.startsWith("/\\") &&
    !/[\r\n\\]/.test(redirectParam)
  ) {
    return redirectParam;
  }
  return fallback;
}

export * from "./candidate-formatters";
