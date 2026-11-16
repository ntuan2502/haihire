import { z } from "zod";
import { ApplicationStage } from "../applications";
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

export const pipelineStageInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Stage name is required").max(100),
  category: z.nativeEnum(ApplicationStage),
  orderIndex: z.number().int().min(0),
  color: z.string().trim().max(50).nullable().optional(),
  isTerminal: z.boolean().optional(),
});

export const upsertPipelineStagesSchema = z.object({
  stages: z
    .array(pipelineStageInputSchema)
    .min(1, "At least one pipeline stage is required"),
});

export type PipelineStageInputSchema = z.infer<typeof pipelineStageInputSchema>;
export type UpsertPipelineStagesSchema = z.infer<
  typeof upsertPipelineStagesSchema
>;
