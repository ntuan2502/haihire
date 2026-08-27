export type Role = "HR" | "ADMIN" | "INTERVIEWER" | "CANDIDATE";

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
  id: number;
  name: string;
  slug: string;
  inviteCode: string;
  createdAt: string;
}

export interface User {
  id: number;
  email: string;
  name: string;
  role: Role;
  avatarUrl?: string | null;
  organizationId?: number | null;
  organization?: Organization | null;
  createdAt: string;
}

export interface Job {
  id: number;
  title: string;
  department: string;
  location: string;
  type: JobType;
  description: string;
  requirements?: string | null;
  salaryRange?: string | null;
  status: JobStatus;
  createdById?: number | null;
  organizationId?: number | null;
  organization?: Organization | null;
  createdAt: string;
  updatedAt: string;
  applicationsCount?: number;
  applicationsByStage?: Record<string, number>;
  applications?: Application[];
}

export interface Application {
  id: number;
  jobId?: number | null;
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
  createdAt: string;
  updatedAt: string;
  job?: Partial<Job>;
}

export interface CreateJobInput {
  title: string;
  department: string;
  location: string;
  type?: JobType;
  description: string;
  requirements?: string;
  salaryRange?: string;
  status?: JobStatus;
  organizationId?: number | null;
  createdById?: number | null;
}

export interface CreateApplicationInput {
  jobId: number;
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string;
  notes?: string;
  resume: File;
}
