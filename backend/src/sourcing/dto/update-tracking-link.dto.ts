import { IsBoolean, IsOptional, IsString } from "class-validator";

export class UpdateTrackingLinkDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
