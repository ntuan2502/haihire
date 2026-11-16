import {
  IsISO8601,
  IsOptional,
  IsString,
  IsNumber,
  IsIn,
} from "class-validator";
import {
  INTERVIEW_TYPES,
  type InterviewType,
  INTERVIEW_FORMATS,
  type InterviewFormat,
} from "../constants";

export class UpdateInterviewDto {
  @IsISO8601()
  @IsOptional()
  scheduledAt?: string;

  @IsString()
  @IsOptional()
  @IsIn(INTERVIEW_TYPES)
  type?: InterviewType;

  @IsString()
  @IsOptional()
  @IsIn(INTERVIEW_FORMATS)
  format?: InterviewFormat;

  @IsString()
  @IsOptional()
  linkOrLocation?: string;

  @IsString()
  @IsOptional()
  interviewer?: string;

  @IsNumber()
  @IsOptional()
  round?: number;

  @IsOptional()
  scorecard?: Record<string, unknown> | string;

  @IsString()
  @IsOptional()
  notes?: string;
}
