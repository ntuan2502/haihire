import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";

export enum JobType {
  FULL_TIME = "FULL_TIME",
  PART_TIME = "PART_TIME",
  CONTRACT = "CONTRACT",
  INTERNSHIP = "INTERNSHIP",
  REMOTE = "REMOTE",
}

export enum JobStatus {
  DRAFT = "DRAFT",
  PUBLISHED = "PUBLISHED",
  CLOSED = "CLOSED",
  ARCHIVED = "ARCHIVED",
}

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

  @IsEnum(JobStatus)
  @IsOptional()
  status?: JobStatus;
}
