import type { JobType } from "@/types";

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
  workplace: string | null | undefined,
  t: (key: string) => string,
): string {
  if (!workplace) return "";
  const normalized = workplace.trim().toLowerCase();
  if (normalized === "remote") return t("jobs.workplace.remote");
  if (normalized === "hybrid") return t("jobs.workplace.hybrid");
  if (normalized === "on-site" || normalized === "onsite") return t("jobs.workplace.onsite");
  if (normalized === "not specified") return t("jobs.workplace.notSpecified");
  return workplace;
}

/**
 * Returns translated display label for an Experience Level (Cấp bậc kinh nghiệm)
 */
export function getExperienceLevelLabel(
  level: string | null | undefined,
  t: (key: string) => string,
): string {
  if (!level) return "";
  const normalized = level.trim().toLowerCase();
  if (normalized === "entry-level" || normalized === "junior" || normalized === "entry") {
    return t("jobs.experience.junior");
  }
  if (normalized === "mid-level" || normalized === "mid") {
    return t("jobs.experience.mid");
  }
  if (normalized === "senior-level" || normalized === "senior") {
    return t("jobs.experience.senior");
  }
  if (normalized === "lead") {
    return t("jobs.experience.lead");
  }
  if (normalized === "executive" || normalized === "principal" || normalized === "director") {
    return t("jobs.experience.executive");
  }
  return level;
}
