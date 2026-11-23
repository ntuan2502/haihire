import {
  EXPERIENCE_LEVEL_ORDER,
  JOB_TYPE_ORDER,
  WORKPLACE_TYPE_ORDER,
  toDateOnlyString,
  type OrgLanguage,
  type OrganizationLocalizationSettings,
} from "@haihire/shared";
import { formatDate } from "@/lib/utils";
import type { JobType, WorkplaceType, ExperienceLevel } from "@/types";

const JOB_TYPE_KEYS: Record<JobType, string> = {
  FULL_TIME: "jobs.fullTime",
  PART_TIME: "jobs.partTime",
  CONTRACT: "jobs.contract",
  TEMPORARY: "jobs.temporary",
  SEASONAL: "jobs.seasonal",
  FREELANCE: "jobs.freelance",
  INTERNSHIP: "jobs.internship",
  APPRENTICESHIP: "jobs.apprenticeship",
  PER_DIEM: "jobs.perDiem",
  VOLUNTEER: "jobs.volunteer",
};

const WORKPLACE_KEYS: Record<WorkplaceType, string> = {
  ON_SITE: "jobs.workplace.onsite",
  HYBRID: "jobs.workplace.hybrid",
  REMOTE: "jobs.workplace.remote",
  FIELD: "jobs.workplace.field",
};

const EXPERIENCE_LEVEL_KEYS: Record<ExperienceLevel, string> = {
  INTERN: "jobs.experience.intern",
  ENTRY_LEVEL: "jobs.experience.entry",
  JUNIOR: "jobs.experience.junior",
  MID_LEVEL: "jobs.experience.mid",
  SENIOR_LEVEL: "jobs.experience.senior",
  LEAD: "jobs.experience.lead",
  MANAGER: "jobs.experience.manager",
  DIRECTOR: "jobs.experience.director",
  EXECUTIVE: "jobs.experience.executive",
};

/**
 * Returns translated display label for a Job Type / Employment Type.
 */
export function getJobTypeLabel(
  type: JobType | string | null | undefined,
  t: (key: string) => string,
): string {
  if (!type) return "";
  const key = JOB_TYPE_KEYS[type as JobType];
  return key ? t(key) : String(type);
}

/**
 * Returns translated display label for a Workplace / Work Arrangement.
 */
export function getWorkplaceLabel(
  workplace: WorkplaceType | string | null | undefined,
  t: (key: string) => string,
): string {
  if (!workplace) return "";
  const key = WORKPLACE_KEYS[workplace as WorkplaceType];
  return key ? t(key) : String(workplace);
}

/**
 * Returns translated display label for an Experience Level.
 */
export function getExperienceLevelLabel(
  level: ExperienceLevel | string | null | undefined,
  t: (key: string) => string,
): string {
  if (!level) return "";
  const key = EXPERIENCE_LEVEL_KEYS[level as ExperienceLevel];
  return key ? t(key) : String(level);
}

export function getJobTypeOptions(t: (key: string) => string) {
  return JOB_TYPE_ORDER.map((value) => ({
    value,
    label: getJobTypeLabel(value, t),
  }));
}

export function getExperienceLevelOptions(t: (key: string) => string) {
  return EXPERIENCE_LEVEL_ORDER.map((value) => ({
    value,
    label: getExperienceLevelLabel(value, t),
  }));
}

export function getWorkplaceOptions(t: (key: string) => string) {
  return WORKPLACE_TYPE_ORDER.map((value) => ({
    value,
    label: getWorkplaceLabel(value, t),
  }));
}

export function formatDateOnlyForInput(value?: string | Date | null): string {
  return toDateOnlyString(value) ?? "";
}

export function formatDateOnlyDisplay(
  value: string | Date | null | undefined,
  localization: OrganizationLocalizationSettings,
  locale: OrgLanguage,
): string {
  const dateStr = toDateOnlyString(value);
  if (!dateStr) return "";
  return formatDate(`${dateStr}T00:00:00.000Z`, "numeric", {
    ...localization,
    timezone: "UTC",
    defaultLanguage: locale,
  });
}
