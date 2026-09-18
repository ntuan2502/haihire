import { IsBoolean, IsInt, IsOptional, IsString } from "class-validator";

export class UpdateEmailSettingDto {
  @IsString()
  @IsOptional()
  provider?: string;

  @IsString()
  @IsOptional()
  fromName?: string;

  @IsString()
  @IsOptional()
  fromEmail?: string;

  @IsString()
  @IsOptional()
  smtpHost?: string;

  @IsInt()
  @IsOptional()
  smtpPort?: number;

  @IsString()
  @IsOptional()
  smtpUser?: string;

  @IsString()
  @IsOptional()
  smtpPass?: string;

  @IsBoolean()
  @IsOptional()
  smtpSecure?: boolean;

  @IsString()
  @IsOptional()
  resendApiKey?: string;

  @IsString()
  @IsOptional()
  sendgridApiKey?: string;
}
