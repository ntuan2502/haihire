import { Type } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { ApplicationStage } from "@haihire/shared";

export { ApplicationStage };

export class UpdateStageDto {
  @IsEnum(ApplicationStage)
  @IsNotEmpty()
  stage: ApplicationStage;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  orderIndex?: number;

  @IsString()
  @MaxLength(1000)
  @IsOptional()
  rejectionReason?: string;

  @IsBoolean()
  @IsOptional()
  sendRejectionEmail?: boolean;

  @IsBoolean()
  @IsOptional()
  sendOfferEmail?: boolean;

  @IsString()
  @IsOptional()
  emailTemplateId?: string;
}
