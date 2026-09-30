import type { Application } from "./applications";

export const Gender = {
  MALE: "MALE",
  FEMALE: "FEMALE",
  OTHER: "OTHER",
} as const;
export type Gender = (typeof Gender)[keyof typeof Gender];

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
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  applicationsCount?: number;
  applications?: Application[];
  allDocuments?: CandidateDocument[];
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
