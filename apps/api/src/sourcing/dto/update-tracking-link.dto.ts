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
  customSource?: string | null;

  @IsString()
  @IsOptional()
  jobId?: string | null;

  @IsString()
  @IsOptional()
  utmSource?: string | null;

  @IsString()
  @IsOptional()
  utmMedium?: string | null;

  @IsString()
  @IsOptional()
  utmCampaign?: string | null;

  @IsString()
  @IsOptional()
  utmTerm?: string | null;

  @IsString()
  @IsOptional()
  utmContent?: string | null;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
