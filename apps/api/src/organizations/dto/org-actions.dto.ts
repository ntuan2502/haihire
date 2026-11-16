import { Transform } from "class-transformer";
import { IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { ROLE_LIST, Role } from "@haihire/shared";

const VALID_ROLE_MESSAGE = `Role must be one of: ${ROLE_LIST.join(", ")}`;

export class SwitchOrgDto {
  @IsString()
  @IsNotEmpty({ message: "Organization ID is required" })
  organizationId!: string;
}

export class UpdateMemberRoleDto {
  @IsIn(ROLE_LIST, {
    message: VALID_ROLE_MESSAGE,
  })
  @IsNotEmpty({ message: "Role is required" })
  role!: Role;
}

export class CreateInviteLinkDto {
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @IsIn(ROLE_LIST, {
    message: VALID_ROLE_MESSAGE,
  })
  role?: Role;

  @IsOptional()
  @IsString()
  expiresIn?: string;

  @IsOptional()
  @IsString()
  maxUses?: string;
}
