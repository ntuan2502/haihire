import { Type } from "class-transformer";
import { IsEnum, IsNotEmpty, IsNumber, IsOptional } from "class-validator";
import { ApplicationStage } from "@ats/types";

export { ApplicationStage };

export class UpdateStageDto {
  @IsEnum(ApplicationStage)
  @IsNotEmpty()
  stage: ApplicationStage;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  orderIndex?: number;
}
