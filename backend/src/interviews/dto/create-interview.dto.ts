import { IsNotEmpty, IsOptional, IsString, IsNumber, IsIn } from "class-validator";
import { INTERVIEW_TYPES, type InterviewType } from "../constants";

export class CreateInterviewDto {
  @IsString()
  @IsNotEmpty()
  applicationId!: string;

  @IsString()
  @IsNotEmpty()
  date!: string;

  @IsString()
  @IsNotEmpty()
  time!: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(INTERVIEW_TYPES)
  type!: InterviewType | string;

  @IsString()
  @IsOptional()
  @IsIn(["MEET", "ZOOM", "TEAMS", "OFFICE"])
  format?: string;

  @IsString()
  @IsOptional()
  linkOrLocation?: string;

  @IsString()
  @IsNotEmpty()
  interviewer!: string;

  @IsNumber()
  @IsOptional()
  round?: number;

  @IsOptional()
  scorecard?: any;

  @IsString()
  @IsOptional()
  notes?: string;
}
