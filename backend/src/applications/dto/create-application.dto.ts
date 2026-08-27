import { Type } from "class-transformer";
import { IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateApplicationDto {
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  jobId: number;

  @IsString()
  @IsNotEmpty()
  candidateName: string;

  @IsEmail()
  @IsNotEmpty()
  candidateEmail: string;

  @IsString()
  @IsOptional()
  candidatePhone?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
