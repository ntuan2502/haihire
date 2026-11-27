import type { CandidateDocument } from "@/types";
import {
  DEFAULT_ORG_LOCALIZATION,
  formatCandidateDisplayName,
  type NameDisplayOrder,
} from "@haihire/shared";
import {
  getActiveLocalizationNullable,
  type LocalizationOverrides,
} from "./localization-runtime";

export { cn } from "cn";
export * from "./localization-runtime";
export * from "./date-time-formatters";
export * from "./candidate-formatters";

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
  const activeLoc = getActiveLocalizationNullable();
  const nameOrder: NameDisplayOrder =
    overrides?.nameDisplayOrder ??
    activeLoc?.nameDisplayOrder ??
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
