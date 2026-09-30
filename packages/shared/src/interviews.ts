import type { Application } from "./applications";

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
  scheduledAt?: string;
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

export interface CreateInterviewInput {
  applicationId: string;
  scheduledAt?: string;
  date?: string;
  time?: string;
  type: InterviewType;
  format?: InterviewFormat;
  linkOrLocation?: string;
  interviewer: string;
  round?: number;
  scorecard?: InterviewScorecard;
  notes?: string;
}

export interface UpdateInterviewInput {
  scheduledAt?: string;
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
