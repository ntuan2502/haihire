import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Application, CandidateDocument } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date into consistent string formats (e.g. "08/27/2026", "8/27/2026", "Aug 27, 2026")
 */
export function formatDate(
  dateInput?: string | Date | null,
  style: "standard" | "numeric" | "short" = "numeric",
): string {
  if (!dateInput) return "—";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "—";

  if (style === "short") {
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  }

  if (style === "numeric") {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

/**
 * Format relative time (e.g., "0m ago", "2h ago", "3d ago", "Just now")
 */
export function formatRelativeTime(dateInput?: string | Date | null): string {
  if (!dateInput) return "—";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "—";

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d ago`;
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
export function parseCandidateNotes(
  notes?: string | null,
  candidateName?: string | null,
): {
  gender: string;
  dob: string;
  firstName: string;
  lastName: string;
  displayName: string;
  effectiveName: string;
  customNotes: string;
} {
  if (!notes && !candidateName) {
    return {
      gender: "—",
      dob: "—",
      firstName: "",
      lastName: "",
      displayName: "",
      effectiveName: "—",
      customNotes: "",
    };
  }

  const genderMatch = notes?.match(/Gender:\s*([^|]+)/i);
  const dobMatch = notes?.match(/DOB:\s*([^|]+)/i);
  const firstNameMatch = notes?.match(/FirstName:\s*([^|]+)/i);
  const lastNameMatch = notes?.match(/LastName:\s*([^|]+)/i);
  const displayNameMatch = notes?.match(/DisplayName:\s*([^|]+)/i);

  let rawCustom = (notes || "")
    .replace(/Gender:\s*[^|]+\|?/gi, "")
    .replace(/DOB:\s*[^|]+\|?/gi, "")
    .replace(/FirstName:\s*[^|]+\|?/gi, "")
    .replace(/LastName:\s*[^|]+\|?/gi, "")
    .replace(/DisplayName:\s*[^|]+\|?/gi, "")
    .replace(/Docs:\s*\[[^\]]*\]\|?/gi, "")
    .replace(/Interview:\s*\{.*?\}\s*\|?/gi, "")
    .trim();
  rawCustom = rawCustom.replace(/^\|\s*|\s*\|$/g, "").trim();

  const parsedFirst = firstNameMatch ? firstNameMatch[1].trim() : "";
  const parsedLast = lastNameMatch ? lastNameMatch[1].trim() : "";
  const parsedDisplay = displayNameMatch ? displayNameMatch[1].trim() : "";

  // If first/last are not in notes, infer from candidateName
  let inferredFirst = parsedFirst;
  let inferredLast = parsedLast;
  if (!inferredFirst && !inferredLast && candidateName) {
    const parts = candidateName.trim().split(/\s+/);
    if (parts.length > 1) {
      inferredFirst = parts[0];
      inferredLast = parts.slice(1).join(" ");
    } else {
      inferredFirst = parts[0] || "";
    }
  }

  // The unified display name shown across all views:
  // 1. Explicit DisplayName -> 2. candidateName -> 3. "firstName lastName"
  const effectiveName =
    parsedDisplay ||
    candidateName ||
    [inferredFirst, inferredLast].filter(Boolean).join(" ") ||
    "—";

  return {
    gender: genderMatch ? genderMatch[1].trim() : "—",
    dob: dobMatch ? dobMatch[1].trim() : "—",
    firstName: inferredFirst,
    lastName: inferredLast,
    displayName: parsedDisplay,
    effectiveName,
    customNotes: rawCustom,
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
 * Parse candidate documents list from candidate notes and fallback application
 */
export function parseCandidateDocuments(
  notes?: string | null,
  fallbackApp?: {
    id: string;
    resumeUrl: string;
    resumeFileName: string;
    resumeFileSize?: number | null;
    resumeMimeType?: string | null;
    createdAt: string;
  },
): CandidateDocument[] {
  let docs: CandidateDocument[] = [];
  if (notes) {
    const match = notes.match(/Docs:\s*(\[[^\]]*\])/);
    if (match) {
      try {
        const rawDocs = JSON.parse(match[1]);
        if (Array.isArray(rawDocs)) {
          docs = rawDocs.map((d) => ({
            ...d,
            name: fixUtf8String(d.name || "document.pdf"),
          }));
        }
      } catch (e) {
        console.error("Failed to parse candidate documents from notes:", e);
      }
    }
  }

  // Fallback to legacy single resumeUrl if no docs array found yet
  if (
    docs.length === 0 &&
    fallbackApp &&
    fallbackApp.resumeUrl &&
    fallbackApp.resumeUrl.trim() !== ""
  ) {
    docs.push({
      id: fallbackApp.id,
      name: fixUtf8String(fallbackApp.resumeFileName || "Resume.pdf"),
      url: fallbackApp.resumeUrl,
      size: fallbackApp.resumeFileSize,
      mimeType: fallbackApp.resumeMimeType || "application/pdf",
      createdAt: fallbackApp.createdAt,
      type: "Resume",
    });
  }

  return docs;
}

/**
 * Build packed metadata string for candidate notes
 */
export function buildCandidateNotes(params: {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  gender?: string;
  dob?: string;
  customNotes?: string;
}): string | undefined {
  const segments: string[] = [];

  if (params.firstName?.trim()) {
    segments.push(`FirstName: ${params.firstName.trim()}`);
  }
  if (params.lastName?.trim()) {
    segments.push(`LastName: ${params.lastName.trim()}`);
  }
  if (params.displayName?.trim()) {
    segments.push(`DisplayName: ${params.displayName.trim()}`);
  }
  if (params.gender && params.gender !== "Not specified" && params.gender !== "—") {
    segments.push(`Gender: ${params.gender.trim()}`);
  }
  if (params.dob?.trim() && params.dob !== "—") {
    segments.push(`DOB: ${params.dob.trim()}`);
  }
  if (params.customNotes?.trim()) {
    segments.push(params.customNotes.trim());
  }

  return segments.length > 0 ? segments.join(" | ") : undefined;
}

/**
 * Get unified candidate display name from candidate application or notes
 */
export function getCandidateDisplayName(candidate?: {
  candidateName?: string | null;
  notes?: string | null;
} | null): string {
  if (!candidate) return "—";
  const { effectiveName } = parseCandidateNotes(candidate.notes, candidate.candidateName);
  return effectiveName || candidate.candidateName || "—";
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
  notes: string;
  rawApp: Application;
}

/**
 * Aggregate raw application records into unique candidates in Talent Pool
 */
export function aggregateCandidates(applications: Application[]): CandidateItem[] {
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
        notes: app.notes || "",
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
      if (app.notes) {
        existing.notes = app.notes;
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

