import {
  DEFAULT_ORG_LOCALIZATION,
  type CurrencyCode,
  type DateFormat,
  type OrgLanguage,
  type TimeFormat,
} from "@haihire/shared";
import {
  getActiveLocalizationNullable,
  getActiveUiLocale,
  type LocalizationOverrides,
} from "./localization-runtime";

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
  const activeLoc = getActiveLocalizationNullable();
  const effectiveTimezone = overrides?.timezone ?? activeLoc?.timezone;
  const effectiveDateFormat: DateFormat =
    overrides?.dateFormat ?? activeLoc?.dateFormat ?? "MM/DD/YYYY";
  const effectiveLang: OrgLanguage =
    overrides?.defaultLanguage ?? getActiveUiLocale() ?? "en";

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
  const activeLoc = getActiveLocalizationNullable();
  const effectiveTimezone = overrides?.timezone ?? activeLoc?.timezone;
  const effectiveDateFormat: DateFormat =
    overrides?.dateFormat ?? activeLoc?.dateFormat ?? "MM/DD/YYYY";

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
  const activeLoc = getActiveLocalizationNullable();
  const effectiveTimeFormat: TimeFormat =
    overrides?.timeFormat ?? activeLoc?.timeFormat ?? "24H";
  const effectiveTimezone = overrides?.timezone ?? activeLoc?.timezone;

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
  const activeLoc = getActiveLocalizationNullable();
  const currency =
    currencyCode ??
    overrides?.defaultCurrency ??
    activeLoc?.defaultCurrency ??
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
    overrides?.defaultLanguage ?? getActiveUiLocale() ?? "en";

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
