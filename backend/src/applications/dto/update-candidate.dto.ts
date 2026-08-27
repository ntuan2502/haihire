import { IsEmail, IsOptional, IsString } from "class-validator";

export class UpdateCandidateDto {
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
}
