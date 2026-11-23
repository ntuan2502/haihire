import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import {
  JobStatus,
  JobType,
  WorkplaceType,
  ExperienceLevel,
} from "./create-job.dto";

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

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
  experienceLevel?: ExperienceLevel | null;

  @IsEnum(WorkplaceType)
  @IsOptional()
  workplace?: WorkplaceType | null;

  @IsEnum(JobType)
  @IsOptional()
  type?: JobType;

  @IsString()
  @IsOptional()
  description?: string;

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
