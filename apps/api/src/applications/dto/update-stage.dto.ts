import { Type } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from "class-validator";
import { ApplicationStage } from "@haihire/shared";

export { ApplicationStage };

export class UpdateStageDto {
  @ValidateIf((o: UpdateStageDto) => !o.stageId)
  @IsEnum(ApplicationStage)
  @IsNotEmpty()
  stage?: ApplicationStage;

  @IsUUID()
  @IsOptional()
  stageId?: string;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  orderIndex?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  version?: number;

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
