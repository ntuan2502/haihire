import { z } from "zod";
import { ApplicationStage } from "../applications";

export const createApplicationSchema = z.object({
  jobId: z.string().min(1, "Job ID is required"),
  candidateId: z.string().optional(),
  name: z.string().min(1, "Candidate name is required"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  stage: z.nativeEnum(ApplicationStage).optional(),
  notes: z.string().optional(),
  trackingToken: z.string().optional(),
});

export type CreateApplicationSchema = z.infer<typeof createApplicationSchema>;
