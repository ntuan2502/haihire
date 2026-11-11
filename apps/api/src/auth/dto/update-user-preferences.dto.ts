import { IsIn, IsOptional, IsString, Validate } from "class-validator";
import { SUPPORTED_ORG_LANGUAGES, type OrgLanguage } from "@haihire/shared";
import { IsIanaTimezoneConstraint } from "../../organizations/dto/update-org.dto";

export class UpdateUserPreferencesDto {
  @IsOptional()
  @IsIn(SUPPORTED_ORG_LANGUAGES, {
    message: "Preferred language must be one of: vi, en",
  })
  preferredLanguage?: OrgLanguage | null;

  @IsOptional()
  @IsString()
  @Validate(IsIanaTimezoneConstraint)
  preferredTimezone?: string | null;
}
