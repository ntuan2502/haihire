export type Role = "ADMIN" | "MEMBER";

export type JobType =
  | "FULL_TIME"
  | "PART_TIME"
  | "CONTRACT"
  | "INTERNSHIP";

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
  sourceApplicationId?: string;
  jobTitle?: string;
}

export interface Candidate {
  id: string;
  organizationId: string;
  name: string;
  firstName?: string | null;
  lastName?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  email: string;
  phone?: string | null;
  notes?: string | null;
  resumeUrl?: string | null;
  resumeFileName?: string | null;
  resumeFileSize?: number | null;
  resumeMimeType?: string | null;
  createdAt: string;
  updatedAt: string;
  applicationsCount?: number;
  applications?: Application[];
  allDocuments?: CandidateDocument[];
}

export interface InterviewScorecard {
  overallRating: number;
  recommendation: "STRONG_YES" | "YES" | "NEUTRAL" | "NO" | "STRONG_NO";
  technicalScore?: number;
  communicationScore?: number;
  cultureScore?: number;
  problemSolvingScore?: number;
  feedback?: string;
  evaluatedBy?: string;
  evaluatedAt?: string;
}

export interface Interview {
  id: string;
  applicationId: string;
  date: string;
  time: string;
  type: string;
  format: "MEET" | "ZOOM" | "TEAMS" | "OFFICE";
  linkOrLocation: string;
  interviewer: string;
  round: number;
  scorecard?: InterviewScorecard | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  application?: Application;
  candidateName?: string;
  candidateEmail?: string;
  jobTitle?: string;
  jobId?: string;
  organizationId?: string;
}

export interface Application {
  id: string;
  candidateId: string;
  jobId: string;
  candidate?: Candidate | null;
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
  interviews?: Interview[];
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

export interface CreateCandidateInput {
  name: string;
  firstName?: string;
  lastName?: string;
  gender?: string;
  dateOfBirth?: string;
  email: string;
  phone?: string;
  notes?: string;
  resume?: File;
  organizationId?: string;
}

export interface UpdateCandidateInput {
  name?: string;
  firstName?: string;
  lastName?: string;
  gender?: string;
  dateOfBirth?: string;
  email?: string;
  phone?: string;
  notes?: string;
  resumeUrl?: string;
  resumeFileName?: string;
}

export interface CreateInterviewInput {
  applicationId: string;
  date: string;
  time: string;
  type: string;
  format?: "MEET" | "ZOOM" | "TEAMS" | "OFFICE";
  linkOrLocation?: string;
  interviewer: string;
  round?: number;
  scorecard?: InterviewScorecard;
  notes?: string;
}

export interface UpdateInterviewInput {
  date?: string;
  time?: string;
  type?: string;
  format?: "MEET" | "ZOOM" | "TEAMS" | "OFFICE";
  linkOrLocation?: string;
  interviewer?: string;
  round?: number;
  scorecard?: InterviewScorecard;
  notes?: string;
}

export interface CreateApplicationInput {
  jobId: string;
  candidateId?: string;
  candidateName?: string;
  candidateEmail?: string;
  candidatePhone?: string;
  notes?: string;
  resume?: File;
}

