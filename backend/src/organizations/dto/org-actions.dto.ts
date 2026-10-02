import { IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class SwitchOrgDto {
  @IsString()
  @IsNotEmpty({ message: "Organization ID is required" })
  organizationId!: string;
}

export class UpdateMemberRoleDto {
  @IsIn(["ADMIN", "MEMBER"], { message: "Role must be ADMIN or MEMBER" })
  @IsNotEmpty({ message: "Role is required" })
  role!: "ADMIN" | "MEMBER";
}

export class CreateInviteLinkDto {
  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  expiresIn?: string;

  @IsOptional()
  @IsString()
  maxUses?: string;
}
