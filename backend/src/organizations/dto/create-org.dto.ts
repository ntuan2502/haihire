import { IsNotEmpty, IsString, Matches, MinLength } from "class-validator";

export class CreateOrgDto {
  @IsString()
  @IsNotEmpty({ message: "Organization name is required" })
  name!: string;

  @IsString()
  @IsNotEmpty({ message: "Slug is required" })
  @MinLength(2, { message: "Slug must be at least 2 characters" })
  @Matches(/^[a-z0-9-]+$/, {
    message: "Slug must contain only lowercase letters, numbers, and hyphens",
  })
  slug!: string;
}
