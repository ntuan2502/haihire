import { IsEnum, IsOptional, IsString } from "class-validator";
import { JobStatus, JobType } from "./create-job.dto";

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

  @IsEnum(JobStatus)
  @IsOptional()
  status?: JobStatus;
}
