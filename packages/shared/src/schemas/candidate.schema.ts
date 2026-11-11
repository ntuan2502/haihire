import { z } from "zod";
import { Gender } from "../candidates";

export const createCandidateSchema = z.object({
  organizationId: z.string().optional(),
  name: z.string().min(1, "Candidate name is required"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
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
