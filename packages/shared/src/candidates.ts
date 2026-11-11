import type { Application } from "./applications";
import type { NameDisplayOrder } from "./organizations";

export function formatCandidateDisplayName(
  candidate:
    | {
        displayName?: string | null;
        firstName?: string | null;
        lastName?: string | null;
        name?: string | null;
        candidateName?: string | null;
      }
    | null
    | undefined,
  order: NameDisplayOrder = "FIRST_LAST",
): string {
  if (!candidate) return "";
  const custom = candidate.displayName?.trim();
  if (custom) return custom;

  const first = candidate.firstName?.trim() || "";
  const last = candidate.lastName?.trim() || "";
  if (first || last) {
    const parts = order === "LAST_FIRST" ? [last, first] : [first, last];
    return parts.filter(Boolean).join(" ").trim();
  }
  return (candidate.candidateName || candidate.name || "").trim();
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
  displayName?: string | null;
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
  firstName: string;
  lastName: string;
  displayName?: string | null;
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
  firstName?: string;
  lastName?: string;
  displayName?: string | null;
  gender?: Gender;
  dateOfBirth?: string;
  email?: string;
  phone?: string;
  resumeUrl?: string;
  resumeFileName?: string;
}
