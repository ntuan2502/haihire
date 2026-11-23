import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from "class-validator";
import { EmailTemplateType } from "@prisma/client";

export class UpdateEmailTemplateDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @IsEnum(EmailTemplateType)
  @IsOptional()
  type?: EmailTemplateType;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  body?: string;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}

export class DuplicateEmailTemplateDto {
  @IsString()
  @IsOptional()
  name?: string;
}
