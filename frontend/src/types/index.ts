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
  createdAt: string;
  updatedAt: string;
  applicationsCount?: number;
  applicationsByStage?: Record<string, number>;
  applications?: Application[];
}

export interface Application {
  id: number;
  jobId: number;
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
}

export interface CreateApplicationInput {
  jobId: number;
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string;
  notes?: string;
  resume: File;
}
