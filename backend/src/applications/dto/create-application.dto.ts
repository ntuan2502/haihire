import { IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateApplicationDto {
  @IsString()
  @IsNotEmpty()
  jobId: string;

  @IsString()
  @IsOptional()
  candidateId?: string;

  @IsString()
  @IsOptional()
  candidateName?: string;

  @IsEmail()
  @IsOptional()
  candidateEmail?: string;

  @IsString()
  @IsOptional()
  candidatePhone?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  resumeUrl?: string;

  @IsString()
  @IsOptional()
  resumeFileName?: string;

  @IsString()
  @IsOptional()
  ref?: string;

  @IsString()
  @IsOptional()
  referrer?: string;

  @IsString()
  @IsOptional()
  sourceChannel?: string;

  @IsString()
  @IsOptional()
  utmCampaign?: string;
}
