import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

import {
  JobType,
  JobStatus,
  WorkplaceType,
  ExperienceLevel,
} from "@haihire/shared";

export { JobType, JobStatus, WorkplaceType, ExperienceLevel };

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
  postalCode?: string;

  @IsEnum(ExperienceLevel)
  @IsOptional()
  experienceLevel?: ExperienceLevel;

  @IsEnum(WorkplaceType)
  @IsOptional()
  workplace?: WorkplaceType;

  @IsEnum(JobType)
  @IsOptional()
  type?: JobType;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsOptional()
  requirements?: string;

  @IsString()
  @IsOptional()
  salaryRange?: string;

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

  @IsOptional()
  organizationId?: string | null;

  @IsOptional()
  createdById?: string | null;
}
