import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";
import {
  JobStatus,
  JobType,
  WorkplaceType,
  ExperienceLevel,
} from "./create-job.dto";

export class UpdateJobDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  department?: string;

  @IsString()
  @IsOptional()
  location?: string;

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
  @IsOptional()
  description?: string;

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
}
