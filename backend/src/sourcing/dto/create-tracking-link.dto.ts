import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { SourcingChannel } from "@haihire/shared";

export class CreateTrackingLinkDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(SourcingChannel)
  @IsNotEmpty()
  source: SourcingChannel;

  @IsString()
  @IsOptional()
  customSource?: string;

  @IsString()
  @IsOptional()
  jobId?: string;

  @IsString()
  @IsOptional()
  campaign?: string;

  @IsString()
  @IsOptional()
  medium?: string;
}
