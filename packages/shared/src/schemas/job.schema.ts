import { z } from "zod";
import { JobType, JobStatus, WorkplaceType, ExperienceLevel } from "../jobs";

export const createJobSchema = z.object({
  title: z.string().min(1, "Job title is required"),
  department: z.string().min(1, "Department is required"),
  location: z.string().min(1, "Location is required"),
  postalCode: z.string().optional(),
  experienceLevel: z.nativeEnum(ExperienceLevel).optional(),
  workplace: z.nativeEnum(WorkplaceType).optional(),
  type: z.nativeEnum(JobType).optional(),
  description: z.string().min(1, "Job description is required"),
  requirements: z.string().optional(),
  salaryRange: z.string().optional(),
  status: z.nativeEnum(JobStatus).optional(),
  organizationId: z.string().nullable().optional(),
  createdById: z.string().nullable().optional(),
});

export type CreateJobSchema = z.infer<typeof createJobSchema>;

export const updateJobSchema = createJobSchema.partial();
export type UpdateJobSchema = z.infer<typeof updateJobSchema>;
