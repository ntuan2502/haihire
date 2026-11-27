import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from "class-validator";

import {
  JobType,
  JobStatus,
  WorkplaceType,
  ExperienceLevel,
  type JobApplicationFormConfig,
  type JobScoringConfig,
} from "@haihire/shared";

export { JobType, JobStatus, WorkplaceType, ExperienceLevel };

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export class CreateJobDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  department: string;

  @IsString()
  @IsNotEmpty()
  location: string;

  @IsString()
  @IsOptional()
  postalCode?: string | null;

  @IsEnum(ExperienceLevel)
  @IsOptional()
  experienceLevel?: ExperienceLevel | null;

  @IsEnum(WorkplaceType)
  @IsOptional()
  workplace?: WorkplaceType | null;

  @IsEnum(JobType)
  @IsOptional()
  type?: JobType;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsString()
  @Matches(DATE_ONLY_REGEX, {
    message: "applicationDeadline must be formatted as YYYY-MM-DD",
  })
  applicationDeadline?: string | null;

  @IsOptional()
  @IsString()
  @Matches(DATE_ONLY_REGEX, {
    message: "startDate must be formatted as YYYY-MM-DD",
  })
  startDate?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  openings?: number;

  @IsString()
  @IsOptional()
  salaryRange?: string | null;

  @IsInt()
  @Min(0)
  @IsOptional()
  salaryMin?: number | null;

  @IsInt()
  @Min(0)
  @IsOptional()
  salaryMax?: number | null;

  @IsString()
  @MaxLength(10)
  @IsOptional()
  salaryCurrency?: string | null;

  @IsEnum(JobStatus)
  @IsOptional()
  status?: JobStatus;

  @IsObject()
  @IsOptional()
  applicationFormConfig?: JobApplicationFormConfig | null;

  @IsObject()
  @IsOptional()
  scoringConfig?: JobScoringConfig | null;

  @IsOptional()
  organizationId?: string | null;

  @IsOptional()
  createdById?: string | null;
}
