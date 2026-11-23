import type { JobType, WorkplaceType, ExperienceLevel } from "@/types";

/**
 * Returns translated display label for a Job Type / Employment Type (Contract type / Work arrangement)
 */
export function getJobTypeLabel(
  type: JobType | string | null | undefined,
  t: (key: string) => string,
): string {
  if (!type) return "";
  switch (type) {
    case "FULL_TIME":
      return t("jobs.fullTime");
    case "PART_TIME":
      return t("jobs.partTime");
    case "CONTRACT":
      return t("jobs.contract");
    case "INTERNSHIP":
      return t("jobs.internship");
    default:
      return String(type);
  }
}

/**
 * Returns translated display label for a Workplace / Work Arrangement
 */
export function getWorkplaceLabel(
  workplace: WorkplaceType | string | null | undefined,
  t: (key: string) => string,
): string {
  if (!workplace) return "";
  switch (workplace) {
    case "ON_SITE":
      return t("jobs.workplace.onsite");
    case "HYBRID":
      return t("jobs.workplace.hybrid");
    case "REMOTE":
      return t("jobs.workplace.remote");
    default:
      return String(workplace);
  }
}

/**
 * Returns translated display label for an Experience Level
 */
export function getExperienceLevelLabel(
  level: ExperienceLevel | string | null | undefined,
  t: (key: string) => string,
): string {
  if (!level) return "";
  switch (level) {
    case "ENTRY_LEVEL":
      return t("jobs.experience.junior");
    case "MID_LEVEL":
      return t("jobs.experience.mid");
    case "SENIOR_LEVEL":
      return t("jobs.experience.senior");
    case "LEAD":
      return t("jobs.experience.lead");
    case "EXECUTIVE":
      return t("jobs.experience.executive");
    default:
      return String(level);
  }
}
