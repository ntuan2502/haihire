import type { Candidate } from "./candidates";
import type { Job } from "./jobs";
import type { Interview } from "./interviews";

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

export const VALID_APPLICATION_STAGE_TRANSITIONS: Record<ApplicationStage, readonly ApplicationStage[]> = {
  [ApplicationStage.APPLIED]: [ApplicationStage.SCREENING, ApplicationStage.INTERVIEW, ApplicationStage.REJECTED],
  [ApplicationStage.SCREENING]: [ApplicationStage.INTERVIEW, ApplicationStage.REJECTED],
  [ApplicationStage.INTERVIEW]: [ApplicationStage.OFFER, ApplicationStage.REJECTED],
  [ApplicationStage.OFFER]: [ApplicationStage.HIRED, ApplicationStage.REJECTED],
  [ApplicationStage.HIRED]: [],
  [ApplicationStage.REJECTED]: [],
};

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
