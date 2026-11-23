import { z } from "zod";
import { Gender } from "../candidates";

export const createCandidateSchema = z.object({
  organizationId: z.string().optional(),
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  displayName: z.string().trim().nullable().optional(),
  gender: z.nativeEnum(Gender).optional(),
  dateOfBirth: z.string().optional(),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  resumeUrl: z.string().optional(),
  resumeFileName: z.string().optional(),
});

export type CreateCandidateSchema = z.infer<typeof createCandidateSchema>;

export const updateCandidateSchema = createCandidateSchema.partial();
export type UpdateCandidateSchema = z.infer<typeof updateCandidateSchema>;

/**
 * Normalize a phone string to canonical digits for duplicate comparison.
 * Strips non-digit characters, rejects strings with fewer than 7 digits,
 * and converts Vietnamese country prefix (+84 / 84) into local leading "0".
 */
export function normalizeCandidatePhone(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = phone.trim().replace(/\D/g, "");
  if (digits.length < 7) return null;
  if (
    digits.startsWith("84") &&
    (digits.length === 10 || digits.length === 11)
  ) {
    return `0${digits.slice(2)}`;
  }
  return digits;
}

export const checkCandidateDuplicateSchema = z.object({
  email: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
  dateOfBirth: z.string().trim().optional(),
  excludeId: z.string().uuid().optional(),
});
export type CheckCandidateDuplicateSchema = z.infer<
  typeof checkCandidateDuplicateSchema
>;

export type CandidateDuplicateReason = "EMAIL" | "PHONE" | "NAME_DOB";
export type CandidateDuplicateSeverity = "BLOCKING" | "WARNING";

export interface CandidateDuplicateMatch {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  dateOfBirth: string | null;
  matchReasons: CandidateDuplicateReason[];
  severity: CandidateDuplicateSeverity;
}

export interface CandidateDuplicateCheckResult {
  hasBlockingDuplicate: boolean;
  hasWarningDuplicate: boolean;
  matches: CandidateDuplicateMatch[];
}
