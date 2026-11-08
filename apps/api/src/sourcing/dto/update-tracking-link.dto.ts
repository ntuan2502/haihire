import { IsBoolean, IsEnum, IsOptional, IsString } from "class-validator";
import { SourcingChannel } from "@haihire/shared";

export class UpdateTrackingLinkDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(SourcingChannel)
  @IsOptional()
  source?: SourcingChannel;

  @IsString()
  @IsOptional()
  customSource?: string;

  @IsString()
  @IsOptional()
  jobId?: string | null;

  @IsString()
  @IsOptional()
  utmSource?: string;

  @IsString()
  @IsOptional()
  utmMedium?: string;

  @IsString()
  @IsOptional()
  utmCampaign?: string;

  @IsString()
  @IsOptional()
  utmTerm?: string;

  @IsString()
  @IsOptional()
  utmContent?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
