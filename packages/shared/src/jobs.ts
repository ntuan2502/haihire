import type { Organization } from "./organizations";
import type { Application, ApplicationStage } from "./applications";
import type { JobApplicationFormConfig } from "./application-form";
import type { JobScoringConfig } from "./ai";

export const JobType = {
  FULL_TIME: "FULL_TIME",
  PART_TIME: "PART_TIME",
  CONTRACT: "CONTRACT",
  TEMPORARY: "TEMPORARY",
  SEASONAL: "SEASONAL",
  FREELANCE: "FREELANCE",
  INTERNSHIP: "INTERNSHIP",
  APPRENTICESHIP: "APPRENTICESHIP",
  PER_DIEM: "PER_DIEM",
  VOLUNTEER: "VOLUNTEER",
} as const;
export type JobType = (typeof JobType)[keyof typeof JobType];

export const JOB_TYPE_ORDER: readonly JobType[] = [
  JobType.FULL_TIME,
  JobType.PART_TIME,
  JobType.CONTRACT,
  JobType.TEMPORARY,
  JobType.SEASONAL,
  JobType.FREELANCE,
  JobType.INTERNSHIP,
  JobType.APPRENTICESHIP,
  JobType.PER_DIEM,
  JobType.VOLUNTEER,
];

export const JobStatus = {
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
  CLOSED: "CLOSED",
  ARCHIVED: "ARCHIVED",
} as const;
export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];

export const WorkplaceType = {
  ON_SITE: "ON_SITE",
  HYBRID: "HYBRID",
  REMOTE: "REMOTE",
  FIELD: "FIELD",
} as const;
export type WorkplaceType = (typeof WorkplaceType)[keyof typeof WorkplaceType];

export const WORKPLACE_TYPE_ORDER: readonly WorkplaceType[] = [
  WorkplaceType.ON_SITE,
  WorkplaceType.HYBRID,
  WorkplaceType.REMOTE,
  WorkplaceType.FIELD,
];

export const ExperienceLevel = {
  INTERN: "INTERN",
  ENTRY_LEVEL: "ENTRY_LEVEL",
  JUNIOR: "JUNIOR",
  MID_LEVEL: "MID_LEVEL",
  SENIOR_LEVEL: "SENIOR_LEVEL",
  LEAD: "LEAD",
  MANAGER: "MANAGER",
  DIRECTOR: "DIRECTOR",
  EXECUTIVE: "EXECUTIVE",
} as const;
export type ExperienceLevel =
  (typeof ExperienceLevel)[keyof typeof ExperienceLevel];

export const EXPERIENCE_LEVEL_ORDER: readonly ExperienceLevel[] = [
  ExperienceLevel.INTERN,
  ExperienceLevel.ENTRY_LEVEL,
  ExperienceLevel.JUNIOR,
  ExperienceLevel.MID_LEVEL,
  ExperienceLevel.SENIOR_LEVEL,
  ExperienceLevel.LEAD,
  ExperienceLevel.MANAGER,
  ExperienceLevel.DIRECTOR,
  ExperienceLevel.EXECUTIVE,
];

export interface Job {
  id: string;
  title: string;
  department: string;
  location: string;
  postalCode?: string | null;
  experienceLevel?: ExperienceLevel | null;
  workplace?: WorkplaceType | null;
  type: JobType;
  description: string;
  applicationDeadline?: string | null;
  startDate?: string | null;
  openings?: number;
  salaryRange?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  status: JobStatus;
  applicationFormConfig?: JobApplicationFormConfig | null;
  scoringConfig?: JobScoringConfig | null;
  createdById?: string | null;
  organizationId: string;
  organization?: Organization | null;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  applicationsCount?: number;
  applicationsByStage?: Record<string, number>;
  applications?: Application[];
}

export interface CreateJobInput {
  title: string;
  department: string;
  location: string;
  postalCode?: string | null;
  experienceLevel?: ExperienceLevel | null;
  workplace?: WorkplaceType | null;
  type?: JobType;
  description: string;
  applicationDeadline?: string | null;
  startDate?: string | null;
  openings?: number;
  salaryRange?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  status?: JobStatus;
  applicationFormConfig?: JobApplicationFormConfig | null;
  scoringConfig?: JobScoringConfig | null;
  organizationId?: string | null;
  createdById?: string | null;
}

/**
 * Strips HTML markup and common HTML entities to evaluate the underlying plain-text content.
 */
export function extractPlainTextFromHtml(input: string): string {
  if (!input) return "";
  return input
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extracts a YYYY-MM-DD date string from a Date or ISO date/datetime value.
 */
export function toDateOnlyString(value?: Date | string | null): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? null
      : value.toISOString().slice(0, 10);
  }
  const match = String(value)
    .trim()
    .match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

/**
 * Returns true strictly when today's UTC date is after the job's date-only deadline.
 */
export function isJobApplicationDeadlinePassed(
  deadline?: Date | string | null,
  now: Date = new Date(),
): boolean {
  const deadlineStr = toDateOnlyString(deadline);
  if (!deadlineStr) return false;
  const todayStr = now.toISOString().slice(0, 10);
  return todayStr > deadlineStr;
}

export interface PipelineStageItem {
  id: string;
  organizationId: string;
  jobId?: string | null;
  name: string;
  category: ApplicationStage;
  orderIndex: number;
  color?: string | null;
  isTerminal: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}
