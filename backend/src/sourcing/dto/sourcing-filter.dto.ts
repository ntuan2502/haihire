import { IsEnum, IsOptional, IsString } from "class-validator";
import { SourcingChannel } from "@haihire/shared";

export class SourcingFilterDto {
  @IsString()
  @IsOptional()
  timeRange?: "7d" | "30d" | "90d" | "all";

  @IsString()
  @IsOptional()
  jobId?: string;

  @IsEnum(SourcingChannel)
  @IsOptional()
  source?: SourcingChannel;

  @IsString()
  @IsOptional()
  page?: string;

  @IsString()
  @IsOptional()
  limit?: string;

  @IsString()
  @IsOptional()
  search?: string;
}
