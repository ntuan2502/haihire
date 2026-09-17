import { IsOptional, IsString, IsNumber, IsIn } from "class-validator";
import { INTERVIEW_TYPES, type InterviewType } from "../constants";

export class UpdateInterviewDto {
  @IsString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  time?: string;

  @IsString()
  @IsOptional()
  @IsIn(INTERVIEW_TYPES)
  type?: InterviewType | string;

  @IsString()
  @IsOptional()
  @IsIn(["MEET", "ZOOM", "TEAMS", "OFFICE"])
  format?: string;

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
  scorecard?: any;

  @IsString()
  @IsOptional()
  notes?: string;
}
