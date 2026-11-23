import type {
  Application,
  Candidate,
  CandidateLatestNoteSummary,
  Gender,
} from "@/types";
import {
  DEFAULT_ORG_LOCALIZATION,
  formatCandidateDisplayName,
  formatUserDisplayName,
  type NameDisplayOrder,
  type OrganizationLocalizationSettings,
} from "@haihire/shared";
import { getActiveLocalization } from "./utils";

type FormatterLocalizationOverrides = Partial<OrganizationLocalizationSettings>;

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
  overrides?: FormatterLocalizationOverrides,
  activeOrder?: NameDisplayOrder,
): string {
  if (!candidate) return "—";
  const nameOrder: NameDisplayOrder =
    overrides?.nameDisplayOrder ??
    activeOrder ??
    getActiveLocalization().nameDisplayOrder ??
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
  overrides?: FormatterLocalizationOverrides,
  activeOrder?: NameDisplayOrder,
): string {
  if (!user) return "—";
  const nameOrder: NameDisplayOrder =
    overrides?.nameDisplayOrder ??
    activeOrder ??
    getActiveLocalization().nameDisplayOrder ??
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
  activeOrder?: NameDisplayOrder,
): CandidateItem[] {
  const map = new Map<string, CandidateItem>();

  applications.forEach((app) => {
    const key = (app.candidateEmail || app.candidateName).toLowerCase().trim();
    const hasJob = Boolean(app.jobId && String(app.jobId).trim() !== "");
    const effectiveName = getCandidateDisplayName(app, undefined, activeOrder);

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

export {
  type StageConfig,
  STAGES_ORDER,
  STAGE_CONFIG_MAP,
  PIPELINE_STAGES,
  getStageInfo,
} from "./stages";
