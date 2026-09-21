export const Role = {
  ADMIN: "ADMIN",
  MEMBER: "MEMBER",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

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

export const Gender = {
  MALE: "MALE",
  FEMALE: "FEMALE",
  OTHER: "OTHER",
} as const;
export type Gender = (typeof Gender)[keyof typeof Gender];

export const InviteStatus = {
  ACTIVE: "ACTIVE",
  EXPIRED: "EXPIRED",
  REVOKED: "REVOKED",
} as const;
export type InviteStatus = (typeof InviteStatus)[keyof typeof InviteStatus];

export const ApplicationStage = {
  APPLIED: "APPLIED",
  SCREENING: "SCREENING",
  INTERVIEW: "INTERVIEW",
  OFFER: "OFFER",
  HIRED: "HIRED",
  REJECTED: "REJECTED",
} as const;
export type ApplicationStage = (typeof ApplicationStage)[keyof typeof ApplicationStage];

export const APPLICATION_STAGES = [
  ApplicationStage.APPLIED,
  ApplicationStage.SCREENING,
  ApplicationStage.INTERVIEW,
  ApplicationStage.OFFER,
  ApplicationStage.HIRED,
  ApplicationStage.REJECTED,
] as const;

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
  role: Role;
  expiresInDays: number | null;
  expiresAt: string | null;
  maxUses: number | null;
  usesCount: number;
  createdById: string;
  createdByName: string;
  status: InviteStatus;
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
  experienceLevel?: ExperienceLevel | null;
  workplace?: WorkplaceType | null;
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
  type?: string | null;
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
  gender?: Gender | null;
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

export const INTERVIEW_TYPES = [
  "HR_SCREENING",
  "TECHNICAL",
  "CULTURE_FIT",
  "FINAL_ROUND",
  "ASSESSMENT",
] as const;

export type InterviewType = (typeof INTERVIEW_TYPES)[number];

export const INTERVIEW_FORMATS = ["MEET", "ZOOM", "TEAMS", "OFFICE"] as const;

export type InterviewFormat = (typeof INTERVIEW_FORMATS)[number];

export interface Interview {
  id: string;
  applicationId: string;
  date: string;
  time: string;
  type: InterviewType;
  format: InterviewFormat;
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
  job?: Pick<Job, "id" | "title" | "department" | "location" | "status" | "type">;
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

export interface CreateCandidateInput {
  name: string;
  firstName?: string;
  lastName?: string;
  gender?: Gender;
  dateOfBirth?: string;
  email: string;
  phone?: string;
  notes?: string;
  resumeUrl?: string;
  resumeFileName?: string;
  resumeFile?: unknown;
  organizationId?: string;
}

export interface UpdateCandidateInput {
  name?: string;
  firstName?: string;
  lastName?: string;
  gender?: Gender;
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
  type: InterviewType;
  format?: InterviewFormat;
  linkOrLocation?: string;
  interviewer: string;
  round?: number;
  scorecard?: InterviewScorecard;
  notes?: string;
}

export interface UpdateInterviewInput {
  date?: string;
  time?: string;
  type?: InterviewType;
  format?: InterviewFormat;
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
  resumeUrl?: string;
  resumeFileName?: string;
  resumeFile?: unknown;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
