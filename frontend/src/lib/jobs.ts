import type { JobType, WorkplaceType, ExperienceLevel } from "@/types";

/**
 * Returns translated display label for a Job Type / Employment Type (Loại hợp đồng / Hình thức làm việc)
 */
export function getJobTypeLabel(
  type: JobType | string | null | undefined,
  t: (key: string) => string,
): string {
  if (!type) return t("jobs.fullTime");
  switch (type) {
    case "FULL_TIME":
    case "Full-time":
      return t("jobs.fullTime");
    case "PART_TIME":
    case "Part-time":
      return t("jobs.partTime");
    case "CONTRACT":
    case "Contract":
      return t("jobs.contract");
    case "INTERNSHIP":
    case "Internship":
      return t("jobs.internship");
    case "TEMPORARY":
    case "Temporary":
      return t("jobs.temporary");
    case "REMOTE":
    case "Remote":
      return t("jobs.workplace.remote");
    default:
      return String(type);
  }
}

/**
 * Returns translated display label for a Workplace / Work Arrangement (Mô hình làm việc)
 */
export function getWorkplaceLabel(
  workplace: WorkplaceType | string | null | undefined,
  t: (key: string) => string,
): string {
  if (!workplace) return "";
  switch (workplace) {
    case "REMOTE":
    case "Remote":
      return t("jobs.workplace.remote");
    case "HYBRID":
    case "Hybrid":
      return t("jobs.workplace.hybrid");
    case "ON_SITE":
    case "On-site":
    case "onsite":
      return t("jobs.workplace.onsite");
    default:
      return String(workplace);
  }
}

/**
 * Returns translated display label for an Experience Level (Cấp bậc kinh nghiệm)
 */
export function getExperienceLevelLabel(
  level: ExperienceLevel | string | null | undefined,
  t: (key: string) => string,
): string {
  if (!level) return "";
  switch (level) {
    case "ENTRY_LEVEL":
    case "Entry-level":
    case "junior":
      return t("jobs.experience.junior");
    case "MID_LEVEL":
    case "Mid-level":
    case "mid":
      return t("jobs.experience.mid");
    case "SENIOR_LEVEL":
    case "Senior-level":
    case "senior":
      return t("jobs.experience.senior");
    case "LEAD":
    case "Lead":
      return t("jobs.experience.lead");
    case "EXECUTIVE":
    case "Executive":
      return t("jobs.experience.executive");
    default:
      return String(level);
  }
}
