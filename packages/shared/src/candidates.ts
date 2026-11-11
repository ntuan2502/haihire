import type { Application } from "./applications";

export function inferCandidateName(
  name?: string | null,
  firstName?: string | null,
  lastName?: string | null,
): { firstName: string; lastName: string } {
  const first = firstName?.trim() || "";
  const last = lastName?.trim() || "";
  if (first || last) return { firstName: first, lastName: last };
  const parts = name?.trim().split(/\s+/) || [];
  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" "),
  };
}

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

export interface CandidateLatestNoteSummary {
  id: string;
  content: string;
  authorName: string;
  createdAt: string;
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
  candidateNotes?: CandidateNote[];
  latestNote?: CandidateLatestNoteSummary | null;
  notesCount?: number;
}

export interface CandidateNote {
  id: string;
  organizationId: string;
  candidateId: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  content: string;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCandidateInput {
  name: string;
  firstName?: string;
  lastName?: string;
  gender?: Gender;
  dateOfBirth?: string;
  email: string;
  phone?: string;
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
  resumeUrl?: string;
  resumeFileName?: string;
}
