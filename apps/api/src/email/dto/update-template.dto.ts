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
  @IsOptional()
  subject?: string;

  @IsString()
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
