import { IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class SendEmailDto {
  @IsEmail()
  @IsNotEmpty()
  to: string;

  @IsString()
  @IsNotEmpty()
  recipientName: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  body: string;

  @IsString()
  @IsOptional()
  templateType?: string;

  @IsString()
  @IsOptional()
  candidateId?: string;

  @IsString()
  @IsOptional()
  applicationId?: string;

  @IsOptional()
  variables?: Record<string, string>;
}

export class SendTestEmailDto {
  @IsEmail()
  @IsNotEmpty()
  to: string;
}
