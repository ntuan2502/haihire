export type Role = "ADMIN" | "MEMBER";

export type JobType =
  | "FULL_TIME"
  | "PART_TIME"
  | "CONTRACT"
  | "INTERNSHIP"
  | "REMOTE";

export type JobStatus = "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED";

export type ApplicationStage =
  | "APPLIED"
  | "SCREENING"
  | "INTERVIEW"
  | "OFFER"
  | "HIRED"
  | "REJECTED";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  ownerId?: string | null;
  createdAt: string;
}

export interface InviteLink {
  id: string;
  token: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  role: string;
  expiresInDays: number | null;
  expiresAt: string | null;
  maxUses: number | null;
  usesCount: number;
  createdById: string;
  createdByName: string;
  status: "active" | "inactive" | "revoked";
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  isOwner?: boolean;
  avatarUrl?: string | null;
  organizationId?: string | null;
  organization?: Organization | null;
  createdAt: string;
}

export interface Job {
  id: string;
  title: string;
  department: string;
  location: string;
  postalCode?: string | null;
  experienceLevel?: string | null;
  workplace?: string | null;
  type: JobType;
  description: string;
  requirements?: string | null;
  salaryRange?: string | null;
  status: JobStatus;
  createdById?: string | null;
  organizationId?: string | null;
  organization?: Organization | null;
  createdAt: string;
  updatedAt: string;
  applicationsCount?: number;
  applicationsByStage?: Record<string, number>;
  applications?: Application[];
}

export interface CandidateDocument {
  id: string;
  name: string;
  url: string;
  size?: number | null;
  mimeType?: string | null;
  type?: string;
  createdAt: string;
}

export interface Application {
  id: string;
  jobId?: string | null;
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string | null;
  stage: ApplicationStage;
  resumeUrl: string;
  resumeFileName: string;
  resumeFileSize?: number | null;
  resumeMimeType?: string | null;
  notes?: string | null;
  orderIndex: number;
  matchScore?: number | null;
  createdAt: string;
  updatedAt: string;
  job?: Partial<Job>;
}

export interface CreateJobInput {
  title: string;
  department: string;
  location: string;
  postalCode?: string | null;
  experienceLevel?: string | null;
  workplace?: string | null;
  type?: JobType;
  description: string;
  requirements?: string | null;
  salaryRange?: string | null;
  status?: JobStatus;
  organizationId?: string | null;
  createdById?: string | null;
}

export interface CreateApplicationInput {
  jobId?: string | null;
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string;
  notes?: string;
  resume?: File;
}
