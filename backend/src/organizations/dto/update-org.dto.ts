import { IsOptional, IsString, Matches, MinLength } from "class-validator";

export class UpdateOrgDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: "Organization name must be at least 2 characters" })
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(2, { message: "Slug must be at least 2 characters" })
  @Matches(/^[a-z0-9-]+$/, {
    message: "Slug must contain only lowercase letters, numbers, and hyphens",
  })
  slug?: string;
}
