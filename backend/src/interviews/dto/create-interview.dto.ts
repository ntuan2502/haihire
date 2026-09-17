import { IsNotEmpty, IsOptional, IsString, IsNumber, IsIn } from "class-validator";

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
  type!: string;

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
