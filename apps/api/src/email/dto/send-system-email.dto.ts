import { IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class SendSystemEmailDto {
  @IsEmail()
  @IsNotEmpty()
  to: string;

  @IsString()
  @IsOptional()
  recipientName?: string;

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
  organizationId?: string | null;

  @IsOptional()
  variables?: Record<string, string>;

  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class SendSystemTestEmailDto {
  @IsEmail()
  @IsNotEmpty()
  to: string;
}
