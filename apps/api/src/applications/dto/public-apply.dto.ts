import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from "class-validator";
import { COVER_LETTER_MAX_LENGTH } from "@haihire/shared";

export class PublicApplyDto {
  @IsUUID()
  @IsNotEmpty()
  jobId: string;

  @IsUUID()
  @IsOptional()
  candidateId?: string;

  @ValidateIf((o: PublicApplyDto) => !o.candidateId)
  @IsString()
  @IsNotEmpty()
  firstName?: string;

  @ValidateIf((o: PublicApplyDto) => !o.candidateId)
  @IsString()
  @IsNotEmpty()
  lastName?: string;

  @IsString()
  @IsOptional()
  displayName?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsEmail()
  @IsOptional()
  candidateEmail?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  candidatePhone?: string;

  @IsString()
  @IsOptional()
  resumeUrl?: string;

  @IsString()
  @IsOptional()
  resumeFileName?: string;

  @IsString()
  @IsOptional()
  trackingToken?: string;

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
  utmSource?: string;

  @IsString()
  @IsOptional()
  utmMedium?: string;

  @IsString()
  @IsOptional()
  utmCampaign?: string;

  @IsString()
  @IsOptional()
  utmTerm?: string;

  @IsString()
  @IsOptional()
  utmContent?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  @MaxLength(COVER_LETTER_MAX_LENGTH)
  coverLetter?: string;

  @IsString()
  @IsOptional()
  screeningAnswers?: string;
}
