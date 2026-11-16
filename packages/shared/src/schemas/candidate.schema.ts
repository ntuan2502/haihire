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
