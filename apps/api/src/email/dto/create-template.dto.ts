import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from "class-validator";
import { EmailTemplateType } from "@prisma/client";

export class CreateEmailTemplateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(EmailTemplateType)
  @IsOptional()
  type?: EmailTemplateType;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  body: string;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}
