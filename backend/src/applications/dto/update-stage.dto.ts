import { Type } from "class-transformer";
import { IsEnum, IsNotEmpty, IsNumber, IsOptional } from "class-validator";

export enum ApplicationStage {
  APPLIED = "APPLIED",
  SCREENING = "SCREENING",
  INTERVIEW = "INTERVIEW",
  OFFER = "OFFER",
  HIRED = "HIRED",
  REJECTED = "REJECTED",
}

export class UpdateStageDto {
  @IsEnum(ApplicationStage)
  @IsNotEmpty()
  stage: ApplicationStage;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  orderIndex?: number;
}
