import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  Validate,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from "class-validator";
import {
  isValidIanaTimezone,
  SUPPORTED_CURRENCIES,
  SUPPORTED_DATE_FORMATS,
  SUPPORTED_NAME_DISPLAY_ORDERS,
  SUPPORTED_ORG_LANGUAGES,
  SUPPORTED_TIME_FORMATS,
  type CurrencyCode,
  type DateFormat,
  type NameDisplayOrder,
  type OrgLanguage,
  type TimeFormat,
} from "@haihire/shared";

@ValidatorConstraint({ name: "isIanaTimezone", async: false })
export class IsIanaTimezoneConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === "string" && isValidIanaTimezone(value);
  }

  defaultMessage(): string {
    return "Timezone must be a valid IANA timezone identifier (e.g. Asia/Ho_Chi_Minh)";
  }
}

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

  @IsOptional()
  @IsIn(SUPPORTED_ORG_LANGUAGES, {
    message: "Default language must be one of: vi, en",
  })
  defaultLanguage?: OrgLanguage;

  @IsOptional()
  @IsString()
  @Validate(IsIanaTimezoneConstraint)
  timezone?: string;

  @IsOptional()
  @IsIn(SUPPORTED_DATE_FORMATS, {
    message: "Date format must be one of: DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD",
  })
  dateFormat?: DateFormat;

  @IsOptional()
  @IsIn(SUPPORTED_TIME_FORMATS, {
    message: "Time format must be one of: 24H, 12H",
  })
  timeFormat?: TimeFormat;

  @IsOptional()
  @IsIn(SUPPORTED_NAME_DISPLAY_ORDERS, {
    message: "Name display order must be one of: FIRST_LAST, LAST_FIRST",
  })
  nameDisplayOrder?: NameDisplayOrder;

  @IsOptional()
  @IsIn(SUPPORTED_CURRENCIES, {
    message: "Default currency must be one of: VND, USD, EUR, SGD, JPY",
  })
  defaultCurrency?: CurrencyCode;
}
