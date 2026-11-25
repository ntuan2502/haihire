import { IsIn, IsInt, IsOptional, Max, Min } from "class-validator";
import { Type } from "class-transformer";

export class SecurityLogsQueryDto {
  @IsOptional()
  @IsIn(["all", "login", "security"])
  category?: "all" | "login" | "security";

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
