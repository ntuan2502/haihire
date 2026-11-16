import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from "class-validator";

export class PublicApplyDto {
  @IsUUID()
  @IsNotEmpty()
  jobId: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

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
  trackingToken?: string;

  @IsString()
  @IsOptional()
  ref?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
