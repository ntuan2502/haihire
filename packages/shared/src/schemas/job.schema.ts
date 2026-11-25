import { z } from "zod";
import { ApplicationStage } from "../applications";
import { jobApplicationFormConfigSchema } from "../application-form";
import {
  JobType,
  JobStatus,
  WorkplaceType,
  ExperienceLevel,
  extractPlainTextFromHtml,
} from "../jobs";

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const createJobSchema = z.object({
  title: z.string().min(1, "Job title is required"),
  department: z.string().min(1, "Department is required"),
  location: z.string().min(1, "Location is required"),
  postalCode: z.string().nullable().optional(),
  experienceLevel: z.nativeEnum(ExperienceLevel).nullable().optional(),
  workplace: z.nativeEnum(WorkplaceType).nullable().optional(),
  type: z.nativeEnum(JobType).optional(),
  description: z
    .string()
    .refine(
      (val) => extractPlainTextFromHtml(val).length > 0,
      "Job description is required",
    ),
  applicationDeadline: z
    .string()
    .regex(DATE_ONLY_REGEX, "Application deadline must be YYYY-MM-DD")
    .nullable()
    .optional(),
  startDate: z
    .string()
    .regex(DATE_ONLY_REGEX, "Start date must be YYYY-MM-DD")
    .nullable()
    .optional(),
  openings: z.number().int().min(1).max(10000).optional(),
  salaryRange: z.string().nullable().optional(),
  salaryMin: z.number().int().min(0).nullable().optional(),
  salaryMax: z.number().int().min(0).nullable().optional(),
  salaryCurrency: z.string().trim().max(10).nullable().optional(),
  status: z.nativeEnum(JobStatus).optional(),
  applicationFormConfig: jobApplicationFormConfigSchema.nullable().optional(),
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
