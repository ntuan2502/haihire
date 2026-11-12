import { IsBoolean, IsOptional, IsString } from "class-validator";

export class UpdateEmailFlowDto {
  @IsString()
  @IsOptional()
  templateId?: string | null;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}
