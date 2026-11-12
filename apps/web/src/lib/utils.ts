import type {
  Application,
  Candidate,
  CandidateDocument,
  CandidateLatestNoteSummary,
  Gender,
} from "@/types";
import {
  DEFAULT_ORG_LOCALIZATION,
  formatCandidateDisplayName,
  formatUserDisplayName,
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
 * Get localized display label for candidate gender
 */
export function getGenderLabel(
  gender: Gender | string | null | undefined,
  t: (key: string) => string,
): string {
  if (
    !gender ||
    gender === "—" ||
    gender === "NOT_SPECIFIED" ||
    gender === "Not specified"
  ) {
    return "—";
  }
  const upper = gender.toUpperCase();
  if (upper === "MALE") return t("candidates.male");
  if (upper === "FEMALE") return t("candidates.female");
  if (upper === "OTHER") return t("candidates.otherGender");
  return gender;
}

/**
 * Get unified candidate display name respecting organization name display order.
 */
export interface CandidateNameInput {
  name?: string | null;
  displayName?: string | null;
  candidateName?: string | null;
  candidateFirstName?: string | null;
  candidateLastName?: string | null;
  candidateDisplayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  candidate?: {
    name?: string | null;
    displayName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
}

/**
 * Get unified candidate display name respecting explicit displayName override
 * and organization name display order.
 */
export function getCandidateDisplayName(
  candidate?: CandidateNameInput | null,
  overrides?: LocalizationOverrides,
): string {
  if (!candidate) return "—";
  const nameOrder: NameDisplayOrder =
    overrides?.nameDisplayOrder ??
    activeOrgLocalization?.nameDisplayOrder ??
    DEFAULT_ORG_LOCALIZATION.nameDisplayOrder;

  const nested = candidate.candidate;
  const formatted = formatCandidateDisplayName(
    {
      displayName:
        candidate.displayName ??
        candidate.candidateDisplayName ??
        nested?.displayName,
      firstName:
        candidate.firstName ??
        candidate.candidateFirstName ??
        nested?.firstName,
      lastName:
        candidate.lastName ?? candidate.candidateLastName ?? nested?.lastName,
      name: candidate.name ?? nested?.name,
      candidateName: candidate.candidateName,
    },
    nameOrder,
  );
  return formatted || "—";
}

export interface UserNameInput {
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  email?: string | null;
}

/**
 * Format user display name respecting organization name display order.
 */
export function getUserDisplayName(
  user?: UserNameInput | null,
  overrides?: LocalizationOverrides,
): string {
  if (!user) return "—";
  const nameOrder: NameDisplayOrder =
    overrides?.nameDisplayOrder ??
    activeOrgLocalization?.nameDisplayOrder ??
    DEFAULT_ORG_LOCALIZATION.nameDisplayOrder;
  return formatUserDisplayName(user, nameOrder) || user.email?.trim() || "—";
}

/**
 * Normalize date string to YYYY-MM-DD for HTML5 date picker input
 */
export function normalizeDateForInput(dateStr?: string | null): string {
  if (!dateStr || dateStr === "—" || dateStr.trim() === "") return "";
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parts = trimmed.split("/");
  if (parts.length === 3 && parts[2].length === 4) {
    const mm = parts[0].padStart(2, "0");
    const dd = parts[1].padStart(2, "0");
    const yyyy = parts[2];
    return `${yyyy}-${mm}-${dd}`;
  }
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split("T")[0];
  }
  return "";
}

/**
 * Validate if a string is a valid UUID format (8-4-4-4-12 hexadecimal)
 */
export function isValidUuid(id?: string | null): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    id.trim(),
  );
}

export {
  type StageConfig,
  STAGES_ORDER,
  STAGE_CONFIG_MAP,
  PIPELINE_STAGES,
  getStageInfo,
} from "./stages";

export interface CandidateItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  applicationsCount: number;
  createdAt: string;
  updatedAt?: string;
  latestNote?: CandidateLatestNoteSummary | null;
  notesCount?: number;
  resumeUrl?: string | null;
  resumeFileName?: string | null;
  resumeFileSize?: number | null;
  resumeMimeType?: string | null;
  rawApp?: Application;
  candidate?: Candidate;
}

/**
 * Aggregate raw application records into unique candidates in Talent Pool
 */
export function aggregateCandidates(
  applications: Application[],
): CandidateItem[] {
  const map = new Map<string, CandidateItem>();

  applications.forEach((app) => {
    const key = (app.candidateEmail || app.candidateName).toLowerCase().trim();
    const hasJob = Boolean(app.jobId && String(app.jobId).trim() !== "");
    const effectiveName = getCandidateDisplayName(app);

    if (!map.has(key)) {
      map.set(key, {
        id: app.id,
        name: effectiveName,
        email: app.candidateEmail,
        phone: app.candidatePhone || "",
        applicationsCount: hasJob ? 1 : 0,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
        latestNote: app.candidate?.latestNote ?? null,
        notesCount: app.candidate?.notesCount ?? 0,
        rawApp: app,
      });
    } else {
      const existing = map.get(key)!;
      if (hasJob) {
        existing.applicationsCount += 1;
      }
      if (new Date(app.createdAt) > new Date(existing.createdAt)) {
        existing.createdAt = app.createdAt;
      }
      if (!existing.phone && app.candidatePhone) {
        existing.phone = app.candidatePhone;
      }
      if (app.candidate?.latestNote) {
        existing.latestNote = app.candidate.latestNote;
        existing.notesCount = app.candidate.notesCount ?? existing.notesCount;
        existing.name = effectiveName;
      }
    }
  });

  return Array.from(map.values());
}

/**
 * Generate URL-friendly slug from title (e.g. "Senior Full-Stack Engineer" -> "senior-full-stack-engineer")
 */
export function slugify(str?: string | null): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Generate public careers URL for a job: /careers/[orgSlug]/[jobSlug]
 */
export function getJobPublicUrl(job: {
  id: string;
  title: string;
  organization?: { slug?: string | null } | null;
}): string {
  const orgSlug = job.organization?.slug || "admin";
  const jobSlug = slugify(job.title) || job.id;
  return `/careers/${orgSlug}/${jobSlug}`;
}
