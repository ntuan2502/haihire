import type { Organization } from "./organizations";
import type { Application } from "./applications";

export const JobType = {
  FULL_TIME: "FULL_TIME",
  PART_TIME: "PART_TIME",
  CONTRACT: "CONTRACT",
  INTERNSHIP: "INTERNSHIP",
} as const;
export type JobType = (typeof JobType)[keyof typeof JobType];

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
} as const;
export type WorkplaceType = (typeof WorkplaceType)[keyof typeof WorkplaceType];

export const ExperienceLevel = {
  ENTRY_LEVEL: "ENTRY_LEVEL",
  MID_LEVEL: "MID_LEVEL",
  SENIOR_LEVEL: "SENIOR_LEVEL",
  LEAD: "LEAD",
  EXECUTIVE: "EXECUTIVE",
} as const;
export type ExperienceLevel = (typeof ExperienceLevel)[keyof typeof ExperienceLevel];

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
  requirements?: string | null;
  salaryRange?: string | null;
  status: JobStatus;
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
  requirements?: string | null;
  salaryRange?: string | null;
  status?: JobStatus;
  organizationId?: string | null;
  createdById?: string | null;
}
